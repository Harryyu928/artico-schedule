/**
 * 导师推荐服务
 * 基于课程匹配度、工作负载、评价等因素推荐最优导师
 */

import { db } from '@/db';
import { teachers, courses, scheduleResults, timeAvailabilities } from '@/db/schema';
import { eq, and, sql, not } from 'drizzle-orm';

// 导师推荐评分
export interface TeacherRecommendation {
  teacherId: string;
  teacherName: string;
  teacherType: '全职' | '兼职';
  score: number;
  factors: {
    courseMatch: number;      // 课程匹配度
    workload: number;         // 工作负载评分
    availability: number;     // 时间可用性评分
    experience: number;       // 经验评分
    rating: number;           // 评分
  };
  availabilitySlots: number;  // 可用时间槽数量
  currentWorkload: number;    // 当前工作负载
  maxCapacity: number;        // 最大容量
}

// 推荐配置
export interface RecommendationConfig {
  weights?: {
    courseMatch?: number;     // 默认 30
    workload?: number;        // 默认 25
    availability?: number;    // 默认 25
    experience?: number;      // 默认 10
    rating?: number;          // 默认 10
  };
  preferFullTime?: boolean;   // 是否偏好全职导师
  maxWorkloadThreshold?: number; // 最大负载阈值（超过此值不推荐）
}

/**
 * 推荐导师
 */
export async function recommendTeachers(
  courseId: string,
  config: RecommendationConfig = {}
): Promise<TeacherRecommendation[]> {
  const {
    weights = {},
    preferFullTime = false,
    maxWorkloadThreshold = 20,
  } = config;

  // 默认权重
  const w = {
    courseMatch: weights.courseMatch ?? 30,
    workload: weights.workload ?? 25,
    availability: weights.availability ?? 25,
    experience: weights.experience ?? 10,
    rating: weights.rating ?? 10,
  };

  // 获取课程信息
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  if (!course) {
    throw new Error('课程不存在');
  }

  // 获取所有导师（移除状态过滤，因为表没有status字段）
  const allTeachers = await db.select().from(teachers);

  // 获取每个导师的当前工作负载
  const workloadQuery = await db.select({
    teacherId: scheduleResults.teacherId,
    count: sql<number>`count(*)`,
  })
    .from(scheduleResults)
    .where(and(
      not(eq(scheduleResults.status, '取消'))
    ))
    .groupBy(scheduleResults.teacherId);

  const workloadMap = new Map<string, number>();
  workloadQuery.forEach(w => {
    workloadMap.set(w.teacherId, Number(w.count));
  });

  // 计算每个导师的推荐得分
  const recommendations: TeacherRecommendation[] = [];

  for (const teacher of allTeachers) {
    // 检查是否可以教授该课程（使用teachableCourses）
    const canTeach = teacher.teachableCourses && 
      teacher.teachableCourses.includes(course.category);
    
    if (!canTeach) continue;

    // 检查工作负载是否超限
    const currentWorkload = workloadMap.get(teacher.id) || 0;
    const maxCapacity = teacher.maxWeeklyHours || 20;
    
    if (currentWorkload >= maxWorkloadThreshold) continue;

    // 计算各项评分

    // 1. 课程匹配度（能教此课程的基础分 + 教授同类课程的加分）
    let courseMatchScore = 50; // 基础分
    if (teacher.teachableCourses) {
      // 如果能教多门课程，说明经验更丰富
      courseMatchScore += Math.min(50, teacher.teachableCourses.length * 10);
    }

    // 2. 工作负载评分（负载越低分数越高）
    const workloadRatio = currentWorkload / maxCapacity;
    const workloadScore = Math.round((1 - workloadRatio) * 100);

    // 3. 时间可用性评分（全职导师可用性更高）
    const availabilityScore = teacher.teacherType === '全职' ? 80 : 60;

    // 4. 经验评分（基于导师简介）
    let experienceScore = 50;
    if (teacher.bio && teacher.bio.length > 100) {
      experienceScore += 20;
    }

    // 5. 评分（暂时使用默认值）
    const ratingScore = 75;

    // 计算加权总分
    const totalScore = 
      (courseMatchScore * w.courseMatch + 
       workloadScore * w.workload + 
       availabilityScore * w.availability + 
       experienceScore * w.experience + 
       ratingScore * w.rating) / 100;

    // 全职导师加分
    const finalScore = preferFullTime && teacher.teacherType === '全职' 
      ? totalScore + 10 
      : totalScore;

    recommendations.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherType: teacher.teacherType as '全职' | '兼职',
      score: Math.round(finalScore),
      factors: {
        courseMatch: courseMatchScore,
        workload: workloadScore,
        availability: availabilityScore,
        experience: experienceScore,
        rating: ratingScore,
      },
      availabilitySlots: 0, // 需要额外查询
      currentWorkload,
      maxCapacity,
    });
  }

  // 按得分排序
  recommendations.sort((a, b) => b.score - a.score);

  // 取前10个推荐
  return recommendations.slice(0, 10);
}

/**
 * 获取导师的详细可用时间
 */
export async function getTeacherAvailableSlots(
  teacherId: string,
  excludeBooked: boolean = true
): Promise<Array<{
  weekDay: string;
  timeSlot: string;
  isBooked: boolean;
}>> {
  // 获取导师的时间可用性（使用userId字段）
  const availability = await db.select()
    .from(timeAvailabilities)
    .where(eq(timeAvailabilities.userId, teacherId));

  // 获取已预约的时间
  let bookedSlots: Set<string> = new Set();
  
  if (excludeBooked) {
    const booked = await db.select()
      .from(scheduleResults)
      .where(and(
        eq(scheduleResults.teacherId, teacherId),
        not(eq(scheduleResults.status, '取消'))
      ));
    
    bookedSlots = new Set(
      booked.map(b => `${b.weekDay}-${b.timeSlot}`)
    );
  }

  // 构建可用时间列表
  const slots: Array<{
    weekDay: string;
    timeSlot: string;
    isBooked: boolean;
  }> = [];

  availability.forEach(a => {
    const slotKey = `${a.weekDay}-${a.timeSlot}`;
    slots.push({
      weekDay: a.weekDay,
      timeSlot: a.timeSlot,
      isBooked: bookedSlots.has(slotKey),
    });
  });

  return slots;
}

/**
 * 导师工作量分析
 */
export async function analyzeTeacherWorkload(): Promise<Array<{
  teacherId: string;
  teacherName: string;
  teacherType: string;
  currentLoad: number;
  maxCapacity: number;
  utilizationRate: number;
  status: 'idle' | 'normal' | 'busy' | 'overloaded';
}>> {
  // 获取所有导师
  const allTeachers = await db.select().from(teachers);

  // 获取工作负载
  const workloadQuery = await db.select({
    teacherId: scheduleResults.teacherId,
    count: sql<number>`count(*)`,
  })
    .from(scheduleResults)
    .where(not(eq(scheduleResults.status, '取消')))
    .groupBy(scheduleResults.teacherId);

  const workloadMap = new Map<string, number>();
  workloadQuery.forEach(w => {
    workloadMap.set(w.teacherId, Number(w.count));
  });

  // 分析每个导师
  const analysis = allTeachers.map(teacher => {
    const currentLoad = workloadMap.get(teacher.id) || 0;
    const maxCapacity = teacher.maxWeeklyHours || 20;
    const utilizationRate = (currentLoad / maxCapacity) * 100;

    let status: 'idle' | 'normal' | 'busy' | 'overloaded';
    if (utilizationRate < 30) {
      status = 'idle';
    } else if (utilizationRate < 70) {
      status = 'normal';
    } else if (utilizationRate < 90) {
      status = 'busy';
    } else {
      status = 'overloaded';
    }

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherType: teacher.teacherType,
      currentLoad,
      maxCapacity,
      utilizationRate: Math.round(utilizationRate),
      status,
    };
  });

  // 按利用率排序
  analysis.sort((a, b) => a.utilizationRate - b.utilizationRate);

  return analysis;
}

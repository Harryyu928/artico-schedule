/**
 * 智能排课算法服务
 * 基于约束满足问题（CSP）实现排课优化
 * 
 * 核心功能：
 * 1. 时间冲突检测
 * 2. 最优导师匹配
 * 3. 自动排课生成
 * 4. 排课建议推荐
 */

import { db } from '@/db';
import { 
  timeAvailabilities, 
  scheduleResults, 
  teachers, 
  students, 
  courses,
  courseSelectionItems,
  courseSelectionForms,
} from '@/db/schema';
import { eq, and, inArray, not, or } from 'drizzle-orm';

// 时间段定义
export const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'] as const;
export const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

// 排课约束
export interface ScheduleConstraint {
  type: 'hard' | 'soft'; // 硬约束（必须满足）/ 软约束（尽量满足）
  description: string;
  check: (schedule: ScheduleSlot, context: ScheduleContext) => boolean;
  weight?: number; // 软约束权重
}

// 排课槽位
export interface ScheduleSlot {
  teacherId: string;
  studentId: string;
  courseId: string;
  weekDay: typeof WEEK_DAYS[number];
  timeSlot: typeof TIME_SLOTS[number];
  duration: number; // 课程时长（小时）
}

// 排课上下文
export interface ScheduleContext {
  teacherAvailabilities: Map<string, Set<string>>; // teacherId -> available slots
  studentAvailabilities: Map<string, Set<string>>; // studentId -> available slots
  existingSchedules: Map<string, Set<string>>; // teacherId -> booked slots
  studentExistingSchedules: Map<string, Set<string>>; // studentId -> booked slots
  teacherCourses: Map<string, Set<string>>; // teacherId -> courseIds
  teacherWorkload: Map<string, number>; // teacherId -> current workload
  coursePriorities: Map<string, number>; // courseId -> priority
}

// 排课结果
export interface ScheduleResult {
  success: boolean;
  slots: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  suggestions: ScheduleSuggestion[];
  score: number;
}

// 排课冲突
export interface ScheduleConflict {
  type: 'teacher_conflict' | 'student_conflict' | 'availability_conflict';
  message: string;
  slot?: ScheduleSlot;
}

// 排课建议
export interface ScheduleSuggestion {
  type: 'alternative_slot' | 'alternative_teacher' | 'adjust_time';
  message: string;
  suggestion: Partial<ScheduleSlot>;
  score: number;
}

// 排课请求
export interface ScheduleRequest {
  studentId: string;
  courseId: string;
  preferredTeacherId?: string;
  preferredDays?: typeof WEEK_DAYS[number][];
  preferredSlots?: typeof TIME_SLOTS[number][];
  duration?: number;
  priority?: number;
}

/**
 * 智能排课算法类
 */
export class SmartScheduler {
  private context: ScheduleContext;
  private constraints: ScheduleConstraint[] = [];

  constructor(context: ScheduleContext) {
    this.context = context;
    this.initializeConstraints();
  }

  /**
   * 初始化排课约束
   */
  private initializeConstraints(): void {
    this.constraints = [
      // 硬约束：导师时间可用性
      {
        type: 'hard',
        description: '导师在该时间段可用',
        check: (slot, ctx) => {
          const availableSlots = ctx.teacherAvailabilities.get(slot.teacherId);
          const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
          return availableSlots?.has(slotKey) ?? false;
        },
      },
      
      // 硬约束：学生时间可用性
      {
        type: 'hard',
        description: '学生在该时间段可用',
        check: (slot, ctx) => {
          const availableSlots = ctx.studentAvailabilities.get(slot.studentId);
          const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
          return availableSlots?.has(slotKey) ?? false;
        },
      },
      
      // 硬约束：导师无冲突
      {
        type: 'hard',
        description: '导师在该时间段无其他课程',
        check: (slot, ctx) => {
          const bookedSlots = ctx.existingSchedules.get(slot.teacherId);
          const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
          return !bookedSlots?.has(slotKey);
        },
      },
      
      // 硬约束：学生无冲突
      {
        type: 'hard',
        description: '学生在该时间段无其他课程',
        check: (slot, ctx) => {
          const bookedSlots = ctx.studentExistingSchedules.get(slot.studentId);
          const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
          return !bookedSlots?.has(slotKey);
        },
      },
      
      // 软约束：优先选择偏好的星期
      {
        type: 'soft',
        description: '优先选择偏好的星期',
        weight: 10,
        check: (slot, ctx) => true, // 需要外部判断
      },
      
      // 软约束：平衡导师工作负载
      {
        type: 'soft',
        description: '选择工作负载较低的导师',
        weight: 5,
        check: (slot, ctx) => true, // 需要外部判断
      },
    ];
  }

  /**
   * 检查槽位是否满足所有硬约束
   */
  private checkHardConstraints(slot: ScheduleSlot): boolean {
    return this.constraints
      .filter(c => c.type === 'hard')
      .every(c => c.check(slot, this.context));
  }

  /**
   * 计算槽位的软约束得分
   */
  private calculateSoftScore(slot: ScheduleSlot, preferences?: {
    preferredDays?: typeof WEEK_DAYS[number][];
    preferredSlots?: typeof TIME_SLOTS[number][];
  }): number {
    let score = 0;
    
    // 偏好星期加分
    if (preferences?.preferredDays?.includes(slot.weekDay)) {
      score += 10;
    }
    
    // 偏好时间段加分
    if (preferences?.preferredSlots?.includes(slot.timeSlot)) {
      score += 10;
    }
    
    // 导师工作负载平衡加分（负载越低分数越高）
    const workload = this.context.teacherWorkload.get(slot.teacherId) || 0;
    score += Math.max(0, 20 - workload * 2);
    
    return score;
  }

  /**
   * 查找可用槽位
   */
  private findAvailableSlots(
    teacherId: string,
    studentId: string
  ): Array<{ weekDay: typeof WEEK_DAYS[number]; timeSlot: typeof TIME_SLOTS[number] }> {
    const availableSlots: Array<{ weekDay: typeof WEEK_DAYS[number]; timeSlot: typeof TIME_SLOTS[number] }> = [];
    
    for (const weekDay of WEEK_DAYS) {
      for (const timeSlot of TIME_SLOTS) {
        const slot: ScheduleSlot = {
          teacherId,
          studentId,
          courseId: '',
          weekDay,
          timeSlot,
          duration: 2, // 默认2小时
        };
        
        if (this.checkHardConstraints(slot)) {
          availableSlots.push({ weekDay, timeSlot });
        }
      }
    }
    
    return availableSlots;
  }

  /**
   * 智能排课 - 为单个请求生成最优排课方案
   */
  public schedule(request: ScheduleRequest): ScheduleResult {
    const conflicts: ScheduleConflict[] = [];
    const suggestions: ScheduleSuggestion[] = [];
    const validSlots: Array<{ slot: ScheduleSlot; score: number }> = [];

    // 获取可以教授该课程的导师列表
    const eligibleTeachers = this.getEligibleTeachers(request.courseId);
    
    if (eligibleTeachers.length === 0) {
      return {
        success: false,
        slots: [],
        conflicts: [{
          type: 'availability_conflict',
          message: '没有可用的导师可以教授此课程',
        }],
        suggestions: [],
        score: 0,
      };
    }

    // 如果指定了偏好导师，优先检查
    const teachersToCheck = request.preferredTeacherId
      ? [request.preferredTeacherId, ...eligibleTeachers.filter(t => t !== request.preferredTeacherId)]
      : eligibleTeachers;

    // 遍历所有可能的导师和时间槽
    for (const teacherId of teachersToCheck) {
      const availableSlots = this.findAvailableSlots(teacherId, request.studentId);
      
      for (const { weekDay, timeSlot } of availableSlots) {
        const slot: ScheduleSlot = {
          teacherId,
          studentId: request.studentId,
          courseId: request.courseId,
          weekDay,
          timeSlot,
          duration: request.duration || 2,
        };
        
        const score = this.calculateSoftScore(slot, {
          preferredDays: request.preferredDays,
          preferredSlots: request.preferredSlots,
        });
        
        validSlots.push({ slot, score });
      }
    }

    // 如果没有找到有效槽位
    if (validSlots.length === 0) {
      // 生成建议
      suggestions.push(...this.generateSuggestions(request));
      
      return {
        success: false,
        slots: [],
        conflicts: [{
          type: 'availability_conflict',
          message: '没有找到可用的时间槽',
        }],
        suggestions,
        score: 0,
      };
    }

    // 按分数排序，选择最优方案
    validSlots.sort((a, b) => b.score - a.score);
    const bestSlot = validSlots[0].slot;

    return {
      success: true,
      slots: [bestSlot],
      conflicts,
      suggestions: validSlots.slice(1, 4).map(s => ({
        type: 'alternative_slot' as const,
        message: `备选方案: ${s.slot.weekDay} ${s.slot.timeSlot}`,
        suggestion: s.slot,
        score: s.score,
      })),
      score: validSlots[0].score,
    };
  }

  /**
   * 批量排课 - 为多个请求生成排课方案
   */
  public batchSchedule(requests: ScheduleRequest[]): {
    results: Map<string, ScheduleResult>;
    totalSuccess: number;
    totalFailed: number;
  } {
    const results = new Map<string, ScheduleResult>();
    let totalSuccess = 0;
    let totalFailed = 0;

    // 按优先级排序请求
    const sortedRequests = [...requests].sort((a, b) => 
      (b.priority || 5) - (a.priority || 5)
    );

    for (const request of sortedRequests) {
      const result = this.schedule(request);
      results.set(`${request.studentId}-${request.courseId}`, result);
      
      if (result.success) {
        totalSuccess++;
        // 更新上下文中的已预约信息
        const slot = result.slots[0];
        const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
        
        if (!this.context.existingSchedules.has(slot.teacherId)) {
          this.context.existingSchedules.set(slot.teacherId, new Set());
        }
        this.context.existingSchedules.get(slot.teacherId)!.add(slotKey);
        
        if (!this.context.studentExistingSchedules.has(slot.studentId)) {
          this.context.studentExistingSchedules.set(slot.studentId, new Set());
        }
        this.context.studentExistingSchedules.get(slot.studentId)!.add(slotKey);
        
        // 更新工作负载
        const currentWorkload = this.context.teacherWorkload.get(slot.teacherId) || 0;
        this.context.teacherWorkload.set(slot.teacherId, currentWorkload + 1);
      } else {
        totalFailed++;
      }
    }

    return { results, totalSuccess, totalFailed };
  }

  /**
   * 获取可以教授某课程的导师列表
   */
  private getEligibleTeachers(courseId: string): string[] {
    const eligibleTeachers: string[] = [];
    
    this.context.teacherCourses.forEach((courses, teacherId) => {
      if (courses.has(courseId)) {
        eligibleTeachers.push(teacherId);
      }
    });
    
    return eligibleTeachers;
  }

  /**
   * 生成排课建议
   */
  private generateSuggestions(request: ScheduleRequest): ScheduleSuggestion[] {
    const suggestions: ScheduleSuggestion[] = [];
    
    // 建议1：尝试其他导师
    const allTeachers = Array.from(this.context.teacherAvailabilities.keys());
    for (const teacherId of allTeachers.slice(0, 3)) {
      if (teacherId !== request.preferredTeacherId) {
        const availableSlots = this.findAvailableSlots(teacherId, request.studentId);
        if (availableSlots.length > 0) {
          suggestions.push({
            type: 'alternative_teacher',
            message: `建议更换导师，有可用时间槽`,
            suggestion: {
              teacherId,
              weekDay: availableSlots[0].weekDay,
              timeSlot: availableSlots[0].timeSlot,
            },
            score: 50,
          });
          break;
        }
      }
    }
    
    // 建议2：调整时间偏好
    suggestions.push({
      type: 'adjust_time',
      message: '建议放宽时间偏好，选择更多可用时间段',
      suggestion: {},
      score: 30,
    });
    
    return suggestions;
  }

  /**
   * 检测冲突
   */
  public detectConflicts(slot: ScheduleSlot): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    // 检查导师冲突
    const teacherBooked = this.context.existingSchedules.get(slot.teacherId);
    const slotKey = `${slot.weekDay}-${slot.timeSlot}`;
    if (teacherBooked?.has(slotKey)) {
      conflicts.push({
        type: 'teacher_conflict',
        message: '导师在该时间段已有课程安排',
        slot,
      });
    }
    
    // 检查学生冲突
    const studentBooked = this.context.studentExistingSchedules.get(slot.studentId);
    if (studentBooked?.has(slotKey)) {
      conflicts.push({
        type: 'student_conflict',
        message: '学生在该时间段已有课程安排',
        slot,
      });
    }
    
    return conflicts;
  }
}

/**
 * 构建排课上下文
 */
export async function buildScheduleContext(): Promise<ScheduleContext> {
  // 获取所有时间可用性
  const availabilities = await db.select().from(timeAvailabilities);
  
  // 构建导师可用性映射（使用userId代替teacherId）
  const teacherAvailabilities = new Map<string, Set<string>>();
  const studentAvailabilities = new Map<string, Set<string>>();
  
  for (const avail of availabilities) {
    const slotKey = `${avail.weekDay}-${avail.timeSlot}`;
    
    // 如果用户角色是导师，添加到导师可用性
    if (avail.userRole === '全职导师' || avail.userRole === '兼职导师') {
      if (!teacherAvailabilities.has(avail.userId)) {
        teacherAvailabilities.set(avail.userId, new Set());
      }
      teacherAvailabilities.get(avail.userId)!.add(slotKey);
    }
    
    // 如果是学生时间
    if (avail.studentId) {
      if (!studentAvailabilities.has(avail.studentId)) {
        studentAvailabilities.set(avail.studentId, new Set());
      }
      studentAvailabilities.get(avail.studentId)!.add(slotKey);
    }
  }
  
  // 获取已有排课
  const existingSchedules = await db.select()
    .from(scheduleResults)
    .where(not(eq(scheduleResults.status, '取消')));
  
  const teacherExistingSchedules = new Map<string, Set<string>>();
  const studentExistingSchedules = new Map<string, Set<string>>();
  
  for (const schedule of existingSchedules) {
    const slotKey = `${schedule.weekDay}-${schedule.timeSlot}`;
    
    if (!teacherExistingSchedules.has(schedule.teacherId)) {
      teacherExistingSchedules.set(schedule.teacherId, new Set());
    }
    teacherExistingSchedules.get(schedule.teacherId)!.add(slotKey);
    
    if (!studentExistingSchedules.has(schedule.studentId)) {
      studentExistingSchedules.set(schedule.studentId, new Set());
    }
    studentExistingSchedules.get(schedule.studentId)!.add(slotKey);
  }
  
  // 获取导师课程映射（使用teachableCourses代替courseIds）
  const allTeachers = await db.select().from(teachers);
  const teacherCourses = new Map<string, Set<string>>();
  
  // 获取所有课程以建立category到id的映射
  const allCourses = await db.select().from(courses);
  const categoryToCourseIds = new Map<string, string[]>();
  
  for (const course of allCourses) {
    if (!categoryToCourseIds.has(course.category)) {
      categoryToCourseIds.set(course.category, []);
    }
    categoryToCourseIds.get(course.category)!.push(course.id);
  }
  
  for (const teacher of allTeachers) {
    if (teacher.teachableCourses && teacher.teachableCourses.length > 0) {
      const courseIds: string[] = [];
      for (const category of teacher.teachableCourses) {
        const ids = categoryToCourseIds.get(category) || [];
        courseIds.push(...ids);
      }
      teacherCourses.set(teacher.id, new Set(courseIds));
    }
  }
  
  // 计算导师当前工作负载
  const teacherWorkload = new Map<string, number>();
  for (const schedule of existingSchedules) {
    const current = teacherWorkload.get(schedule.teacherId) || 0;
    teacherWorkload.set(schedule.teacherId, current + 1);
  }
  
  return {
    teacherAvailabilities,
    studentAvailabilities,
    existingSchedules: teacherExistingSchedules,
    studentExistingSchedules: studentExistingSchedules,
    teacherCourses,
    teacherWorkload,
    coursePriorities: new Map(),
  };
}

/**
 * 智能排课 API 封装
 */
export async function smartScheduleForStudent(
  studentId: string,
  courseIds: string[],
  options?: {
    preferredDays?: typeof WEEK_DAYS[number][];
    preferredSlots?: typeof TIME_SLOTS[number][];
    preferredTeacherId?: string;
  }
): Promise<{
  success: boolean;
  schedules: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  suggestions: ScheduleSuggestion[];
}> {
  // 构建上下文
  const context = await buildScheduleContext();
  
  // 创建调度器
  const scheduler = new SmartScheduler(context);
  
  // 构建请求列表
  const requests: ScheduleRequest[] = courseIds.map((courseId, index) => ({
    studentId,
    courseId,
    preferredTeacherId: options?.preferredTeacherId,
    preferredDays: options?.preferredDays,
    preferredSlots: options?.preferredSlots,
    priority: 5 - index, // 按顺序设置优先级
  }));
  
  // 执行批量排课
  const { results, totalSuccess, totalFailed } = scheduler.batchSchedule(requests);
  
  // 收集结果
  const schedules: ScheduleSlot[] = [];
  const allConflicts: ScheduleConflict[] = [];
  const allSuggestions: ScheduleSuggestion[] = [];
  
  results.forEach((result) => {
    if (result.success) {
      schedules.push(...result.slots);
    } else {
      allConflicts.push(...result.conflicts);
      allSuggestions.push(...result.suggestions);
    }
  });
  
  return {
    success: totalSuccess > 0,
    schedules,
    conflicts: allConflicts,
    suggestions: allSuggestions,
  };
}

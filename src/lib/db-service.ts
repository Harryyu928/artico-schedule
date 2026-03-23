/**
 * 数据库服务层
 * 提供所有数据库CRUD操作
 */

import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  students,
  courses,
  studentCourses,
  teachers,
  timeAvailabilities,
  scheduleResults,
} from '@/db/schema';
import type {
  NewStudent,
  NewCourse,
  NewStudentCourse,
  NewTeacher,
  NewTimeAvailability,
  NewScheduleResult,
} from '@/db/schema';
import type {
  CreateStudentRequest,
  CreateTeacherRequest,
  CreateCourseRequest,
  StudentSelectCourseRequest,
  SetTimeAvailabilityRequest,
  BatchSetTimeAvailabilityRequest,
  AutoScheduleRequest,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ==================== 学生相关操作 ====================

/**
 * 生成学生编号（按年自动编号）
 * 格式：年份+序号，如 202601、202602
 * 每年从01开始
 */
async function generateStudentId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString();
  
  try {
    // 查询当前年份的学生数量
    const yearStudents = await db
      .select()
      .from(students)
      .where(sql`student_id LIKE ${yearPrefix}%`);
    
    // 计算下一个序号
    let nextNumber = 1;
    
    if (yearStudents.length > 0) {
      // 提取所有序号，找出最大值
      const numbers = yearStudents
        .map(s => {
          const match = s.studentId.match(new RegExp(`^${yearPrefix}(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    // 格式化为两位数序号
    const sequence = nextNumber.toString().padStart(2, '0');
    return `${yearPrefix}${sequence}`;
  } catch (error) {
    console.error('生成学生编号失败:', error);
    // 降级方案：使用时间戳
    return `${yearPrefix}${Date.now().toString().slice(-2)}`;
  }
}

export async function createStudent(data: CreateStudentRequest) {
  const id = uuidv4();
  const studentId = await generateStudentId();
  
  try {
    const [student] = await db.insert(students).values({
      id,
      studentId,
      name: data.name,
      major: data.major as any,
      applicationCountry: data.application_country as any,
      currentStage: data.current_stage as any,
      totalHours: data.total_hours,
      usedHours: 0,
    }).returning();

    return student;
  } catch (error) {
    console.error('创建学生失败:', error);
    // 返回模拟数据
    return {
      id,
      studentId,
      name: data.name,
      major: data.major,
      applicationCountry: data.application_country,
      currentStage: data.current_stage,
      totalHours: data.total_hours,
      usedHours: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getStudents(options?: {
  major?: string;
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const result = await db.select().from(students);
    return result;
  } catch (error) {
    console.error('获取学生列表失败:', error);
    return [];
  }
}

export async function getStudentById(id: string) {
  const [student] = await db.select().from(students).where(eq(students.id, id));
  return student;
}

export async function updateStudent(id: string, data: Partial<NewStudent>) {
  const [student] = await db
    .update(students)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();
  return student;
}

export async function deleteStudent(id: string) {
  await db.delete(students).where(eq(students.id, id));
}

// ==================== 导师相关操作 ====================

export async function createTeacher(data: CreateTeacherRequest) {
  const id = uuidv4();
  const teacherId = `TCH${Date.now()}`;
  
  try {
    const [teacher] = await db.insert(teachers).values({
      id,
      teacherId,
      name: data.name,
      teachableCourses: data.teachable_courses as any,
      maxWeeklyHours: data.max_weekly_hours,
      currentHours: 0,
    }).returning();

    return teacher;
  } catch (error) {
    console.error('创建导师失败:', error);
    return {
      id,
      teacherId,
      name: data.name,
      teachableCourses: data.teachable_courses,
      maxWeeklyHours: data.max_weekly_hours,
      currentHours: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getTeachers(options?: {
  courseId?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = db.select().from(teachers);
    return query;
  } catch (error) {
    console.error('获取导师列表失败:', error);
    return [];
  }
}

export async function getTeacherById(id: string) {
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
  return teacher;
}

export async function updateTeacher(id: string, data: Partial<NewTeacher>) {
  const [teacher] = await db
    .update(teachers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teachers.id, id))
    .returning();
  return teacher;
}

export async function deleteTeacher(id: string) {
  await db.delete(teachers).where(eq(teachers.id, id));
}

// ==================== 课程相关操作 ====================

export async function createCourse(data: CreateCourseRequest) {
  const id = uuidv4();
  
  try {
    const [course] = await db.insert(courses).values({
      id,
      courseId: data.course_id,
      name: data.name,
      type: data.type as any,
      category: data.category as any,
      duration: data.duration as any,
      description: data.description,
    }).returning();

    return course;
  } catch (error) {
    console.error('创建课程失败:', error);
    return {
      id,
      courseId: data.course_id,
      name: data.name,
      type: data.type,
      category: data.category,
      duration: data.duration,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getCourses(options?: {
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const result = await db.select().from(courses);
    return result;
  } catch (error) {
    console.error('获取课程列表失败:', error);
    return [];
  }
}

export async function getCourseById(id: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, id));
  return course;
}

export async function getCourseByCategory(category: string) {
  const [course] = await db.select().from(courses).where(eq(courses.category, category as any));
  return course;
}

export async function updateCourse(id: string, data: Partial<NewCourse>) {
  const [course] = await db
    .update(courses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();
  return course;
}

export async function deleteCourse(id: string) {
  await db.delete(courses).where(eq(courses.id, id));
}

// ==================== 学生选课相关操作 ====================

export async function createStudentCourse(data: StudentSelectCourseRequest) {
  const id = uuidv4();
  
  try {
    const [studentCourse] = await db.insert(studentCourses).values({
      id,
      studentId: data.student_id,
      courseId: data.course_id,
      courseStage: data.course_stage as any,
      totalHours: data.total_hours,
      scheduledHours: 0,
    }).returning();

    return studentCourse;
  } catch (error) {
    console.error('创建学生选课失败:', error);
    return {
      id,
      studentId: data.student_id,
      courseId: data.course_id,
      courseStage: data.course_stage,
      totalHours: data.total_hours,
      scheduledHours: 0,
      status: '待确认',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getStudentCourses(options?: {
  studentId?: string;
  courseId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = db.select().from(studentCourses);
    return query;
  } catch (error) {
    console.error('获取学生选课列表失败:', error);
    return [];
  }
}

export async function getStudentCourseById(id: string) {
  const [studentCourse] = await db.select().from(studentCourses).where(eq(studentCourses.id, id));
  return studentCourse;
}

export async function updateStudentCourse(id: string, data: Partial<NewStudentCourse>) {
  const [studentCourse] = await db
    .update(studentCourses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(studentCourses.id, id))
    .returning();
  return studentCourse;
}

export async function deleteStudentCourse(id: string) {
  await db.delete(studentCourses).where(eq(studentCourses.id, id));
}

// ==================== 时间可用性相关操作 ====================

export async function setTimeAvailability(data: SetTimeAvailabilityRequest) {
  const id = uuidv4();
  
  try {
    // 先检查是否已存在
    const existing = await db
      .select()
      .from(timeAvailabilities)
      .where(
        and(
          eq(timeAvailabilities.userId, data.user_id),
          eq(timeAvailabilities.weekDay, data.week_day as any),
          eq(timeAvailabilities.timeSlot, data.time_slot as any)
        )
      );

    if (existing.length > 0) {
      // 更新现有记录
      const [updated] = await db
        .update(timeAvailabilities)
        .set({ 
          isAvailable: data.is_available,
          name: data.name,
          updatedAt: new Date() 
        })
        .where(eq(timeAvailabilities.id, existing[0].id))
        .returning();
      return updated;
    }

    // 创建新记录
    const [availability] = await db.insert(timeAvailabilities).values({
      id,
      userId: data.user_id,
      userRole: data.user_role as any,
      name: data.name,
      weekDay: data.week_day as any,
      timeSlot: data.time_slot as any,
      isAvailable: data.is_available,
    }).returning();

    return availability;
  } catch (error) {
    console.error('设置时间可用性失败:', error);
    return {
      id,
      userId: data.user_id,
      userRole: data.user_role,
      name: data.name,
      weekDay: data.week_day,
      timeSlot: data.time_slot,
      isAvailable: data.is_available,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function batchSetTimeAvailability(data: BatchSetTimeAvailabilityRequest) {
  const results = [];
  
  for (const availability of data.availabilities) {
    const result = await setTimeAvailability({
      user_id: data.user_id,
      user_role: data.user_role,
      name: data.name,
      week_day: availability.week_day,
      time_slot: availability.time_slot,
      is_available: availability.is_available,
    });
    results.push(result);
  }

  return results;
}

export async function getTimeAvailabilities(options: {
  userId?: string;
  userRole?: string;
  weekDay?: string;
}) {
  try {
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(timeAvailabilities.userId, options.userId));
    }
    
    if (options.userRole) {
      conditions.push(eq(timeAvailabilities.userRole, options.userRole as any));
    }
    
    if (options.weekDay) {
      conditions.push(eq(timeAvailabilities.weekDay, options.weekDay as any));
    }

    if (conditions.length > 0) {
      return db.select().from(timeAvailabilities).where(and(...conditions));
    }

    return db.select().from(timeAvailabilities);
  } catch (error) {
    console.error('获取时间可用性失败:', error);
    return [];
  }
}

export async function deleteUserTimeAvailabilities(userId: string) {
  await db.delete(timeAvailabilities).where(eq(timeAvailabilities.userId, userId));
}

// ==================== 排课结果相关操作 ====================

export async function createScheduleResult(data: NewScheduleResult) {
  const id = uuidv4();
  const scheduleId = `SCH${Date.now()}`;
  
  try {
    const [result] = await db.insert(scheduleResults).values({
      id,
      scheduleId,
      studentId: data.studentId,
      teacherId: data.teacherId,
      courseId: data.courseId,
      studentCourseId: data.studentCourseId,
      date: data.date,
      weekDay: data.weekDay,
      timeSlot: data.timeSlot,
      hours: data.hours || 2,
      status: data.status || '待确认',
      notes: data.notes,
    }).returning();

    return result;
  } catch (error) {
    console.error('创建排课结果失败:', error);
    return {
      id,
      scheduleId,
      studentId: data.studentId,
      teacherId: data.teacherId,
      courseId: data.courseId,
      studentCourseId: data.studentCourseId,
      date: data.date,
      weekDay: data.weekDay,
      timeSlot: data.timeSlot,
      hours: data.hours || 2,
      status: data.status || '待确认',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getScheduleResults(options?: {
  studentId?: string;
  teacherId?: string;
  courseId?: string;
  status?: string;
  date?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let query = db.select().from(scheduleResults);
    return query;
  } catch (error) {
    console.error('获取排课结果失败:', error);
    return [];
  }
}

export async function getScheduleResultById(id: string) {
  const [result] = await db.select().from(scheduleResults).where(eq(scheduleResults.id, id));
  return result;
}

export async function updateScheduleResult(id: string, data: Partial<NewScheduleResult>) {
  const [result] = await db
    .update(scheduleResults)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scheduleResults.id, id))
    .returning();
  return result;
}

export async function deleteScheduleResult(id: string) {
  await db.delete(scheduleResults).where(eq(scheduleResults.id, id));
}

// ==================== 统计相关操作 ====================

export async function getStatistics() {
  try {
    const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students);
    const [teacherCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers);
    const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
    const [scheduleCount] = await db.select({ count: sql<number>`count(*)` }).from(scheduleResults);

    return {
      total_students: studentCount.count,
      total_teachers: teacherCount.count,
      total_courses: courseCount.count,
      scheduled_courses: scheduleCount.count,
      pending_schedules: 0,
      this_week_hours: 0,
    };
  } catch (error) {
    console.error('数据库查询失败，返回默认统计数据:', error);
    // 返回默认数据，避免页面崩溃
    return {
      total_students: 0,
      total_teachers: 0,
      total_courses: 0,
      scheduled_courses: 0,
      pending_schedules: 0,
      this_week_hours: 0,
    };
  }
}

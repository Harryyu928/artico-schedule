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

export async function createStudent(data: CreateStudentRequest) {
  const id = uuidv4();
  const studentId = `STD${Date.now()}`;
  
  const [student] = await db.insert(students).values({
    id,
    studentId,
    name: data.name,
    major: data.major,
    applicationCountry: data.application_country,
    currentStage: data.current_stage,
    totalHours: data.total_hours,
    usedHours: 0,
  }).returning();

  return student;
}

export async function getStudents(options?: {
  major?: string;
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(students);

  // TODO: 添加过滤和分页逻辑

  return query;
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
  
  const [teacher] = await db.insert(teachers).values({
    id,
    teacherId,
    name: data.name,
    teachableCourses: data.teachable_courses,
    maxWeeklyHours: data.max_weekly_hours,
    currentHours: 0,
  }).returning();

  return teacher;
}

export async function getTeachers(options?: {
  courseId?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(teachers);

  // TODO: 添加过滤和分页逻辑

  return query;
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
  
  const [course] = await db.insert(courses).values({
    id,
    courseId: data.course_id,
    name: data.name,
    type: data.type,
    category: data.category,
    duration: data.duration,
    description: data.description,
  }).returning();

  return course;
}

export async function getCourses(options?: {
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(courses);

  // TODO: 添加过滤和分页逻辑

  return query;
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
  
  const [studentCourse] = await db.insert(studentCourses).values({
    id,
    studentId: data.student_id,
    courseId: data.course_id,
    courseStage: data.course_stage,
    totalHours: data.total_hours,
    scheduledHours: 0,
  }).returning();

  return studentCourse;
}

export async function getStudentCourses(options?: {
  studentId?: string;
  courseId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(studentCourses);

  // TODO: 添加过滤和分页逻辑

  return query;
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
  
  // 先检查是否已存在
  const existing = await db
    .select()
    .from(timeAvailabilities)
    .where(
      and(
        eq(timeAvailabilities.userId, data.user_id),
        eq(timeAvailabilities.weekDay, data.week_day),
        eq(timeAvailabilities.timeSlot, data.time_slot)
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
    userRole: data.user_role,
    name: data.name,
    weekDay: data.week_day,
    timeSlot: data.time_slot,
    isAvailable: data.is_available,
  }).returning();

  return availability;
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
}

export async function deleteUserTimeAvailabilities(userId: string) {
  await db.delete(timeAvailabilities).where(eq(timeAvailabilities.userId, userId));
}

// ==================== 排课结果相关操作 ====================

export async function createScheduleResult(data: NewScheduleResult) {
  const id = uuidv4();
  const scheduleId = `SCH${Date.now()}`;
  
  const [result] = await db.insert(scheduleResults).values({
    ...data,
    id,
    scheduleId,
  }).returning();

  return result;
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
  let query = db.select().from(scheduleResults);

  // TODO: 添加过滤和分页逻辑

  return query;
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
  const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students);
  const [teacherCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers);
  const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
  const [scheduleCount] = await db.select({ count: sql<number>`count(*)` }).from(scheduleResults);

  return {
    total_students: studentCount.count,
    total_teachers: teacherCount.count,
    total_courses: courseCount.count,
    scheduled_courses: scheduleCount.count,
    pending_schedules: 0, // TODO: 实现实际逻辑
    this_week_hours: 0, // TODO: 实现实际逻辑
  };
}

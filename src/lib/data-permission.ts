/**
 * 数据权限过滤服务
 * 根据用户角色自动过滤数据
 */

import { db } from '@/db';
import { 
  students, 
  teachers, 
  courses, 
  classRecords,
  courseSelectionForms,
  scheduleResults,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { UserRole } from '@/types/permissions';

// ==================== 类型定义 ====================

export interface UserContext {
  id: string;
  role: UserRole;
  teacherId?: string;
  studentId?: string;
}

// ==================== 数据权限规则 ====================

function getStudentFilters(userId: string, studentId?: string) {
  return {
    students: studentId ? eq(students.id, studentId) : eq(students.id, 'none'),
    courses: undefined,
    teachers: undefined,
    classRecords: studentId ? eq(classRecords.studentId, studentId) : eq(classRecords.studentId, 'none'),
    selectionForms: studentId ? eq(courseSelectionForms.studentId, studentId) : eq(courseSelectionForms.studentId, 'none'),
    scheduleResults: studentId ? eq(scheduleResults.studentId, studentId) : eq(scheduleResults.id, 'none'),
  };
}

function getTeacherFilters(userId: string, teacherId?: string) {
  return {
    students: undefined,
    courses: undefined,
    teachers: teacherId ? eq(teachers.id, teacherId) : undefined,
    classRecords: teacherId ? eq(classRecords.teacherId, teacherId) : eq(classRecords.teacherId, 'none'),
    selectionForms: undefined,
    scheduleResults: teacherId ? eq(scheduleResults.teacherId, teacherId) : eq(scheduleResults.id, 'none'),
  };
}

function getConsultantFilters(userId: string) {
  return {
    students: undefined,
    courses: undefined,
    teachers: undefined,
    classRecords: undefined,
    selectionForms: undefined,
    scheduleResults: undefined,
  };
}

function getAdminFilters(userId: string) {
  return {
    students: undefined,
    courses: undefined,
    teachers: undefined,
    classRecords: undefined,
    selectionForms: undefined,
    scheduleResults: undefined,
  };
}

// ==================== 主过滤函数 ====================

export function getDataFilters(user: UserContext) {
  switch (user.role) {
    case '管理员':
      return getAdminFilters(user.id);
    case '规划顾问':
      return getConsultantFilters(user.id);
    case '全职导师':
    case '兼职导师':
      return getTeacherFilters(user.id, user.teacherId);
    case '学生':
      return getStudentFilters(user.id, user.studentId);
    default:
      return {
        students: eq(students.id, 'none'),
        courses: eq(courses.id, 'none'),
        teachers: eq(teachers.id, 'none'),
        classRecords: eq(classRecords.id, 'none'),
        selectionForms: eq(courseSelectionForms.id, 'none'),
        scheduleResults: eq(scheduleResults.id, 'none'),
      };
  }
}

// ==================== 数据访问服务 ====================

export async function getStudentsWithPermission(user: UserContext, options?: {
  page?: number;
  pageSize?: number;
}) {
  const filters = getDataFilters(user);
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  const whereClause = filters.students;
  
  const data = await db.select()
    .from(students)
    .where(whereClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(students)
    .where(whereClause);

  return {
    data,
    total: Number(countResult[0]?.count) || 0,
    page,
    pageSize,
  };
}

export async function getClassRecordsWithPermission(user: UserContext, options?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const filters = getDataFilters(user);
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  const conditions = [filters.classRecords];
  
  if (options?.status) {
    conditions.push(eq(classRecords.attendanceStatus, options.status as any));
  }

  const whereClause = conditions.every(c => c === undefined) 
    ? undefined 
    : and(...conditions.filter(Boolean));

  const data = await db.select()
    .from(classRecords)
    .where(whereClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(classRecords)
    .where(whereClause);

  return {
    data,
    total: Number(countResult[0]?.count) || 0,
    page,
    pageSize,
  };
}

// ==================== 角色仪表盘数据 ====================

export async function getAdminDashboardData() {
  const [studentCount, teacherCount, courseCount, scheduleCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(students),
    db.select({ count: sql<number>`count(*)` }).from(teachers),
    db.select({ count: sql<number>`count(*)` }).from(courses),
    db.select({ count: sql<number>`count(*)` }).from(scheduleResults),
  ]);

  return {
    totalStudents: Number(studentCount[0]?.count) || 0,
    totalTeachers: Number(teacherCount[0]?.count) || 0,
    totalCourses: Number(courseCount[0]?.count) || 0,
    totalSchedules: Number(scheduleCount[0]?.count) || 0,
    role: '管理员',
  };
}

export async function getConsultantDashboardData() {
  const [pendingForms, totalSchedules, inProgressForms] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(courseSelectionForms).where(eq(courseSelectionForms.status, '草稿')),
    db.select({ count: sql<number>`count(*)` }).from(scheduleResults),
    db.select({ count: sql<number>`count(*)` }).from(courseSelectionForms).where(eq(courseSelectionForms.status, '执行中')),
  ]);

  return {
    pendingForms: Number(pendingForms[0]?.count) || 0,
    thisWeekSchedules: Number(totalSchedules[0]?.count) || 0,
    pendingSelections: Number(inProgressForms[0]?.count) || 0,
    role: '规划顾问',
  };
}

export async function getTeacherDashboardData(teacherId: string) {
  const [totalSchedules, totalRecords, pendingRecords, totalHours] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(scheduleResults).where(eq(scheduleResults.teacherId, teacherId)),
    db.select({ count: sql<number>`count(*)` }).from(classRecords).where(eq(classRecords.teacherId, teacherId)),
    db.select({ count: sql<number>`count(*)` }).from(classRecords).where(
      and(
        eq(classRecords.teacherId, teacherId),
        eq(classRecords.attendanceStatus, '已排课')
      )
    ),
    db.select({ total: sql<number>`coalesce(sum(actual_duration), 0)` }).from(classRecords).where(eq(classRecords.teacherId, teacherId)),
  ]);

  return {
    todayClasses: Number(totalSchedules[0]?.count) || 0,
    weekClasses: Number(totalRecords[0]?.count) || 0,
    pendingRecords: Number(pendingRecords[0]?.count) || 0,
    totalHours: Math.floor((Number(totalHours[0]?.total) || 0) / 60),
    role: '导师',
  };
}

export async function getStudentDashboardData(studentId: string) {
  const [totalSchedules, completedClasses, totalHours, forms] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(scheduleResults).where(
      and(
        eq(scheduleResults.studentId, studentId),
        eq(scheduleResults.status, '已确认')
      )
    ),
    db.select({ count: sql<number>`count(*)` }).from(classRecords).where(
      and(
        eq(classRecords.studentId, studentId),
        eq(classRecords.attendanceStatus, '已完成')
      )
    ),
    db.select({ total: sql<number>`coalesce(sum(actual_duration), 0)` }).from(classRecords).where(eq(classRecords.studentId, studentId)),
    db.select({ count: sql<number>`count(*)` }).from(courseSelectionForms).where(eq(courseSelectionForms.studentId, studentId)),
  ]);

  return {
    upcomingClasses: Number(totalSchedules[0]?.count) || 0,
    completedClasses: Number(completedClasses[0]?.count) || 0,
    totalHours: Math.floor((Number(totalHours[0]?.total) || 0) / 60),
    selectionForms: Number(forms[0]?.count) || 0,
    role: '学生',
  };
}

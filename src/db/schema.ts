import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import {
  MajorDirection,
  ApplicationCountry,
  StudyStage,
  CourseType,
  CourseCategory,
  CourseDuration,
  CourseStage,
  UserRole,
  WeekDay,
  TimeSlot,
  ScheduleStatus,
} from '@/types';

// 枚举定义
export const majorDirectionEnum = pgEnum('major_direction', [
  '游戏设计',
  '游戏美术',
  '角色设计',
  '3D游戏美术',
  '动画',
] as const);

export const applicationCountryEnum = pgEnum('application_country', [
  '美国',
  '英国',
  '加拿大',
  '日本',
] as const);

export const studyStageEnum = pgEnum('study_stage', [
  '基础阶段',
  '项目阶段',
  '作品集打磨',
] as const);

export const courseTypeEnum = pgEnum('course_type', [
  '基础课',
  '项目课',
] as const);

export const courseCategoryEnum = pgEnum('course_category', [
  'F-GD',
  'F-TA',
  'F-GA',
  'F-3D',
  'F-AN',
  'P-GD',
  'P-AN',
  'P-GA',
  'P-CA',
  'P-3DGA',
] as const);

export const courseDurationEnum = pgEnum('course_duration', [
  '4周',
  '5周',
  '1个月',
  '2个月',
  '3个月',
] as const);

export const courseStageEnum = pgEnum('course_stage', [
  '基础',
  '项目',
  '作品集',
] as const);

export const userRoleEnum = pgEnum('user_role', [
  '学生',
  '导师',
  '管理员',
] as const);

export const weekDayEnum = pgEnum('week_day', [
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
] as const);

export const timeSlotEnum = pgEnum('time_slot', [
  '10:00',
  '13:00',
  '15:00',
  '18:00',
  '20:00',
] as const);

export const scheduleStatusEnum = pgEnum('schedule_status', [
  '待确认',
  '已确认',
  '已完成',
  '取消',
] as const);

// 学生表
export const students = pgTable('students', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  major: majorDirectionEnum('major').notNull(),
  applicationCountry: applicationCountryEnum('application_country').notNull(),
  currentStage: studyStageEnum('current_stage').notNull(),
  totalHours: integer('total_hours').notNull().default(0),
  usedHours: integer('used_hours').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 课程库
export const courses = pgTable('courses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  courseId: varchar('course_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  type: courseTypeEnum('type').notNull(),
  category: courseCategoryEnum('category').notNull(),
  duration: courseDurationEnum('duration').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 学生选课表
export const studentCourses = pgTable('student_courses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id, { onDelete: 'cascade' }),
  courseStage: courseStageEnum('course_stage').notNull(),
  totalHours: integer('total_hours').notNull().default(0),
  scheduledHours: integer('scheduled_hours').notNull().default(0),
  status: scheduleStatusEnum('status').notNull().default('待确认'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 导师表
export const teachers = pgTable('teachers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  teacherId: varchar('teacher_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  teachableCourses: courseCategoryEnum('teachable_courses').array().notNull(),
  maxWeeklyHours: integer('max_weekly_hours').notNull().default(20),
  currentHours: integer('current_hours').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 时间表（学生+导师）
export const timeAvailabilities = pgTable('time_availabilities', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  userRole: userRoleEnum('user_role').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  weekDay: weekDayEnum('week_day').notNull(),
  timeSlot: timeSlotEnum('time_slot').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 排课结果表
export const scheduleResults = pgTable('schedule_results', {
  id: varchar('id', { length: 36 }).primaryKey(),
  scheduleId: varchar('schedule_id', { length: 50 }).notNull().unique(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentCourseId: varchar('student_course_id', { length: 36 }).references(() => studentCourses.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  weekDay: weekDayEnum('week_day').notNull(),
  timeSlot: timeSlotEnum('time_slot').notNull(),
  hours: integer('hours').notNull().default(2),
  status: scheduleStatusEnum('status').notNull().default('待确认'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 类型导出
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type StudentCourse = typeof studentCourses.$inferSelect;
export type NewStudentCourse = typeof studentCourses.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type TimeAvailability = typeof timeAvailabilities.$inferSelect;
export type NewTimeAvailability = typeof timeAvailabilities.$inferInsert;
export type ScheduleResult = typeof scheduleResults.$inferSelect;
export type NewScheduleResult = typeof scheduleResults.$inferInsert;

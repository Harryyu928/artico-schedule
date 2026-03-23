import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  date,
  pgEnum,
  jsonb,
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
  SelectionFormStatus,
  SelectionItemStatus,
  ClassRecordStatus,
  ProjectPhase,
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

export const teacherTypeEnum = pgEnum('teacher_type', [
  '全职',
  '兼职',
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

// 新增枚举定义
export const selectionFormStatusEnum = pgEnum('selection_form_status', [
  '草稿',
  '已确认',
  '执行中',
  '已完成',
  '已取消',
] as const);

export const selectionItemStatusEnum = pgEnum('selection_item_status', [
  '待排课',
  '排课中',
  '上课中',
  '已完成',
  '已暂停',
] as const);

export const classRecordStatusEnum = pgEnum('class_record_status', [
  '已排课',
  '已完成',
  '已取消',
  '学生缺席',
  '补课',
] as const);

export const projectPhaseEnum = pgEnum('project_phase', [
  'Concept',
  'Modeling',
  'Texturing',
  'Lighting',
  'Render',
  'Portfolio',
] as const);

export const degreeEnum = pgEnum('degree', [
  '本科',
  '硕士',
  '博士',
] as const);

export const applicationStatusEnum = pgEnum('application_status', [
  '准备中',
  '已申请',
  '已录取',
  '已拒绝',
] as const);

// ========== 用户认证相关表 ==========

// 用户表
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  
  // 关联信息（根据角色不同，关联不同的实体）
  teacherId: varchar('teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  studentId: varchar('student_id', { length: 36 }).references(() => students.id, { onDelete: 'set null' }),
  
  // 基本信息
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }),
  avatar: varchar('avatar', { length: 500 }),
  
  // 状态
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 会话表
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ========== 业务表 ==========

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
  teacherType: teacherTypeEnum('teacher_type').notNull().default('全职'),
  maxWeeklyHours: integer('max_weekly_hours').notNull().default(20),
  currentHours: integer('current_hours').notNull().default(0),
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  bio: text('bio'),
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

// ========== 新增表 ==========

// 申请院校表
export const applicationSchools = pgTable('application_schools', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolName: varchar('school_name', { length: 200 }).notNull(),
  country: applicationCountryEnum('country').notNull(),
  major: varchar('major', { length: 200 }).notNull(),
  degree: degreeEnum('degree').notNull(),
  priority: integer('priority').notNull().default(1),
  deadline: date('deadline'),
  status: applicationStatusEnum('status').notNull().default('准备中'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 选课单主表
export const courseSelectionForms = pgTable('course_selection_forms', {
  id: varchar('id', { length: 36 }).primaryKey(),
  formId: varchar('form_id', { length: 50 }).notNull().unique(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  consultationTeacherId: varchar('consultation_teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  status: selectionFormStatusEnum('status').notNull().default('草稿'),
  
  // 规划信息
  totalPlannedHours: integer('total_planned_hours').notNull().default(0),
  estimatedStartDate: date('estimated_start_date').notNull(),
  estimatedEndDate: date('estimated_end_date').notNull(),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  
  // 进度统计
  totalCourses: integer('total_courses').notNull().default(0),
  completedCourses: integer('completed_courses').notNull().default(0),
  totalHours: integer('total_hours').notNull().default(0),
  completedHours: integer('completed_hours').notNull().default(0),
  
  // 备注
  notes: text('notes'),
  goals: text('goals'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 选课单明细表
export const courseSelectionItems = pgTable('course_selection_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  formId: varchar('form_id', { length: 36 }).notNull().references(() => courseSelectionForms.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id, { onDelete: 'cascade' }),
  
  // 课程信息
  courseType: courseTypeEnum('course_type').notNull(),
  courseStage: courseStageEnum('course_stage').notNull(),
  
  // 课时规划
  plannedHours: integer('planned_hours').notNull().default(0),
  scheduledHours: integer('scheduled_hours').notNull().default(0),
  completedHours: integer('completed_hours').notNull().default(0),
  
  // 进度管理
  status: selectionItemStatusEnum('status').notNull().default('待排课'),
  priority: integer('priority').notNull().default(5),
  
  // 时间规划
  plannedStartDate: date('planned_start_date'),
  plannedEndDate: date('planned_end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  
  // 项目课特有字段
  currentPhase: projectPhaseEnum('current_phase'),
  phaseProgress: jsonb('phase_progress').$type<Record<string, number>>(),
  
  // 备注
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 上课记录表
export const classRecords = pgTable('class_records', {
  id: varchar('id', { length: 36 }).primaryKey(),
  recordId: varchar('record_id', { length: 50 }).notNull().unique(),
  scheduleId: varchar('schedule_id', { length: 50 }),
  
  // 基本信息
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id, { onDelete: 'cascade' }),
  selectionItemId: varchar('selection_item_id', { length: 36 }).references(() => courseSelectionItems.id, { onDelete: 'set null' }),
  
  // 上课信息
  classDate: date('class_date').notNull(),
  weekDay: weekDayEnum('week_day').notNull(),
  startTime: timeSlotEnum('start_time').notNull(),
  endTime: timeSlotEnum('end_time'),
  actualDuration: integer('actual_duration').notNull().default(120), // 默认120分钟
  
  // 课程内容
  contentSummary: text('content_summary').notNull(),
  teachingMethod: varchar('teaching_method', { length: 100 }),
  
  // 学生表现
  studentPerformance: text('student_performance'),
  attendanceStatus: classRecordStatusEnum('attendance_status').notNull().default('已排课'),
  
  // 作业与反馈
  homeworkAssigned: text('homework_assigned'),
  homeworkDeadline: date('homework_deadline'),
  nextClassPlan: text('next_class_plan'),
  teacherFeedback: text('teacher_feedback'),
  studentFeedback: text('student_feedback'),
  
  // 项目课特有
  projectPhase: projectPhaseEnum('project_phase'),
  phaseContent: text('phase_content'),
  
  // 附件
  attachments: jsonb('attachments').$type<string[]>(),
  
  // 记录创建者
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  
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

// 新增类型导出
export type ApplicationSchool = typeof applicationSchools.$inferSelect;
export type NewApplicationSchool = typeof applicationSchools.$inferInsert;
export type CourseSelectionForm = typeof courseSelectionForms.$inferSelect;
export type NewCourseSelectionForm = typeof courseSelectionForms.$inferInsert;
export type CourseSelectionItem = typeof courseSelectionItems.$inferSelect;
export type NewCourseSelectionItem = typeof courseSelectionItems.$inferInsert;
export type ClassRecord = typeof classRecords.$inferSelect;
export type NewClassRecord = typeof classRecords.$inferInsert;

// 用户认证类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

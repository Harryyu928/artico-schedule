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
  '管理员',        // 顾问主管
  '规划顾问',      // 规划顾问
  '全职导师',      // 全职导师
  '兼职导师',      // 兼职导师
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

// 时间预留类型枚举
export const timeReservationTypeEnum = pgEnum('time_reservation_type', [
  '空闲',          // 可用于排课
  '顾问指导',      // 规划顾问选课指导时间（预留）
  '固定课程',      // 固定安排的课程时间
  '不可用',        // 不可用时间
] as const);

// 预留目的枚举（顾问预留时间用）
export const reservationPurposeEnum = pgEnum('reservation_purpose', [
  '填写时间表',    // 帮学生填写可用时间表
  '预约上课',      // 帮学生预约上课
  '选课指导',      // 选课指导咨询
  '其他',          // 其他事务
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
  passwordHash: varchar('password_hash', { length: 255 }), // 飞书登录用户可为空
  role: userRoleEnum('role').notNull(),
  
  // 关联信息（根据角色不同，关联不同的实体）
  teacherId: varchar('teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  studentId: varchar('student_id', { length: 36 }).references(() => students.id, { onDelete: 'set null' }),
  
  // 基本信息
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  avatar: varchar('avatar', { length: 500 }),
  
  // 飞书集成信息
  feishuOpenId: varchar('feishu_open_id', { length: 100 }).unique(),
  feishuUnionId: varchar('feishu_union_id', { length: 100 }).unique(),
  feishuAccessToken: varchar('feishu_access_token', { length: 500 }),
  feishuRefreshToken: varchar('feishu_refresh_token', { length: 500 }),
  feishuTokenExpiresAt: timestamp('feishu_token_expires_at'),
  
  // 状态
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginMethod: varchar('last_login_method', { length: 20 }), // 'password' | 'feishu'
  
  // 通知偏好
  notificationChannels: jsonb('notification_channels').$type<{
    feishu: boolean;
    wechat: boolean;
    email: boolean;
    sms: boolean;
  }>().default({ feishu: true, wechat: true, email: false, sms: false }),
  
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
  
  // 联系信息
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  wechat: varchar('wechat', { length: 50 }),
  
  // 负责人
  consultantId: varchar('consultant_id', { length: 36 }), // 负责规划顾问
  primaryTeacherId: varchar('primary_teacher_id', { length: 36 }), // 主导师
  
  // 通知偏好
  notificationChannels: jsonb('notification_channels').$type<{
    wechat: boolean;
    email: boolean;
    sms: boolean;
  }>().default({ wechat: true, email: false, sms: false }),
  
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
  
  // 飞书集成
  feishuUserId: varchar('feishu_user_id', { length: 100 }).unique(),
  
  // 通知偏好
  notificationChannels: jsonb('notification_channels').$type<{
    feishu: boolean;
    wechat: boolean;
    email: boolean;
    sms: boolean;
  }>().default({ feishu: true, wechat: false, email: false, sms: false }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 时间表（学生+导师+规划顾问）
export const timeAvailabilities = pgTable('time_availabilities', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  userRole: userRoleEnum('user_role').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  weekDay: weekDayEnum('week_day').notNull(),
  timeSlot: timeSlotEnum('time_slot').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  
  // 预留类型（用于标识时间段用途）
  reservationType: timeReservationTypeEnum('reservation_type').notNull().default('空闲'),
  
  // 预留目的（顾问预留时间时使用）
  reservationPurpose: reservationPurposeEnum('reservation_purpose'),
  
  // 如果是顾问指导/预留时间，关联的规划顾问
  consultantId: varchar('consultant_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  
  // 如果是顾问为某个学生预留的时间，关联的学生
  studentId: varchar('student_id', { length: 36 }).references(() => students.id, { onDelete: 'set null' }),
  
  // 备注
  notes: text('notes'),
  
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
  
  // 飞书日历事件ID
  feishuEventId: varchar('feishu_event_id', { length: 100 }),
  
  // PDF文件
  pdfUrl: varchar('pdf_url', { length: 500 }),
  pdfGeneratedAt: timestamp('pdf_generated_at'),
  
  // 学生签字确认
  studentSignature: varchar('student_signature', { length: 500 }),
  signatureTime: timestamp('signature_time'),
  signToken: varchar('sign_token', { length: 64 }).unique(),
  signTokenExpiresAt: timestamp('sign_token_expires_at'),
  
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
  
  // PDF文件
  pdfUrl: varchar('pdf_url', { length: 500 }),
  pdfGeneratedAt: timestamp('pdf_generated_at'),
  
  // 学生签字
  studentSignature: varchar('student_signature', { length: 500 }),
  signatureTime: timestamp('signature_time'),
  signatureMethod: varchar('signature_method', { length: 20 }),
  
  // 签字链接
  signToken: varchar('sign_token', { length: 64 }).unique(),
  signTokenExpiresAt: timestamp('sign_token_expires_at'),
  signLinkSentAt: timestamp('sign_link_sent_at'),
  signLinkSentTo: varchar('sign_link_sent_to', { length: 200 }),
  
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
  
  // 课程类别与内容（新增）
  courseCategory: varchar('course_category', { length: 100 }), // 课程类别：AP艺术课程、作品集指导等
  courseContentDetail: varchar('course_content_detail', { length: 200 }), // 课程内容详情：2D Design、3D Modeling等
  
  // 上课信息
  classDate: date('class_date').notNull(),
  weekDay: weekDayEnum('week_day').notNull(),
  startTime: timeSlotEnum('start_time').notNull(),
  endTime: varchar('end_time', { length: 10 }), // 结束时间，灵活存储
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
  homeworkCompletionRate: integer('homework_completion_rate').default(0), // 作业完成度 0-100
  lastHomeworkQuality: varchar('last_homework_quality', { length: 50 }), // 上节课作业品质
  nextClassPlan: text('next_class_plan'),
  teacherFeedback: text('teacher_feedback'), // 导师评语
  studentFeedback: text('student_feedback'), // 学生反馈
  
  // 项目课特有
  projectPhase: projectPhaseEnum('project_phase'),
  phaseContent: text('phase_content'),
  
  // 附件
  attachments: jsonb('attachments').$type<string[]>(),
  
  // PDF文件（新增）
  pdfUrl: varchar('pdf_url', { length: 500 }), // 生成的PDF文件URL
  pdfGeneratedAt: timestamp('pdf_generated_at'), // PDF生成时间
  
  // 学生签字（新增）
  studentSignature: varchar('student_signature', { length: 500 }), // 学生签名（图片URL或时间戳）
  signatureTime: timestamp('signature_time'), // 签名时间
  signatureMethod: varchar('signature_method', { length: 20 }), // 签名方式：online/offline
  
  // 签字链接（新增）
  signToken: varchar('sign_token', { length: 64 }).unique(), // 签字唯一token
  signTokenExpiresAt: timestamp('sign_token_expires_at'), // 签字链接过期时间
  signLinkSentAt: timestamp('sign_link_sent_at'), // 签字链接发送时间
  signLinkSentTo: varchar('sign_link_sent_to', { length: 200 }), // 发送到的联系方式（手机/邮箱）
  
  // 记录创建者
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ========== 工作流相关表 ==========

// 工作流类型枚举
export const workflowTypeEnum = pgEnum('workflow_type', [
  'student_onboarding',    // 学生入学流程
  'selection_form',        // 选课单处理流程
  'course_progress',       // 课程进度流程
  'application_tracking',  // 申请跟踪流程
] as const);

// 工作流阶段状态枚举
export const workflowStageStatusEnum = pgEnum('workflow_stage_status', [
  'pending',      // 待处理
  'in_progress',  // 进行中
  'completed',    // 已完成
  'skipped',      // 已跳过
  'blocked',      // 已阻塞
] as const);

// 任务优先级枚举
export const taskPriorityEnum = pgEnum('task_priority', [
  'low',     // 低
  'medium',  // 中
  'high',    // 高
  'urgent',  // 紧急
] as const);

// 工作流定义表
export const workflowDefinitions = pgTable('workflow_definitions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  type: workflowTypeEnum('type').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 工作流阶段定义表
export const workflowStageDefinitions = pgTable('workflow_stage_definitions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  workflowId: varchar('workflow_id', { length: 36 }).notNull().references(() => workflowDefinitions.id, { onDelete: 'cascade' }),
  stageOrder: integer('stage_order').notNull(), // 阶段顺序
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 20 }).notNull().default('#6B7280'), // 看板颜色
  icon: varchar('icon', { length: 50 }), // 图标名称
  isRequired: boolean('is_required').notNull().default(true), // 是否必经阶段
  autoAdvance: boolean('auto_advance').notNull().default(false), // 是否自动进入下一阶段
  estimatedDays: integer('estimated_days'), // 预计天数
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 工作流任务模板表
export const workflowTaskTemplates = pgTable('workflow_task_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  stageId: varchar('stage_id', { length: 36 }).notNull().references(() => workflowStageDefinitions.id, { onDelete: 'cascade' }),
  taskOrder: integer('task_order').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  assigneeRole: userRoleEnum('assignee_role'), // 默认分配给哪个角色
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  estimatedMinutes: integer('estimated_minutes'), // 预计完成时间（分钟）
  checklist: jsonb('checklist').$type<string[]>(), // 任务清单项
  dependsOn: jsonb('depends_on').$type<string[]>(), // 依赖的任务模板ID列表
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 工作流实例表
export const workflowInstances = pgTable('workflow_instances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  workflowId: varchar('workflow_id', { length: 36 }).notNull().references(() => workflowDefinitions.id, { onDelete: 'cascade' }),
  
  // 关联实体
  entityType: varchar('entity_type', { length: 50 }).notNull(), // student, selection_form, etc.
  entityId: varchar('entity_id', { length: 36 }).notNull(),
  
  // 当前状态
  currentStageId: varchar('current_stage_id', { length: 36 }).references(() => workflowStageDefinitions.id, { onDelete: 'set null' }),
  status: workflowStageStatusEnum('status').notNull().default('pending'),
  
  // 进度
  progress: integer('progress').notNull().default(0), // 完成百分比 0-100
  totalTasks: integer('total_tasks').notNull().default(0),
  completedTasks: integer('completed_tasks').notNull().default(0),
  
  // 时间记录
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  dueDate: date('due_date'),
  
  // 备注
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 工作流任务实例表
export const workflowTaskInstances = pgTable('workflow_task_instances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  instanceId: varchar('instance_id', { length: 36 }).notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  templateId: varchar('template_id', { length: 36 }).references(() => workflowTaskTemplates.id, { onDelete: 'set null' }),
  stageId: varchar('stage_id', { length: 36 }).notNull().references(() => workflowStageDefinitions.id, { onDelete: 'cascade' }),
  
  // 任务信息
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  
  // 分配
  assigneeId: varchar('assignee_id', { length: 36 }), // 用户ID
  assigneeRole: userRoleEnum('assignee_role'),
  
  // 状态
  status: workflowStageStatusEnum('status').notNull().default('pending'),
  blockedByDependencies: boolean('blocked_by_dependencies').notNull().default(false), // 是否被依赖阻塞
  
  // 依赖关系
  dependsOn: jsonb('depends_on').$type<string[]>(), // 依赖的任务实例ID列表
  
  // 清单进度
  checklist: jsonb('checklist').$type<{ text: string; completed: boolean }[]>(),
  completedChecklist: integer('completed_checklist').notNull().default(0),
  totalChecklist: integer('total_checklist').notNull().default(0),
  
  // 时间记录
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  dueDate: date('due_date'),
  
  // 备注
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==================== 结课审核相关枚举 ====================

// 结课审核状态枚举
export const settlementStatusEnum = pgEnum('settlement_status', [
  'pending',      // 待提交（课程已完成，但未提交结课）
  'submitted',    // 已提交，待审核
  'approved',     // 审核通过
  'rejected',     // 审核拒绝
  'cancelled',    // 已取消
] as const);

// 结课类型枚举
export const settlementTypeEnum = pgEnum('settlement_type', [
  'single',       // 单次课程结课
  'batch',        // 批量结课
  'course_end',   // 整门课程结课
] as const);

// ==================== 结课审核表 ====================

// 结课审核主表
export const courseSettlements = pgTable('course_settlements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  settlementId: varchar('settlement_id', { length: 50 }).notNull().unique(), // 业务编号
  
  // 关联信息
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id),
  classRecordId: varchar('class_record_id', { length: 36 }).references(() => classRecords.id),
  selectionItemId: varchar('selection_item_id', { length: 36 }).references(() => courseSelectionItems.id),
  
  // 课程信息
  classDate: date('class_date').notNull(),
  weekDay: weekDayEnum('week_day'),
  timeSlot: timeSlotEnum('time_slot'),
  teachingHours: integer('teaching_hours').notNull().default(2), // 实际课时
  
  // 课酬计算
  baseAmount: integer('base_amount').notNull().default(0), // 基础课酬
  bonusAmount: integer('bonus_amount').notNull().default(0), // 奖金
  deductionAmount: integer('deduction_amount').notNull().default(0), // 扣款
  finalAmount: integer('final_amount').notNull().default(0), // 最终金额
  
  // 结课信息
  teachingContent: text('teaching_content'), // 教学内容
  studentPerformance: text('student_performance'), // 学生表现
  homeworkAssigned: text('homework_assigned'), // 作业布置
  nextPlan: text('next_plan'), // 下次计划
  
  // 审核信息
  status: settlementStatusEnum('status').notNull().default('pending'),
  settlementType: settlementTypeEnum('settlement_type').notNull().default('single'),
  
  submittedAt: timestamp('submitted_at'),
  submittedBy: varchar('submitted_by', { length: 36 }),
  
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: varchar('reviewed_by', { length: 36 }),
  reviewNote: text('review_note'),
  
  // 批量结课关联
  batchId: varchar('batch_id', { length: 36 }), // 批量结课ID
  
  // 模板扩展字段
  templateData: jsonb('template_data').$type<Record<string, unknown>>(), // 模板扩展数据
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 批量结课表
export const batchSettlements = pgTable('batch_settlements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  batchId: varchar('batch_id', { length: 50 }).notNull().unique(), // 业务编号
  
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id),
  submittedBy: varchar('submitted_by', { length: 36 }).notNull(),
  
  // 统计信息
  totalRecords: integer('total_records').notNull().default(0),
  totalHours: integer('total_hours').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 课酬汇总表
export const teacherSalarySummary = pgTable('teacher_salary_summary', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id),
  period: varchar('period', { length: 7 }).notNull(), // 格式：2024-01
  
  // 统计数据
  totalClasses: integer('total_classes').notNull().default(0),
  totalHours: integer('total_hours').notNull().default(0),
  baseSalary: integer('base_salary').notNull().default(0),
  bonusAmount: integer('bonus_amount').notNull().default(0),
  deductionAmount: integer('deduction_amount').notNull().default(0),
  finalSalary: integer('final_salary').notNull().default(0),
  
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'), // pending, paid
  
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

// 工作流类型导出
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type NewWorkflowDefinition = typeof workflowDefinitions.$inferInsert;
export type WorkflowStageDefinition = typeof workflowStageDefinitions.$inferSelect;
export type NewWorkflowStageDefinition = typeof workflowStageDefinitions.$inferInsert;
export type WorkflowTaskTemplate = typeof workflowTaskTemplates.$inferSelect;
export type NewWorkflowTaskTemplate = typeof workflowTaskTemplates.$inferInsert;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type NewWorkflowInstance = typeof workflowInstances.$inferInsert;
export type WorkflowTaskInstance = typeof workflowTaskInstances.$inferSelect;
export type NewWorkflowTaskInstance = typeof workflowTaskInstances.$inferInsert;

// 结课审核类型导出
export type CourseSettlement = typeof courseSettlements.$inferSelect;
export type NewCourseSettlement = typeof courseSettlements.$inferInsert;
export type BatchSettlement = typeof batchSettlements.$inferSelect;
export type NewBatchSettlement = typeof batchSettlements.$inferInsert;
export type TeacherSalarySummary = typeof teacherSalarySummary.$inferSelect;
export type NewTeacherSalarySummary = typeof teacherSalarySummary.$inferInsert;

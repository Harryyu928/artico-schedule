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
  '游戏策划',
  '游戏开发',
  '游戏美术（三维）',
  '游戏美术（二维）',
  '动画设计',
  '角色设计',
  '3D建模',
  '技术美术',
  'UI设计',
  '其他',
] as const);

export const applicationCountryEnum = pgEnum('application_country', [
  '美国',
  '英国',
  '加拿大',
  '日本',
  '澳大利亚',
  '欧洲',
  '其他',
] as const);

export const studyStageEnum = pgEnum('study_stage', [
  '基础阶段',
  '项目一',
  '项目二',
  '项目三',
  '项目四',
  '作品集阶段',
  '申请阶段',
  '已毕业',
] as const);

export const courseTypeEnum = pgEnum('course_type', [
  '基础课',
  '项目课',
  '作业辅导课',
  '课后延时辅导',
  '面试辅导',
  '定制课程',
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

// ========== 飞书多维表格对接新增枚举 ==========

// 学员状态枚举（根据实际数据）
export const studentStatusEnum = pgEnum('student_status', [
  '在读',
  '停课',
  '毕业',
  '退学',
] as const);

// 学员类别枚举（根据实际数据）
export const studentCategoryEnum = pgEnum('student_category', [
  'VIP 3',
  'VIP 5',
  'VIP 6',
  'VIP 7',
  'VIP 8',
  'VIP 10',
  'VIP 12',
  'FV-Portfolio作品集（限课时）',
  'FV-Portfolio作品集（不限课时）',
  'FV-Portfolio作品集+文书（限课时）',
  'FV-Portfolio作品集+文书（不限课时）',
  'FV-定制课程',
  '单项目',
  '项目代做',
  '其他',
] as const);

// 课程类别枚举（飞书维度，根据实际数据）
export const courseCategoryFeishuEnum = pgEnum('course_category_feishu', [
  '基础能力提升课',
  '项目一',
  '项目二',
  '项目三',
  '项目四',
  '作业辅导课',
  '课后延时辅导',
  '面试辅导',
  '定制课程',
  'Other Project',
] as const);

// 导师合作性质枚举
export const teacherCooperationStatusEnum = pgEnum('teacher_cooperation_status', [
  '合作中',
  '终止合作',
] as const);

// 导师就职状态枚举（飞书多维表格要求）
export const teacherEmploymentStatusEnum = pgEnum('teacher_employment_status', [
  '在职',
  '离职',
  '休假',
  '试用期',
] as const);

// 导师专业方向枚举（根据实际数据）
export const teacherMajorDirectionEnum = pgEnum('teacher_major_direction', [
  '游戏策划',
  '游戏开发',
  '游戏美术（三维）',
  '游戏美术（二维）',
  '动画设计',
  '角色设计',
  '3D建模',
  '技术美术',
  'UI设计',
  '其他',
] as const);

// 证件类型枚举（根据实际数据）
export const idTypeEnum = pgEnum('id_type', [
  '身份证',
  '护照',
  '港澳通行证',
  '台湾居民来往大陆通行证',
  '其他',
] as const);

// 到课情况枚举（根据实际数据）
export const attendanceStatusFeishuEnum = pgEnum('attendance_status_feishu', [
  '正常',
  '迟到',
  '旷课',
  '请假',
] as const);

// 结课状态枚举
export const settlementStatusFeishuEnum = pgEnum('settlement_status_feishu', [
  '已结',
  '未结',
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

// 顾问级别枚举
export const consultantLevelEnum = pgEnum('consultant_level', [
  'supervisor', // 顾问主管
  'senior',     // 高级顾问
  'standard',   // 普通顾问
  'trainee',    // 见习顾问
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
  consultantId: varchar('consultant_id', { length: 36 }), // 顾问关联（使用字符串存储，避免循环引用）
  
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

// ========== 顾问管理模块 ==========

// 顾问级别枚举（已在上文定义）

// 顾问表
export const consultants = pgTable('consultants', {
  id: varchar('id', { length: 36 }).primaryKey(),
  consultantId: varchar('consultant_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  level: consultantLevelEnum('level').notNull().default('standard'),
  
  // 联系信息
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  wechat: varchar('wechat', { length: 50 }),
  
  // 飞书集成
  feishuUserId: varchar('feishu_user_id', { length: 100 }).unique(),
  feishuRecordId: varchar('feishu_record_id', { length: 100 }),
  
  // 用户账号关联（使用字符串存储，避免循环引用）
  userId: varchar('user_id', { length: 36 }),
  
  // 统计数据
  totalStudents: integer('total_students').notNull().default(0), // 负责学生总数
  activeStudents: integer('active_students').notNull().default(0), // 在读学生数
  
  // 状态
  isActive: boolean('is_active').notNull().default(true),
  
  // 备注
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 顾问类型导出
export type Consultant = typeof consultants.$inferSelect;
export type NewConsultant = typeof consultants.$inferInsert;

// ========== 业务表 ==========

// 学生表
export const students = pgTable('students', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  major: majorDirectionEnum('major').notNull(),
  applicationCountry: applicationCountryEnum('application_country').notNull(),
  currentStage: studyStageEnum('current_stage').notNull(),
  
  // 课时信息（飞书多维表格对接字段）
  totalHours: integer('total_hours').notNull().default(0), // 总课时
  consumedHours: integer('consumed_hours').notNull().default(0), // 已消耗课时
  remainingHours: integer('remaining_hours').notNull().default(0), // 剩余课时
  
  // 联系信息
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  wechat: varchar('wechat', { length: 50 }),
  
  // 负责人
  consultantId: varchar('consultant_id', { length: 36 }), // 负责规划顾问
  primaryTeacherId: varchar('primary_teacher_id', { length: 36 }), // 主导师
  
  // ========== 飞书多维表格对接新增字段 ==========
  
  // 学员状态与类别
  studentStatus: studentStatusEnum('student_status').default('在读'),
  studentCategory: studentCategoryEnum('student_category'), // VIP 5、FV-Portfolio作品集等
  
  // 升学顾问（关联顾问表）
  admissionConsultantId: varchar('admission_consultant_id', { length: 36 }),
  
  // 课程类别（多选，飞书多维表格要求）
  courseCategories: courseCategoryFeishuEnum('course_categories').array(), // 基础能力提升课/项目一/项目二等（多选）
  
  // 导师（多选，飞书多维表格要求）
  teacherIds: varchar('teacher_ids', { length: 36 }).array(), // 负责该学生的导师列表（多选）
  
  // 课时费用
  hourlyRate: integer('hourly_rate'), // 课时单价（分）
  
  // 合同信息
  contractId: varchar('contract_id', { length: 36 }), // 关联合同表
  
  // 飞书多维表格同步
  feishuRecordId: varchar('feishu_record_id', { length: 100 }), // 飞书记录ID
  
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
  
  // ========== 飞书多维表格对接新增字段 ==========
  
  // 合作性质
  cooperationStatus: teacherCooperationStatusEnum('cooperation_status').default('合作中'),
  
  // 就职状态（飞书多维表格要求）
  employmentStatus: teacherEmploymentStatusEnum('employment_status').default('在职'),
  
  // 专业方向（多选，飞书多维表格要求）
  majorDirections: teacherMajorDirectionEnum('major_directions').array(),
  
  // 微信号
  wechatId: varchar('wechat_id', { length: 50 }),
  
  // 授课会议号（飞书会议链接）
  meetingLink: varchar('meeting_link', { length: 500 }),
  
  // 证件信息
  idType: idTypeEnum('id_type'),
  idNumber: varchar('id_number', { length: 50 }),
  
  // 收款信息
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  
  // 合同信息
  contractExpiry: date('contract_expiry'),
  
  // 统计数据（从上课记录表汇总）
  projectCourseCount: integer('project_course_count').default(0), // 项目课数量
  settledCount: integer('settled_count').default(0), // 结课数量
  settlementRate: integer('settlement_rate').default(0), // 结课率（百分比）
  
  // 飞书多维表格同步
  feishuRecordId: varchar('feishu_record_id', { length: 100 }),
  
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
  
  // ========== 飞书多维表格对接新增字段 ==========
  
  // 年份月份（用于统计筛选）
  classYear: integer('class_year'), // 上课年份
  classMonth: integer('class_month'), // 上课月份
  
  // 到课情况（系统内部状态）
  attendanceStatus: classRecordStatusEnum('attendance_status').notNull().default('已排课'),
  
  // 飞书对接 - 到课情况（与飞书多维表格同步）
  attendanceStatusFeishu: attendanceStatusFeishuEnum('attendance_status_feishu').default('正常'),
  
  // 作业评分（百分制）
  homeworkScore: integer('homework_score'), // 作业分数 0-100
  
  // 剩余课时
  remainingHours: integer('remaining_hours'), // 本课程剩余课时
  
  // 结课状态
  isSettled: boolean('is_settled').notNull().default(false), // 是否已结课
  settlementStatus: settlementStatusFeishuEnum('settlement_status_feishu').default('未结'), // 结课状态
  
  // 飞书多维表格同步
  feishuRecordId: varchar('feishu_record_id', { length: 100 }), // 飞书记录ID
  
  // 课程内容
  contentSummary: text('content_summary').notNull(),
  teachingMethod: varchar('teaching_method', { length: 100 }),
  
  // 学生表现
  studentPerformance: text('student_performance'),
  
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

// 工作流推进日志表
export const workflowAdvancementLogs = pgTable('workflow_advancement_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  instanceId: varchar('instance_id', { length: 36 }).notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  
  // 推进信息
  fromStageId: varchar('from_stage_id', { length: 36 }).references(() => workflowStageDefinitions.id, { onDelete: 'set null' }),
  toStageId: varchar('to_stage_id', { length: 36 }).references(() => workflowStageDefinitions.id, { onDelete: 'set null' }),
  
  // 推进类型
  advancementType: varchar('advancement_type', { length: 20 }).notNull(), // auto, manual, rollback
  trigger: varchar('trigger', { length: 50 }).notNull(), // task_completion, manual, scheduled_check, external
  
  // 原因和元数据
  reason: text('reason'),
  metadata: jsonb('metadata').$type<{
    fromStageName?: string;
    toStageName?: string;
    operatorId?: string;
    completionRate?: number;
    affectedTasks?: string[];
  }>(),
  
  // 操作者
  operatorId: varchar('operator_id', { length: 36 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
export type WorkflowAdvancementLog = typeof workflowAdvancementLogs.$inferSelect;
export type NewWorkflowAdvancementLog = typeof workflowAdvancementLogs.$inferInsert;

// 结课审核类型导出
export type CourseSettlement = typeof courseSettlements.$inferSelect;
export type NewCourseSettlement = typeof courseSettlements.$inferInsert;
export type BatchSettlement = typeof batchSettlements.$inferSelect;
export type NewBatchSettlement = typeof batchSettlements.$inferInsert;
export type TeacherSalarySummary = typeof teacherSalarySummary.$inferSelect;
export type NewTeacherSalarySummary = typeof teacherSalarySummary.$inferInsert;

// ==================== 操作日志表 ====================

// 操作类型枚举
export const operationTypeEnum = pgEnum('operation_type', [
  'create',    // 创建
  'update',    // 更新
  'delete',    // 删除
  'view',      // 查看
  'export',    // 导出
  'import',    // 导入
  'login',     // 登录
  'logout',    // 登出
  'approve',   // 审批
  'reject',    // 拒绝
] as const);

// 操作日志表
export const operationLogs = pgTable('operation_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 操作人信息
  operatorId: varchar('operator_id', { length: 36 }).notNull(),
  operatorName: varchar('operator_name', { length: 100 }).notNull(),
  operatorRole: userRoleEnum('operator_role').notNull(),
  
  // 操作信息
  operationType: operationTypeEnum('operation_type').notNull(),
  module: varchar('module', { length: 50 }).notNull(), // 模块名称：student, teacher, course, schedule, etc.
  action: varchar('action', { length: 100 }).notNull(), // 具体操作：create_student, update_schedule, etc.
  description: text('description').notNull(), // 操作描述
  
  // 操作对象
  entityType: varchar('entity_type', { length: 50 }), // 实体类型：student, teacher, etc.
  entityId: varchar('entity_id', { length: 36 }), // 实体ID
  entityName: varchar('entity_name', { length: 200 }), // 实体名称（用于显示）
  
  // 变更详情
  oldValue: jsonb('old_value').$type<Record<string, unknown>>(), // 变更前的值
  newValue: jsonb('new_value').$type<Record<string, unknown>>(), // 变更后的值
  
  // 请求信息
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 500 }),
  requestUrl: varchar('request_url', { length: 500 }),
  requestMethod: varchar('request_method', { length: 10 }),
  
  // 结果
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 操作日志类型导出
export type OperationLog = typeof operationLogs.$inferSelect;
export type NewOperationLog = typeof operationLogs.$inferInsert;

// ==================== 临时时间调整相关表 ====================

// 时间调整类型枚举
export const timeBlockTypeEnum = pgEnum('time_block_type', [
  'temporary_unavailable', // 临时不可用
  'meeting',               // 会议
  'leave',                 // 请假
  'training',              // 培训
  'other',                 // 其他
] as const);

// 时间调整状态枚举
export const timeBlockStatusEnum = pgEnum('time_block_status', [
  'pending',    // 待确认
  'confirmed',  // 已确认
  'cancelled',  // 已取消
] as const);

// 课程取消原因枚举
export const cancellationReasonEnum = pgEnum('cancellation_reason', [
  'teacher_emergency',     // 导师紧急情况
  'teacher_leave',         // 导师请假
  'student_request',       // 学生请求
  'student_emergency',     // 学生紧急情况
  'course_conflict',       // 课程冲突
  'other',                 // 其他
] as const);

// 导师不可排课时间段表
export const teacherTimeBlocks = pgTable('teacher_time_blocks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  
  // 时间信息
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  startTime: varchar('start_time', { length: 10 }), // 具体时间段，如 "10:00"
  endTime: varchar('end_time', { length: 10 }),     // 如 "12:00"
  isAllDay: boolean('is_all_day').notNull().default(true),
  
  // 类型与原因
  blockType: timeBlockTypeEnum('block_type').notNull().default('temporary_unavailable'),
  reason: text('reason').notNull(),
  
  // 状态
  status: timeBlockStatusEnum('status').notNull().default('confirmed'),
  
  // 关联的取消课程
  affectedSchedules: jsonb('affected_schedules').$type<string[]>(), // 受影响的排课ID列表
  
  // 通知状态
  notificationSent: boolean('notification_sent').notNull().default(false),
  notifiedTo: jsonb('notified_to').$type<string[]>(), // 通知接收人列表
  
  // 审批信息（如果是请假）
  approvedBy: varchar('approved_by', { length: 36 }),
  approvedAt: timestamp('approved_at'),
  approvalNote: text('approval_note'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 课程取消记录表
export const scheduleCancellations = pgTable('schedule_cancellations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  cancellationId: varchar('cancellation_id', { length: 50 }).notNull().unique(), // 业务编号
  
  // 关联信息
  scheduleId: varchar('schedule_id', { length: 36 }).notNull().references(() => scheduleResults.id, { onDelete: 'cascade' }),
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id),
  courseId: varchar('course_id', { length: 36 }).notNull().references(() => courses.id),
  
  // 原课程信息快照
  originalDate: date('original_date').notNull(),
  originalTimeSlot: varchar('original_time_slot', { length: 10 }).notNull(),
  originalHours: integer('original_hours').notNull().default(2),
  
  // 取消信息
  cancellationReason: cancellationReasonEnum('cancellation_reason').notNull(),
  cancellationDetail: text('cancellation_detail'), // 详细说明
  cancelledBy: varchar('cancelled_by', { length: 36 }).notNull(), // 取消操作人
  cancelledAt: timestamp('cancelled_at').notNull().defaultNow(),
  
  // 补课安排
  makeupRequired: boolean('makeup_required').notNull().default(true), // 是否需要补课
  makeupScheduled: boolean('makeup_scheduled').notNull().default(false), // 是否已安排补课
  makeupScheduleId: varchar('makeup_schedule_id', { length: 36 }), // 补课排课ID
  
  // 通知状态
  studentNotified: boolean('student_notified').notNull().default(false),
  consultantNotified: boolean('consultant_notified').notNull().default(false),
  adminNotified: boolean('admin_notified').notNull().default(false),
  
  // 关联的时间调整
  timeBlockId: varchar('time_block_id', { length: 36 }).references(() => teacherTimeBlocks.id),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 通知类型枚举
export const notificationTypeEnum = pgEnum('notification_type', [
  'schedule_cancelled',     // 课程取消
  'schedule_rescheduled',   // 课程改期
  'time_block_created',     // 时间调整创建
  'makeup_required',        // 需要补课
  'leave_approved',         // 请假批准
  'leave_rejected',         // 请假拒绝
  'reminder',               // 提醒
  'workflow_advanced',      // 工作流推进
  'workflow_completed',     // 工作流完成
  'task_assigned',          // 任务分配
  'task_completed',         // 任务完成
] as const);

// 通知渠道枚举
export const notificationChannelEnum = pgEnum('notification_channel', [
  'system',  // 系统内通知
  'feishu',  // 飞书
  'email',   // 邮件
  'sms',     // 短信
] as const);

// 通知状态枚举
export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',   // 待发送
  'sent',      // 已发送
  'delivered', // 已送达
  'failed',    // 发送失败
  'read',      // 已读
] as const);

// 通知表
export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // 通知类型
  type: notificationTypeEnum('type').notNull(),
  
  // 接收人
  recipientId: varchar('recipient_id', { length: 36 }).notNull(),
  recipientRole: userRoleEnum('recipient_role').notNull(),
  
  // 通知内容
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  
  // 关联实体
  entityType: varchar('entity_type', { length: 50 }), // schedule, time_block, etc.
  entityId: varchar('entity_id', { length: 36 }),
  
  // 发送渠道
  channels: jsonb('channels').$type<string[]>().notNull().default(['system']), // 发送渠道列表
  
  // 状态
  status: notificationStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  
  // 错误信息
  errorMessage: text('error_message'),
  
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 类型导出
export type TeacherTimeBlock = typeof teacherTimeBlocks.$inferSelect;
export type NewTeacherTimeBlock = typeof teacherTimeBlocks.$inferInsert;
export type ScheduleCancellation = typeof scheduleCancellations.$inferSelect;
export type NewScheduleCancellation = typeof scheduleCancellations.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

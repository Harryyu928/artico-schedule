// ARTDiCO 排课系统类型定义

// 枚举类型
export enum MajorDirection {
  GAME_DESIGN = '游戏设计',
  GAME_ART = '游戏美术',
  CHARACTER_DESIGN = '角色设计',
  THREE_D_GAME_ART = '3D游戏美术',
  ANIMATION = '动画',
}

export enum ApplicationCountry {
  USA = '美国',
  UK = '英国',
  CANADA = '加拿大',
  JAPAN = '日本',
}

export enum StudyStage {
  FOUNDATION = '基础阶段',
  PROJECT = '项目阶段',
  PORTFOLIO = '作品集打磨',
}

export enum CourseType {
  FOUNDATION = '基础课',
  PROJECT = '项目课',
}

export enum CourseCategory {
  // 基础课程
  F_GD = 'F-GD', // 游戏设计基础
  F_TA = 'F-TA', // 技术美术基础
  F_GA = 'F-GA', // 游戏美术基础
  F_3D = 'F-3D', // 3D制作基础
  F_AN = 'F-AN', // 动画基础
  // 项目课程
  P_GD = 'P-GD', // 游戏设计项目
  P_AN = 'P-AN', // 动画项目
  P_GA = 'P-GA', // 游戏美术项目
  P_CA = 'P-CA', // 角色设计项目
  P_3DGA = 'P-3DGA', // 3D游戏美术项目
}

export enum CourseDuration {
  FOUR_WEEKS = '4周',
  FIVE_WEEKS = '5周',
  ONE_MONTH = '1个月',
  TWO_MONTHS = '2个月',
  THREE_MONTHS = '3个月',
}

export enum CourseStage {
  FOUNDATION = '基础',
  PROJECT = '项目',
  PORTFOLIO = '作品集',
}

export enum UserRole {
  STUDENT = '学生',
  TEACHER = '导师',
  ADMIN = '管理员',
}

export enum WeekDay {
  MONDAY = '周一',
  TUESDAY = '周二',
  WEDNESDAY = '周三',
  THURSDAY = '周四',
  FRIDAY = '周五',
  SATURDAY = '周六',
  SUNDAY = '周日',
}

export enum TimeSlot {
  SLOT_10_00 = '10:00',
  SLOT_13_00 = '13:00',
  SLOT_15_00 = '15:00',
  SLOT_18_00 = '18:00',
  SLOT_20_00 = '20:00',
}

export enum ScheduleStatus {
  PENDING = '待确认',
  CONFIRMED = '已确认',
  COMPLETED = '已完成',
  CANCELLED = '取消',
}

// 数据库表类型

// 学生表
export interface Student {
  id: string;
  student_id: string; // 学号
  name: string;
  major: MajorDirection;
  application_country: ApplicationCountry;
  current_stage: StudyStage;
  total_hours: number;
  used_hours: number;
  remaining_hours: number; // 计算字段
  created_at: Date;
  updated_at: Date;
}

// 课程库
export interface Course {
  id: string;
  course_id: string; // 课程编号
  name: string;
  type: CourseType;
  category: CourseCategory;
  duration: CourseDuration;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// 学生选课表
export interface StudentCourse {
  id: string;
  student_id: string;
  course_id: string;
  course_stage: CourseStage;
  total_hours: number;
  scheduled_hours: number;
  remaining_hours: number; // 计算字段
  status: ScheduleStatus;
  created_at: Date;
  updated_at: Date;
}

// 导师表
export interface Teacher {
  id: string;
  teacher_id: string; // 导师编号
  name: string;
  teachable_courses: CourseCategory[]; // 可授课程
  max_weekly_hours: number;
  current_hours: number;
  remaining_hours: number; // 计算字段
  created_at: Date;
  updated_at: Date;
}

// 时间表（学生+导师）
export interface TimeAvailability {
  id: string;
  user_id: string;
  user_role: UserRole;
  name: string;
  week_day: WeekDay;
  time_slot: TimeSlot;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

// 时间预留类型
export type TimeReservationType = '空闲' | '顾问指导' | '固定课程' | '不可用';

// 带预留类型的时间表
export interface TimeAvailabilityWithReservation extends TimeAvailability {
  reservation_type: TimeReservationType;
  consultant_id?: string | null; // 如果是顾问指导时间，关联的规划顾问
  notes?: string | null;
}

// 排课结果表
export interface ScheduleResult {
  id: string;
  scheduleId: string; // 排课编号
  studentId: string;
  teacherId: string;
  courseId: string;
  studentCourseId?: string | null;
  date: Date | string;
  weekDay: WeekDay | string;
  timeSlot: TimeSlot | string;
  hours: number;
  status: ScheduleStatus | string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 关联类型（用于前端展示）
export interface ScheduleResultWithDetails extends ScheduleResult {
  student: Student;
  teacher: Teacher;
  course: Course;
}

// API请求/响应类型

// 学生创建请求
export interface CreateStudentRequest {
  name: string;
  major: MajorDirection;
  application_country: ApplicationCountry;
  current_stage: StudyStage;
  total_hours: number;
}

// 导师创建请求
export interface CreateTeacherRequest {
  name: string;
  teachable_courses: CourseCategory[];
  max_weekly_hours: number;
}

// 课程创建请求
export interface CreateCourseRequest {
  course_id: string;
  name: string;
  type: CourseType;
  category: CourseCategory;
  duration: CourseDuration;
  description?: string;
}

// 学生选课请求
export interface StudentSelectCourseRequest {
  student_id: string;
  course_id: string;
  course_stage: CourseStage;
  total_hours: number;
}

// 时间可用性设置请求
export interface SetTimeAvailabilityRequest {
  user_id: string;
  user_role: UserRole;
  name: string;
  week_day: WeekDay;
  time_slot: TimeSlot;
  is_available: boolean;
}

// 批量设置时间可用性请求
export interface BatchSetTimeAvailabilityRequest {
  user_id: string;
  user_role: UserRole;
  name: string;
  availabilities: Array<{
    week_day: WeekDay;
    time_slot: TimeSlot;
    is_available: boolean;
  }>;
}

// 自动排课请求
export interface AutoScheduleRequest {
  student_ids?: string[]; // 可选，不传则排所有学生
  teacher_ids?: string[]; // 可选，不传则使用所有导师
  priority_rule?: 'remaining_hours' | 'course_stage' | 'student_stage'; // 优先规则
}

// 排课结果
export interface ScheduleResultResponse {
  success: boolean;
  scheduled_count: number;
  failed_count: number;
  results: ScheduleResultWithDetails[];
  conflicts: Array<{
    student_id: string;
    course_id: string;
    reason: string;
  }>;
}

// 统计数据
export interface StatisticsData {
  total_students: number;
  total_teachers: number;
  total_courses: number;
  scheduled_courses: number;
  pending_schedules: number;
  this_week_hours: number;
}

// 飞书集成相关类型（预留）

// 飞书用户信息
export interface FeishuUser {
  open_id: string;
  union_id: string;
  name: string;
  en_name?: string;
  avatar_url?: string;
  email?: string;
  mobile?: string;
}

// 飞书日历事件
export interface FeishuCalendarEvent {
  summary: string;
  description?: string;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  attendees: Array<{
    open_id?: string;
    email?: string;
  }>;
  reminders?: Array<{
    minutes: number;
  }>;
}

// 飞书消息
export interface FeishuMessage {
  receive_id: string;
  receive_id_type: 'open_id' | 'user_id' | 'union_id' | 'email';
  msg_type: 'text' | 'post' | 'interactive';
  content: string | Record<string, unknown>;
}

// ========== 新增：选课单和上课记录相关类型 ==========

// 选课单状态
export enum SelectionFormStatus {
  DRAFT = '草稿',
  CONFIRMED = '已确认',
  IN_PROGRESS = '执行中',
  COMPLETED = '已完成',
  CANCELLED = '已取消',
}

// 选课单明细状态
export enum SelectionItemStatus {
  PENDING = '待排课',
  SCHEDULING = '排课中',
  IN_PROGRESS = '上课中',
  COMPLETED = '已完成',
  SUSPENDED = '已暂停',
}

// 上课记录状态
export enum ClassRecordStatus {
  SCHEDULED = '已排课',
  COMPLETED = '已完成',
  CANCELLED = '已取消',
  ABSENT = '学生缺席',
  MAKEUP = '补课',
}

// 项目阶段（用于项目课）
export enum ProjectPhase {
  CONCEPT = 'Concept',
  MODELING = 'Modeling',
  TEXTURING = 'Texturing',
  LIGHTING = 'Lighting',
  RENDER = 'Render',
  PORTFOLIO = 'Portfolio',
}

// 申请院校表
export interface ApplicationSchool {
  id: string;
  student_id: string;
  school_name: string;
  country: ApplicationCountry;
  major: string;
  degree: '本科' | '硕士' | '博士';
  priority: number; // 优先级，1为最高
  deadline?: Date;
  status: '准备中' | '已申请' | '已录取' | '已拒绝';
  created_at: Date;
  updated_at: Date;
}

// 选课单主表
export interface CourseSelectionForm {
  id: string;
  form_id: string; // 选课单编号
  student_id: string;
  consultation_teacher_id?: string; // 选课指导导师ID
  status: SelectionFormStatus;
  
  // 规划信息
  total_planned_hours: number; // 总计划课时
  estimated_start_date: Date; // 预计开始日期
  estimated_end_date: Date; // 预计完成日期
  actual_start_date?: Date; // 实际开始日期
  actual_end_date?: Date; // 实际完成日期
  
  // 进度统计
  total_courses: number; // 总课程数
  completed_courses: number; // 已完成课程数
  total_hours: number; // 总课时
  completed_hours: number; // 已完成课时
  
  // 备注
  notes?: string;
  goals?: string; // 学习目标
  
  created_at: Date;
  updated_at: Date;
}

// 选课单明细表
export interface CourseSelectionItem {
  id: string;
  form_id: string; // 选课单ID
  course_id: string;
  
  // 课程信息
  course_type: CourseType; // 基础课/项目课
  course_stage: CourseStage; // 基础/项目/作品集
  
  // 课时规划
  planned_hours: number; // 计划课时
  scheduled_hours: number; // 已排课时
  completed_hours: number; // 已完成课时
  
  // 进度管理
  status: SelectionItemStatus;
  priority: number; // 优先级，1为最高
  
  // 时间规划
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  
  // 项目课特有字段
  current_phase?: ProjectPhase; // 当前阶段（项目课用）
  phase_progress?: Record<ProjectPhase, number>; // 各阶段进度（百分比）
  
  // 备注
  notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

// 上课记录表
export interface ClassRecord {
  id: string;
  record_id: string; // 记录编号
  schedule_id?: string; // 关联排课ID（可选）
  
  // 基本信息
  student_id: string;
  teacher_id: string;
  course_id: string;
  selection_item_id?: string; // 关联选课单明细
  
  // 上课信息
  class_date: Date; // 上课日期
  week_day: WeekDay;
  start_time: TimeSlot;
  end_time?: TimeSlot; // 结束时间
  actual_duration: number; // 实际上课时长（分钟）
  
  // 课程内容
  content_summary: string; // 课程内容概述
  teaching_method?: string; // 教学方式
  
  // 学生表现
  student_performance?: string; // 学生表现评价
  attendance_status: ClassRecordStatus; // 出勤状态
  
  // 作业与反馈
  homework_assigned?: string; // 布置的作业
  homework_deadline?: Date; // 作业截止日期
  next_class_plan?: string; // 下节课计划
  teacher_feedback?: string; // 导师反馈
  student_feedback?: string; // 学生反馈
  
  // 项目课特有
  project_phase?: ProjectPhase; // 当前项目阶段
  phase_content?: string; // 阶段内容
  
  // 附件
  attachments?: string[]; // 附件URL列表
  
  created_by: string; // 记录创建者ID
  created_at: Date;
  updated_at: Date;
}

// 关联类型（用于前端展示）
export interface ClassRecordWithDetails extends ClassRecord {
  student: Student;
  teacher: Teacher;
  course: Course;
  selectionItem?: CourseSelectionItem;
}

export interface CourseSelectionFormWithDetails extends CourseSelectionForm {
  student: Student;
  consultationTeacher?: Teacher;
  items: CourseSelectionItemWithDetails[];
  applicationSchools: ApplicationSchool[];
}

export interface CourseSelectionItemWithDetails extends CourseSelectionItem {
  course: Course;
  form: CourseSelectionForm;
}

// ========== API请求类型 ==========

// 创建申请院校请求
export interface CreateApplicationSchoolRequest {
  student_id: string;
  school_name: string;
  country: ApplicationCountry;
  major: string;
  degree: '本科' | '硕士' | '博士';
  priority?: number;
  deadline?: Date;
}

// 创建选课单请求
export interface CreateSelectionFormRequest {
  student_id: string;
  consultation_teacher_id?: string;
  estimated_start_date: Date;
  estimated_end_date: Date;
  notes?: string;
  goals?: string;
}

// 添加选课单明细请求
export interface AddSelectionItemRequest {
  form_id: string;
  course_id: string;
  course_type: CourseType;
  course_stage: CourseStage;
  planned_hours: number;
  priority?: number;
  planned_start_date?: Date;
  planned_end_date?: Date;
  notes?: string;
}

// 创建上课记录请求
export interface CreateClassRecordRequest {
  schedule_id?: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  selection_item_id?: string;
  class_date: Date | string;
  week_day?: WeekDay; // 可选，如果不提供会从class_date计算
  start_time: TimeSlot;
  actual_duration: number;
  content_summary: string;
  attendance_status: ClassRecordStatus;
  student_performance?: string;
  homework_assigned?: string;
  homework_deadline?: Date | string;
  next_class_plan?: string;
  teacher_feedback?: string;
  project_phase?: ProjectPhase;
  phase_content?: string;
  attachments?: string[];
}

// 批量创建上课记录（基于排课）
export interface BatchCreateClassRecordsRequest {
  schedule_ids: string[];
  default_content?: string;
}

// 选课单进度更新请求
export interface UpdateSelectionProgressRequest {
  item_id: string;
  completed_hours: number;
  status?: SelectionItemStatus;
  current_phase?: ProjectPhase;
  notes?: string;
}

// 课程进度统计
export interface CourseProgressStats {
  total_students: number;
  active_students: number;
  total_forms: number;
  in_progress_forms: number;
  total_classes_this_week: number;
  total_hours_this_week: number;
  average_completion_rate: number;
}

// ========== 时间预留相关类型 ==========

// 创建时间预留请求
export interface CreateTimeReservationRequest {
  student_id: string;
  consultant_id?: string;
  week_day: WeekDay;
  time_slot: TimeSlot;
  reservation_type?: TimeReservationType;
  notes?: string;
}

// 批量创建时间预留请求
export interface BatchCreateTimeReservationRequest {
  student_id: string;
  consultant_id?: string;
  reservations: Array<{
    week_day: WeekDay;
    time_slot: TimeSlot;
  }>;
  reservation_type?: TimeReservationType;
  notes?: string;
}

// 学生时间表视图（用于显示预留时间）
export interface StudentTimeTableView {
  student_id: string;
  student_name: string;
  consultant_id?: string;
  consultant_name?: string;
  time_grid: Array<{
    week_day: WeekDay;
    time_slot: TimeSlot;
    reservation_type: TimeReservationType;
    is_available: boolean;
    notes?: string;
  }>;
}


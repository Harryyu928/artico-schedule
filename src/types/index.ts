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

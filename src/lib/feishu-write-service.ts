/**
 * 飞书多维表格写入服务
 * 
 * 所有数据操作都直接写入飞书，本地数据库通过同步更新
 */

import { getBitableService, BitableRecord } from './feishu-bitable-service';

// ==================== 导师操作 ====================

export interface CreateTeacherData {
  name: string;
  type?: '全职' | '兼职';
  cooperationStatus?: '合作中' | '终止合作';
  employmentStatus?: '在职' | '离职' | '休假' | '试用期';
  majorDirections?: string[];
  meetingLink?: string;
  phone?: string;
  email?: string;
}

export interface UpdateTeacherData {
  name?: string;
  type?: '全职' | '兼职';
  cooperationStatus?: '合作中' | '终止合作';
  employmentStatus?: '在职' | '离职' | '休假' | '试用期';
  majorDirections?: string[];
  meetingLink?: string;
  phone?: string;
  email?: string;
}

/**
 * 创建导师
 */
export async function createTeacherInFeishu(data: CreateTeacherData): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  // 生成导师工号
  const teacherId = `T${Date.now().toString().slice(-6)}`;

  const fields: Record<string, unknown> = {
    '导师工号': teacherId,
    '姓名': data.name,
    '导师类型': data.type || '兼职',
    '合作状态': data.cooperationStatus || '合作中',
    '就职状态': data.employmentStatus || '在职',
    '专业方向': data.majorDirections || [],
  };

  if (data.meetingLink) fields['会议链接'] = data.meetingLink;
  if (data.phone) fields['联系电话'] = data.phone;
  if (data.email) fields['电子邮箱'] = data.email;

  console.log('[Feishu] 创建导师:', data.name);
  return service.createRecord(service.tableIds.teachers, fields);
}

/**
 * 更新导师
 */
export async function updateTeacherInFeishu(
  recordId: string, 
  data: UpdateTeacherData
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  const fields: Record<string, unknown> = {};

  if (data.name) fields['姓名'] = data.name;
  if (data.type) fields['导师类型'] = data.type;
  if (data.cooperationStatus) fields['合作状态'] = data.cooperationStatus;
  if (data.employmentStatus) fields['就职状态'] = data.employmentStatus;
  if (data.majorDirections) fields['专业方向'] = data.majorDirections;
  if (data.meetingLink) fields['会议链接'] = data.meetingLink;
  if (data.phone) fields['联系电话'] = data.phone;
  if (data.email) fields['电子邮箱'] = data.email;

  console.log('[Feishu] 更新导师:', recordId);
  return service.updateRecord(service.tableIds.teachers, recordId, fields);
}

/**
 * 删除导师
 */
export async function deleteTeacherInFeishu(recordId: string): Promise<boolean> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Feishu] 删除导师:', recordId);
  return service.deleteRecord(service.tableIds.teachers, recordId);
}

// ==================== 学生操作 ====================

export interface CreateStudentData {
  name: string;
  major?: string;
  applicationCountry?: string;
  currentStage?: string;
  totalHours?: number;
  phone?: string;
  email?: string;
}

export interface UpdateStudentData {
  name?: string;
  major?: string;
  applicationCountry?: string;
  currentStage?: string;
  totalHours?: number;
  consumedHours?: number;
  remainingHours?: number;
  phone?: string;
  email?: string;
}

/**
 * 创建学生
 */
export async function createStudentInFeishu(data: CreateStudentData): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  // 生成学号
  const studentId = `STD${Date.now().toString().slice(-6)}`;

  const fields: Record<string, unknown> = {
    '学号': studentId,
    '姓名': data.name,
    '申请专业方向': data.major || '其他',
    '申请国家': data.applicationCountry || '其他',
    '当前阶段': data.currentStage || '基础阶段',
    '总课时': data.totalHours || 0,
    '已消耗课时': 0,
    '剩余课时': data.totalHours || 0,
  };

  if (data.phone) fields['联系电话'] = data.phone;
  if (data.email) fields['电子邮箱'] = data.email;

  console.log('[Feishu] 创建学生:', data.name);
  return service.createRecord(service.tableIds.students, fields);
}

/**
 * 更新学生
 */
export async function updateStudentInFeishu(
  recordId: string,
  data: UpdateStudentData
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  const fields: Record<string, unknown> = {};

  if (data.name) fields['姓名'] = data.name;
  if (data.major) fields['申请专业方向'] = data.major;
  if (data.applicationCountry) fields['申请国家'] = data.applicationCountry;
  if (data.currentStage) fields['当前阶段'] = data.currentStage;
  if (data.totalHours !== undefined) fields['总课时'] = data.totalHours;
  if (data.consumedHours !== undefined) fields['已消耗课时'] = data.consumedHours;
  if (data.remainingHours !== undefined) fields['剩余课时'] = data.remainingHours;
  if (data.phone) fields['联系电话'] = data.phone;
  if (data.email) fields['电子邮箱'] = data.email;

  console.log('[Feishu] 更新学生:', recordId);
  return service.updateRecord(service.tableIds.students, recordId, fields);
}

/**
 * 删除学生
 */
export async function deleteStudentInFeishu(recordId: string): Promise<boolean> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Feishu] 删除学生:', recordId);
  return service.deleteRecord(service.tableIds.students, recordId);
}

// ==================== 上课记录操作 ====================

export interface CreateClassRecordData {
  studentName: string;
  teacherName: string;
  courseCategory?: string;
  classDate: Date;
  duration?: number;
  contentSummary?: string;
  homework?: string;
}

export interface UpdateClassRecordData {
  courseCategory?: string;
  classDate?: Date;
  duration?: number;
  contentSummary?: string;
  homework?: string;
  homeworkScore?: number;
  attendanceStatus?: string;
}

/**
 * 创建上课记录
 */
export async function createClassRecordInFeishu(data: CreateClassRecordData): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  const recordId = `R${Date.now()}`;
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const fields: Record<string, unknown> = {
    '记录编号': recordId,
    '学生': data.studentName,
    '导师': data.teacherName,
    '课程类别': data.courseCategory || '基础课',
    '上课日期': data.classDate.getTime(),
    '年份': data.classDate.getFullYear(),
    '月份': data.classDate.getMonth() + 1,
    '星期': weekDays[data.classDate.getDay()],
    '开始时间': '10:00',
    '实际时长(分钟)': data.duration || 120,
    '授课内容摘要': data.contentSummary || '',
    '到课情况': '正常',
    '是否已结课': false,
    '结课状态': '未结',
  };

  if (data.homework) fields['课后作业'] = data.homework;

  console.log('[Feishu] 创建上课记录:', recordId);
  return service.createRecord(service.tableIds.classRecords, fields);
}

/**
 * 更新上课记录
 */
export async function updateClassRecordInFeishu(
  recordId: string,
  data: UpdateClassRecordData
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  const fields: Record<string, unknown> = {};

  if (data.courseCategory) fields['课程类别'] = data.courseCategory;
  if (data.classDate) {
    fields['上课日期'] = data.classDate.getTime();
    fields['年份'] = data.classDate.getFullYear();
    fields['月份'] = data.classDate.getMonth() + 1;
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    fields['星期'] = weekDays[data.classDate.getDay()];
  }
  if (data.duration !== undefined) fields['实际时长(分钟)'] = data.duration;
  if (data.contentSummary) fields['授课内容摘要'] = data.contentSummary;
  if (data.homework) fields['课后作业'] = data.homework;
  if (data.homeworkScore !== undefined) fields['作业分数'] = data.homeworkScore;
  if (data.attendanceStatus) fields['到课情况'] = data.attendanceStatus;

  console.log('[Feishu] 更新上课记录:', recordId);
  return service.updateRecord(service.tableIds.classRecords, recordId, fields);
}

/**
 * 删除上课记录
 */
export async function deleteClassRecordInFeishu(recordId: string): Promise<boolean> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Feishu] 删除上课记录:', recordId);
  return service.deleteRecord(service.tableIds.classRecords, recordId);
}

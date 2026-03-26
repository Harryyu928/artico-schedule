/**
 * 飞书多维表格到本地数据库同步服务
 */

import { getBitableService } from './feishu-bitable-service';
import { db } from '@/db';
import { students, teachers, classRecords, scheduleResults } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 同步状态
export interface SyncStatus {
  teachers: { total: number; synced: number; failed: number };
  students: { total: number; synced: number; failed: number };
  classRecords: { total: number; synced: number; failed: number };
  schedules: { total: number; synced: number; failed: number };
}

/**
 * 同步导师数据
 */
export async function syncTeachersFromFeishu(): Promise<{ total: number; synced: number; failed: number }> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Sync] 开始同步导师数据...');

  // 从飞书获取所有导师记录
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const result = await service.listRecords(service.tableIds.teachers, {
      pageSize: 100,
      pageToken,
    });
    
    allRecords = allRecords.concat(result.records);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  console.log(`[Sync] 从飞书获取 ${allRecords.length} 条导师记录`);

  let synced = 0;
  let failed = 0;

  for (const record of allRecords) {
    try {
      const fields = record.fields;
      const name = fields['姓名'] as string;
      
      if (!name || name === '测试导师') {
        failed++;
        continue;
      }

      // 检查是否已存在（通过名字或飞书记录ID）
      const existing = await db.select().from(teachers)
        .where(eq(teachers.feishuRecordId, record.record_id))
        .limit(1);
      
      const teacherData = {
        name,
        teacherId: existing[0]?.teacherId || `T${String(synced + 1).padStart(4, '0')}`,
        teacherType: mapTeacherType(fields['导师类型'] as string),
        cooperationStatus: mapTeacherCooperationStatus(fields['合作状态'] as string),
        employmentStatus: mapTeacherEmploymentStatus(fields['就职状态'] as string),
        majorDirections: mapMajorDirections(parseArrayField(fields['专业方向'])),
        meetingLink: fields['会议链接'] as string || null,
        feishuRecordId: record.record_id,
        updatedAt: new Date(),
      };
      
      if (existing.length > 0) {
        // 更新现有记录
        await db.update(teachers)
          .set(teacherData)
          .where(eq(teachers.id, existing[0].id));
      } else {
        // 创建新记录
        await db.insert(teachers).values({
          id: uuidv4(),
          ...teacherData,
          teachableCourses: [],
          createdAt: new Date(),
        });
      }
      
      synced++;
    } catch (error) {
      console.error(`[Sync] 同步导师失败:`, error);
      failed++;
    }
  }

  console.log(`[Sync] 导师同步完成: ${synced} 成功, ${failed} 失败`);
  return { total: allRecords.length, synced, failed };
}

/**
 * 同步学生数据
 */
export async function syncStudentsFromFeishu(): Promise<{ total: number; synced: number; failed: number }> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Sync] 开始同步学生数据...');

  // 从飞书获取所有学生记录
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const result = await service.listRecords(service.tableIds.students, {
      pageSize: 100,
      pageToken,
    });
    
    allRecords = allRecords.concat(result.records);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  console.log(`[Sync] 从飞书获取 ${allRecords.length} 条学生记录`);

  let synced = 0;
  let failed = 0;

  for (const record of allRecords) {
    try {
      const fields = record.fields;
      const name = fields['姓名'] as string;
      
      if (!name) {
        failed++;
        continue;
      }

      // 检查是否已存在
      const existing = await db.select().from(students)
        .where(eq(students.feishuRecordId, record.record_id))
        .limit(1);
      
      const studentData = {
        name,
        studentId: existing[0]?.studentId || await generateStudentId(),
        major: mapMajor(fields['申请专业方向'] as string) as any,
        applicationCountry: mapCountry(fields['申请国家'] as string) as any,
        currentStage: mapStage(fields['当前阶段'] as string) as any,
        totalHours: Number(fields['总课时']) || 0,
        consumedHours: Number(fields['已消耗课时']) || 0,
        remainingHours: Number(fields['剩余课时']) || 0,
        studentStatus: mapStudentStatus(fields['学员状态'] as string) as any,
        studentCategory: (fields['学员类别'] as string) || null,
        feishuRecordId: record.record_id,
        updatedAt: new Date(),
      };
      
      if (existing.length > 0) {
        // 更新现有记录
        await db.update(students)
          .set(studentData)
          .where(eq(students.id, existing[0].id));
      } else {
        // 创建新记录
        await db.insert(students).values({
          id: uuidv4(),
          ...studentData,
          createdAt: new Date(),
        });
      }
      
      synced++;
    } catch (error) {
      console.error(`[Sync] 同步学生失败:`, error);
      failed++;
    }
  }

  console.log(`[Sync] 学生同步完成: ${synced} 成功, ${failed} 失败`);
  return { total: allRecords.length, synced, failed };
}

/**
 * 同步上课记录数据
 */
export async function syncClassRecordsFromFeishu(): Promise<{ total: number; synced: number; failed: number }> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  console.log('[Sync] 开始同步上课记录数据...');

  // 从飞书获取所有上课记录
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const result = await service.listRecords(service.tableIds.classRecords, {
      pageSize: 500,
      pageToken,
    });
    
    allRecords = allRecords.concat(result.records);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  console.log(`[Sync] 从飞书获取 ${allRecords.length} 条上课记录`);

  // 获取学生和导师映射
  const allStudents = await db.select().from(students);
  const allTeachers = await db.select().from(teachers);
  
  const studentMap = new Map(allStudents.map(s => [s.name, s]));
  const teacherMap = new Map(allTeachers.map(t => [t.name, t]));

  let synced = 0;
  let failed = 0;

  for (const record of allRecords) {
    try {
      const fields = record.fields;
      const studentName = fields['学生'] as string;
      const teacherName = fields['导师'] as string;
      
      if (!studentName || !teacherName) {
        failed++;
        continue;
      }

      // 检查是否已存在（通过记录编号）
      const recordNo = fields['记录编号'] as string;
      
      if (recordNo) {
        const existing = await db.select().from(classRecords)
          .where(eq(classRecords.recordId, recordNo))
          .limit(1);
        
        if (existing.length > 0) {
          synced++;
          continue; // 已存在，跳过
        }
      }

      // 查找学生和导师
      const student = studentMap.get(studentName);
      const teacher = teacherMap.get(teacherName);

      // 解析日期
      const classDate = fields['上课日期'] ? parseFeishuDate(fields['上课日期']) : null;

      // 创建上课记录
      await db.insert(classRecords).values({
        id: uuidv4(),
        recordId: recordNo || `R${Date.now()}`,
        studentId: student?.id || '00000000-0000-0000-0000-000000000000',
        teacherId: teacher?.id || '00000000-0000-0000-0000-000000000000',
        courseId: '00000000-0000-0000-0000-000000000000', // 临时课程ID
        courseCategory: fields['课程类别'] as string || null,
        courseContentDetail: fields['课程内容详情'] as string || null,
        classDate: classDate ? classDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        classYear: fields['年份'] ? Number(fields['年份']) : classDate?.getFullYear(),
        classMonth: fields['月份'] ? Number(fields['月份']) : classDate ? classDate.getMonth() + 1 : null,
        weekDay: mapWeekDay(fields['星期'] as string) as any,
        startTime: mapTimeSlot(fields['开始时间'] as string) as any,
        actualDuration: Number(fields['实际时长(分钟)']) || 120,
        contentSummary: (fields['授课内容摘要'] as string) || '',
        homeworkAssigned: fields['课后作业'] as string || null,
        homeworkScore: fields['作业分数'] ? Math.round(Number(fields['作业分数'])) : null,
        homeworkCompletionRate: fields['作业完成度(%)'] ? Math.round(Number(fields['作业完成度(%)'])) : null,
        remainingHours: Math.round(Number(fields['剩余课时']) || 0),
        attendanceStatus: mapClassStatus(fields['到课情况'] as string) as any,
        isSettled: String(fields['是否已结课']).includes('true') || String(fields['结课状态']).includes('已结'),
        settlementStatus: mapSettlementStatus(fields['结课状态'] as string) as any,
        feishuRecordId: record.record_id,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      synced++;
    } catch (error) {
      console.error(`[Sync] 同步上课记录失败:`, error);
      failed++;
    }
  }

  console.log(`[Sync] 上课记录同步完成: ${synced} 成功, ${failed} 失败`);
  return { total: allRecords.length, synced, failed };
}

/**
 * 同步排课安排数据
 */
export async function syncSchedulesFromFeishu(): Promise<{ total: number; synced: number; failed: number }> {
  const service = getBitableService();
  if (!service.isConfigured) {
    throw new Error('飞书未配置');
  }

  // 检查排课安排表是否配置
  if (!service.tableIds.schedules) {
    console.log('[Sync] 排课安排表未配置，跳过同步');
    return { total: 0, synced: 0, failed: 0 };
  }

  console.log('[Sync] 开始同步排课安排数据...');

  // 从飞书获取所有排课记录
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const result = await service.listRecords(service.tableIds.schedules, {
      pageSize: 100,
      pageToken,
    });
    
    allRecords = allRecords.concat(result.records);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  console.log(`[Sync] 从飞书获取 ${allRecords.length} 条排课记录`);

  // 获取学生和导师映射
  const allStudents = await db.select().from(students);
  const allTeachers = await db.select().from(teachers);
  
  const studentMap = new Map(allStudents.map(s => [s.name, s]));
  const teacherMap = new Map(allTeachers.map(t => [t.name, t]));

  let synced = 0;
  let failed = 0;

  for (const record of allRecords) {
    try {
      const fields = record.fields;
      const scheduleNo = fields['排课编号'] as string;
      
      if (!scheduleNo) {
        failed++;
        continue;
      }

      // 检查是否已存在
      const existing = await db.select().from(scheduleResults)
        .where(eq(scheduleResults.scheduleId, scheduleNo))
        .limit(1);
      
      if (existing.length > 0) {
        synced++;
        continue; // 已存在，跳过
      }

      // 查找学生和导师
      const studentName = fields['学生'] as string;
      const teacherName = fields['导师'] as string;
      const student = studentMap.get(studentName);
      const teacher = teacherMap.get(teacherName);

      // 解析日期
      const planDate = fields['计划日期'] ? parseFeishuDate(fields['计划日期']) : null;

      // 创建排课记录
      await db.insert(scheduleResults).values({
        id: uuidv4(),
        scheduleId: scheduleNo,
        studentId: student?.id || '00000000-0000-0000-0000-000000000000',
        teacherId: teacher?.id || '00000000-0000-0000-0000-000000000000',
        courseId: '00000000-0000-0000-0000-000000000000', // 临时课程ID
        date: planDate ? planDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        weekDay: mapWeekDay(fields['星期'] as string) as any,
        timeSlot: mapTimeSlot(fields['开始时间'] as string) as any,
        hours: Number(fields['时长分钟']) ? Math.round(Number(fields['时长分钟']) / 60) : 2,
        status: mapScheduleStatus(fields['状态'] as string) as any,
        feishuEventId: fields['飞书日历事件ID'] as string || null,
        notes: fields['备注'] as string || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      synced++;
    } catch (error) {
      console.error(`[Sync] 同步排课记录失败:`, error);
      failed++;
    }
  }

  console.log(`[Sync] 排课记录同步完成: ${synced} 成功, ${failed} 失败`);
  return { total: allRecords.length, synced, failed };
}

/**
 * 全量同步
 */
export async function syncAllFromFeishu(): Promise<SyncStatus> {
  console.log('[Sync] ========== 开始全量同步 ==========');
  
  const teachers = await syncTeachersFromFeishu();
  const students = await syncStudentsFromFeishu();
  const classRecordsResult = await syncClassRecordsFromFeishu();
  const schedules = await syncSchedulesFromFeishu();

  console.log('[Sync] ========== 全量同步完成 ==========');
  
  return {
    teachers,
    students,
    classRecords: classRecordsResult,
    schedules,
  };
}

// ========== 辅助函数 ==========

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function parseFeishuDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function mapTeacherType(type: string): '全职' | '兼职' {
  return type?.includes('全职') ? '全职' : '兼职';
}

function mapTeacherCooperationStatus(status: string): '合作中' | '终止合作' {
  return status?.includes('合作中') ? '合作中' : '终止合作';
}

function mapTeacherEmploymentStatus(status: string): '在职' | '离职' | '休假' | '试用期' {
  if (status?.includes('离职')) return '离职';
  if (status?.includes('休假')) return '休假';
  if (status?.includes('试用')) return '试用期';
  return '在职';
}

function mapMajor(major: string): string {
  const map: Record<string, string> = {
    '游戏策划': '游戏策划',
    '游戏开发': '游戏开发',
    '游戏美术（三维）': '游戏美术（三维）',
    '游戏美术（二维）': '游戏美术（二维）',
    '动画设计': '动画设计',
    '角色设计': '角色设计',
    '3D建模': '3D建模',
    '技术美术': '技术美术',
    'UI设计': 'UI设计',
  };
  return map[major] || '其他';
}

function mapCountry(country: string): string {
  const map: Record<string, string> = {
    '美国': '美国',
    '英国': '英国',
    '加拿大': '加拿大',
    '日本': '日本',
    '澳大利亚': '澳大利亚',
    '欧洲': '欧洲',
  };
  return map[country] || '其他';
}

function mapStage(stage: string): string {
  const map: Record<string, string> = {
    '基础阶段': '基础阶段',
    '项目一': '项目一',
    '项目二': '项目二',
    '项目三': '项目三',
    '项目四': '项目四',
    '作品集阶段': '作品集阶段',
    '申请阶段': '申请阶段',
    '已毕业': '已毕业',
  };
  return map[stage] || '基础阶段';
}

function mapWeekDay(day: string): string {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return days.find(d => day?.includes(d)) || '周一';
}

function mapTimeSlot(time: string): string {
  if (!time) return '10:00';
  if (time.includes('10')) return '10:00';
  if (time.includes('13')) return '13:00';
  if (time.includes('15')) return '15:00';
  if (time.includes('18')) return '18:00';
  if (time.includes('20')) return '20:00';
  return '10:00';
}

function mapClassStatus(status: string): string {
  if (!status) return '已完成';
  if (status.includes('已完成') || status.includes('正常')) return '已完成';
  if (status.includes('取消') || status.includes('请假')) return '已取消';
  if (status.includes('缺席') || status.includes('旷课')) return '学生缺席';
  if (status.includes('补课')) return '补课';
  return '已完成';
}

function mapSettlementStatus(status: string): '已结' | '未结' {
  return status?.includes('已结') ? '已结' : '未结';
}

function mapStudentStatus(status: string): '在读' | '停课' | '毕业' | '退学' {
  if (!status) return '在读';
  if (status.includes('停课')) return '停课';
  if (status.includes('毕业')) return '毕业';
  if (status.includes('退学')) return '退学';
  return '在读';
}

function mapScheduleStatus(status: string): '待确认' | '已确认' | '已完成' | '取消' {
  if (!status) return '待确认';
  if (status.includes('已确认')) return '已确认';
  if (status.includes('已完成')) return '已完成';
  if (status.includes('取消')) return '取消';
  return '待确认';
}

function mapMajorDirections(directions: string[]): ('其他' | '游戏策划' | '游戏开发' | '游戏美术（三维）' | '游戏美术（二维）' | '动画设计' | '角色设计' | '3D建模' | '技术美术' | 'UI设计')[] {
  const validDirections = ['其他', '游戏策划', '游戏开发', '游戏美术（三维）', '游戏美术（二维）', '动画设计', '角色设计', '3D建模', '技术美术', 'UI设计'] as const;
  return directions.map(d => {
    const found = validDirections.find(v => d.includes(v));
    return found || '其他';
  }) as any;
}

async function generateStudentId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString();
  
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM students WHERE student_id LIKE ${yearPrefix + '%'}`);
    const count = Number(result.rows[0]?.count) || 0;
    const sequence = (count + 1).toString().padStart(2, '0');
    return `${yearPrefix}${sequence}`;
  } catch {
    return `${yearPrefix}${Date.now().toString().slice(-2)}`;
  }
}

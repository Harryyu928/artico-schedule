/**
 * 飞书多维表格同步服务
 * 
 * 实现学生、导师、课程、上课记录等数据与飞书多维表格的同步
 */

import { getFeishuClient, isFeishuEnabled } from './client';
import { db } from '@/db';
import { students, teachers, courses, classRecords, courseSelectionForms } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 表ID配置（从环境变量读取）
const FEISHU_TABLE_IDS = {
  students: process.env.FEISHU_TABLE_STUDENTS || 'tbl_students',
  teachers: process.env.FEISHU_TABLE_TEACHERS || 'tbl_teachers',
  courses: process.env.FEISHU_TABLE_COURSES || 'tbl_courses',
  schedules: process.env.FEISHU_TABLE_SCHEDULES || 'tbl_schedules',
  classRecords: process.env.FEISHU_TABLE_CLASS_RECORDS || 'tbl_class_records',
  selectionForms: process.env.FEISHU_TABLE_SELECTION_FORMS || 'tbl_selection_forms',
};

// 同步结果类型
export interface SyncResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

/**
 * 飞书多维表格同步服务
 */
export class FeishuBitableService {
  /**
   * 同步学生数据到多维表格
   */
  async syncStudent(studentId: string, existingRecordId?: string): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      console.log('[Feishu] 飞书未启用，跳过多维表格同步');
      return { success: false, error: '飞书未启用' };
    }

    try {
      // 获取学生详情
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      if (!student) {
        return { success: false, error: '找不到学生' };
      }

      // 准备字段数据
      const fields: Record<string, unknown> = {
        '学号': student.studentId,
        '姓名': student.name,
        '邮箱': student.email || '',
        '电话': student.phone || '',
        '微信': student.wechat || '',
        '专业方向': student.major || '',
        '申请国家': student.applicationCountry || '',
        '当前阶段': student.currentStage || '',
        '总课时': student.totalHours || 0,
        '已用课时': student.usedHours || 0,
        '剩余课时': (student.totalHours || 0) - (student.usedHours || 0),
        '创建时间': student.createdAt?.toISOString() || '',
        '更新时间': new Date().toISOString(),
      };

      // 创建或更新记录
      if (existingRecordId) {
        const result = await client.updateBitableRecord(
          FEISHU_TABLE_IDS.students,
          existingRecordId,
          fields
        );
        return { success: true, recordId: result.record_id };
      } else {
        const result = await client.createBitableRecord(
          FEISHU_TABLE_IDS.students,
          fields
        );
        return { success: true, recordId: result.record_id };
      }
    } catch (error) {
      console.error('[Feishu] 同步学生数据失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 同步导师数据到多维表格
   */
  async syncTeacher(teacherId: string, existingRecordId?: string): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      return { success: false, error: '飞书未启用' };
    }

    try {
      // 获取导师详情
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });

      if (!teacher) {
        return { success: false, error: '找不到导师' };
      }

      // 准备字段数据
      const fields: Record<string, unknown> = {
        '工号': teacher.teacherId,
        '姓名': teacher.name,
        '类型': teacher.teacherType || '',
        '可教课程': teacher.teachableCourses || [],
        '最大周课时': teacher.maxWeeklyHours || 0,
        '当前周课时': teacher.currentHours || 0,
        '邮箱': teacher.email || '',
        '电话': teacher.phone || '',
        '简介': teacher.bio || '',
        '创建时间': teacher.createdAt?.toISOString() || '',
        '更新时间': new Date().toISOString(),
      };

      // 创建或更新记录
      if (existingRecordId) {
        const result = await client.updateBitableRecord(
          FEISHU_TABLE_IDS.teachers,
          existingRecordId,
          fields
        );
        return { success: true, recordId: result.record_id };
      } else {
        const result = await client.createBitableRecord(
          FEISHU_TABLE_IDS.teachers,
          fields
        );
        return { success: true, recordId: result.record_id };
      }
    } catch (error) {
      console.error('[Feishu] 同步导师数据失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 同步课程数据到多维表格
   */
  async syncCourse(courseId: string, existingRecordId?: string): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      return { success: false, error: '飞书未启用' };
    }

    try {
      // 获取课程详情
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        return { success: false, error: '找不到课程' };
      }

      // 准备字段数据
      const fields: Record<string, unknown> = {
        '课程编号': course.courseId,
        '课程名称': course.name,
        '类型': course.type || '',
        '分类': course.category || '',
        '时长': course.duration || '',
        '描述': course.description || '',
        '创建时间': course.createdAt?.toISOString() || '',
        '更新时间': new Date().toISOString(),
      };

      // 创建或更新记录
      if (existingRecordId) {
        const result = await client.updateBitableRecord(
          FEISHU_TABLE_IDS.courses,
          existingRecordId,
          fields
        );
        return { success: true, recordId: result.record_id };
      } else {
        const result = await client.createBitableRecord(
          FEISHU_TABLE_IDS.courses,
          fields
        );
        return { success: true, recordId: result.record_id };
      }
    } catch (error) {
      console.error('[Feishu] 同步课程数据失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 同步上课记录到多维表格
   */
  async syncClassRecord(recordId: string, existingFeishuRecordId?: string): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      return { success: false, error: '飞书未启用' };
    }

    try {
      // 获取上课记录详情
      const record = await db.query.classRecords.findFirst({
        where: eq(classRecords.id, recordId),
      });

      if (!record) {
        return { success: false, error: '找不到上课记录' };
      }

      // 获取关联的学生、导师、课程信息
      const student = record.studentId ? await db.query.students.findFirst({
        where: eq(students.id, record.studentId),
      }) : null;

      const teacher = record.teacherId ? await db.query.teachers.findFirst({
        where: eq(teachers.id, record.teacherId),
      }) : null;

      const course = record.courseId ? await db.query.courses.findFirst({
        where: eq(courses.id, record.courseId),
      }) : null;

      // 准备字段数据
      const fields: Record<string, unknown> = {
        '记录ID': record.recordId,
        '学生姓名': student?.name || '',
        '导师姓名': teacher?.name || '',
        '课程名称': course?.name || '',
        '上课日期': record.classDate || '',
        '时间段': `${record.startTime} - ${record.endTime || ''}`,
        '实际时长(分钟)': record.actualDuration || 120,
        '上课内容': record.contentSummary || '',
        '课后作业': record.homeworkAssigned || '',
        '学生表现': record.studentPerformance || '',
        '出勤状态': record.attendanceStatus || '',
        '创建时间': record.createdAt?.toISOString() || '',
        '更新时间': new Date().toISOString(),
      };

      // 创建或更新记录
      if (existingFeishuRecordId) {
        const result = await client.updateBitableRecord(
          FEISHU_TABLE_IDS.classRecords,
          existingFeishuRecordId,
          fields
        );
        return { success: true, recordId: result.record_id };
      } else {
        const result = await client.createBitableRecord(
          FEISHU_TABLE_IDS.classRecords,
          fields
        );
        return { success: true, recordId: result.record_id };
      }
    } catch (error) {
      console.error('[Feishu] 同步上课记录失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 同步选课单到多维表格
   */
  async syncSelectionForm(formId: string, existingRecordId?: string): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      return { success: false, error: '飞书未启用' };
    }

    try {
      // 获取选课单详情
      const form = await db.query.courseSelectionForms.findFirst({
        where: eq(courseSelectionForms.id, formId),
      });

      if (!form) {
        return { success: false, error: '找不到选课单' };
      }

      // 获取关联的学生信息
      const student = form.studentId ? await db.query.students.findFirst({
        where: eq(students.id, form.studentId),
      }) : null;

      // 准备字段数据
      const fields: Record<string, unknown> = {
        '选课单ID': form.formId,
        '学生姓名': student?.name || '',
        '状态': form.status || '',
        '总课时': form.totalHours || 0,
        '备注': form.notes || '',
        '创建时间': form.createdAt?.toISOString() || '',
        '更新时间': new Date().toISOString(),
      };

      // 创建或更新记录
      if (existingRecordId) {
        const result = await client.updateBitableRecord(
          FEISHU_TABLE_IDS.selectionForms,
          existingRecordId,
          fields
        );
        return { success: true, recordId: result.record_id };
      } else {
        const result = await client.createBitableRecord(
          FEISHU_TABLE_IDS.selectionForms,
          fields
        );
        return { success: true, recordId: result.record_id };
      }
    } catch (error) {
      console.error('[Feishu] 同步选课单失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 批量同步学生数据
   */
  async batchSyncStudents(
    studentIds: string[]
  ): Promise<{ success: number; failed: number; results: Record<string, SyncResult> }> {
    const result = {
      success: 0,
      failed: 0,
      results: {} as Record<string, SyncResult>,
    };

    for (const studentId of studentIds) {
      const syncResult = await this.syncStudent(studentId);
      result.results[studentId] = syncResult;
      if (syncResult.success) {
        result.success++;
      } else {
        result.failed++;
      }
    }

    return result;
  }

  /**
   * 批量同步导师数据
   */
  async batchSyncTeachers(
    teacherIds: string[]
  ): Promise<{ success: number; failed: number; results: Record<string, SyncResult> }> {
    const result = {
      success: 0,
      failed: 0,
      results: {} as Record<string, SyncResult>,
    };

    for (const teacherId of teacherIds) {
      const syncResult = await this.syncTeacher(teacherId);
      result.results[teacherId] = syncResult;
      if (syncResult.success) {
        result.success++;
      } else {
        result.failed++;
      }
    }

    return result;
  }

  /**
   * 全量同步所有学生
   */
  async syncAllStudents(): Promise<{ success: number; failed: number }> {
    const allStudents = await db.query.students.findMany();
    const studentIds = allStudents.map(s => s.id);
    const result = await this.batchSyncStudents(studentIds);
    return { success: result.success, failed: result.failed };
  }

  /**
   * 全量同步所有导师
   */
  async syncAllTeachers(): Promise<{ success: number; failed: number }> {
    const allTeachers = await db.query.teachers.findMany();
    const teacherIds = allTeachers.map(t => t.id);
    const result = await this.batchSyncTeachers(teacherIds);
    return { success: result.success, failed: result.failed };
  }
}

// 导出单例
export const feishuBitableService = new FeishuBitableService();

/**
 * 课后反馈自动化服务
 * 
 * 功能：
 * 1. 上课记录完成后自动生成PDF
 * 2. 推送反馈卡片到教务群
 * 3. 支持教务一键转发给学生
 * 
 * 流程：
 * 导师填写上课记录 → 状态变为"已完成" → 自动生成PDF → 推送到教务群 → 教务转发给学生
 */

import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getFeishuClient, isFeishuEnabled } from './feishu/client';
import { generateAndUploadPDF, getPDFSignedUrl } from './pdf-service';
import { randomBytes } from 'crypto';

// 教务群ID（从环境变量配置）
const EDUCATION_GROUP_ID = process.env.FEISHU_EDUCATION_GROUP_ID || '';

// 上课记录数据（用于生成PDF和消息）
export interface ClassRecordData {
  id: string;
  recordId: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  courseCategory?: string;
  courseContentDetail?: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime?: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod?: string;
  studentPerformance?: string;
  attendanceStatus: string;
  homeworkAssigned?: string;
  homeworkDeadline?: string;
  homeworkCompletionRate?: number;
  lastHomeworkQuality?: string;
  nextClassPlan?: string;
  teacherFeedback?: string;
  studentFeedback?: string;
  projectPhase?: string;
  phaseContent?: string;
  pdfUrl?: string;
  signToken?: string;
  // 关联信息
  studentName?: string;
  studentPhone?: string;
  studentWechat?: string;
  studentEmail?: string;
  teacherName?: string;
  courseName?: string;
}

/**
 * 课后反馈服务
 */
export class ClassFeedbackService {
  /**
   * 处理上课记录完成后的自动化流程
   * 1. 生成PDF
   * 2. 推送到教务群
   */
  async processCompletedRecord(recordId: string): Promise<{
    success: boolean;
    pdfUrl?: string;
    messageId?: string;
    error?: string;
  }> {
    try {
      // 获取上课记录详情
      const record = await this.getRecordWithRelations(recordId);
      if (!record) {
        return { success: false, error: '记录不存在' };
      }

      // 1. 生成PDF（如果还没有）
      let pdfUrl = record.pdfUrl;
      if (!pdfUrl) {
        const pdfResult = await this.generatePDF(record);
        if (pdfResult) {
          pdfUrl = pdfResult;
          // 更新数据库
          await db.update(classRecords)
            .set({ pdfUrl: pdfResult, pdfGeneratedAt: new Date(), updatedAt: new Date() })
            .where(eq(classRecords.id, recordId));
        }
      }

      // 2. 推送到教务群
      const messageId = await this.pushToEducationGroup(record, pdfUrl);

      return {
        success: true,
        pdfUrl: pdfUrl ? await getPDFSignedUrl(pdfUrl) : undefined,
        messageId,
      };
    } catch (error) {
      console.error('[ClassFeedback] 处理课后反馈失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
      };
    }
  }

  /**
   * 获取上课记录及关联信息
   */
  private async getRecordWithRelations(recordId: string): Promise<ClassRecordData | null> {
    const records = await db
      .select({
        id: classRecords.id,
        recordId: classRecords.recordId,
        studentId: classRecords.studentId,
        teacherId: classRecords.teacherId,
        courseId: classRecords.courseId,
        courseCategory: classRecords.courseCategory,
        courseContentDetail: classRecords.courseContentDetail,
        classDate: classRecords.classDate,
        weekDay: classRecords.weekDay,
        startTime: classRecords.startTime,
        endTime: classRecords.endTime,
        actualDuration: classRecords.actualDuration,
        contentSummary: classRecords.contentSummary,
        teachingMethod: classRecords.teachingMethod,
        studentPerformance: classRecords.studentPerformance,
        attendanceStatus: classRecords.attendanceStatus,
        homeworkAssigned: classRecords.homeworkAssigned,
        homeworkDeadline: classRecords.homeworkDeadline,
        homeworkCompletionRate: classRecords.homeworkCompletionRate,
        lastHomeworkQuality: classRecords.lastHomeworkQuality,
        nextClassPlan: classRecords.nextClassPlan,
        teacherFeedback: classRecords.teacherFeedback,
        studentFeedback: classRecords.studentFeedback,
        projectPhase: classRecords.projectPhase,
        phaseContent: classRecords.phaseContent,
        pdfUrl: classRecords.pdfUrl,
        signToken: classRecords.signToken,
        studentName: students.name,
        studentPhone: students.phone,
        studentWechat: students.wechat,
        studentEmail: students.email,
        teacherName: teachers.name,
        courseName: courses.name,
      })
      .from(classRecords)
      .leftJoin(students, eq(classRecords.studentId, students.id))
      .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
      .leftJoin(courses, eq(classRecords.courseId, courses.id))
      .where(eq(classRecords.id, recordId))
      .limit(1);

    return records[0] as ClassRecordData || null;
  }

  /**
   * 生成PDF
   */
  private async generatePDF(record: ClassRecordData): Promise<string | null> {
    try {
      const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
      const signLink = record.signToken ? `${domain}/sign/${record.signToken}` : undefined;

      // 动态导入PDF生成模块
      const { ClassRecordPDF } = await import('./pdf-template');
      
      const { key } = await generateAndUploadPDF(
        'class-record',
        record.recordId,
        ClassRecordPDF({
          data: {
            recordId: record.recordId,
            studentName: record.studentName || '未知学生',
            teacherName: record.teacherName || '未知导师',
            courseName: record.courseName || '未知课程',
            courseCategory: record.courseCategory,
            courseContentDetail: record.courseContentDetail,
            classDate: record.classDate,
            weekDay: record.weekDay,
            startTime: record.startTime,
            endTime: record.endTime,
            actualDuration: record.actualDuration,
            contentSummary: record.contentSummary || '',
            teachingMethod: record.teachingMethod,
            studentPerformance: record.studentPerformance,
            attendanceStatus: record.attendanceStatus,
            homeworkAssigned: record.homeworkAssigned,
            homeworkDeadline: record.homeworkDeadline,
            homeworkCompletionRate: record.homeworkCompletionRate,
            lastHomeworkQuality: record.lastHomeworkQuality,
            nextClassPlan: record.nextClassPlan,
            teacherFeedback: record.teacherFeedback,
            studentFeedback: record.studentFeedback,
            projectPhase: record.projectPhase,
            phaseContent: record.phaseContent,
            signLink,
          },
        })
      );

      return key;
    } catch (error) {
      console.error('[ClassFeedback] 生成PDF失败:', error);
      return null;
    }
  }

  /**
   * 推送到教务群
   */
  private async pushToEducationGroup(
    record: ClassRecordData,
    pdfKey?: string
  ): Promise<string | undefined> {
    const client = getFeishuClient();
    if (!client) {
      console.log('[ClassFeedback] 飞书未启用，跳过群消息推送');
      return undefined;
    }

    if (!EDUCATION_GROUP_ID) {
      console.warn('[ClassFeedback] 未配置教务群ID，跳过群消息推送');
      return undefined;
    }

    try {
      // 获取PDF下载链接
      let pdfUrl: string | undefined;
      if (pdfKey) {
        pdfUrl = await getPDFSignedUrl(pdfKey);
      }

      // 构建消息卡片
      const card = this.buildFeedbackCard(record, pdfUrl);

      // 发送到群
      const messageId = await client.sendCardMessage(
        EDUCATION_GROUP_ID,
        'chat_id',
        card
      );

      console.log('[ClassFeedback] 已推送到教务群:', messageId);
      return messageId;
    } catch (error) {
      console.error('[ClassFeedback] 推送到教务群失败:', error);
      return undefined;
    }
  }

  /**
   * 构建反馈消息卡片
   */
  private buildFeedbackCard(record: ClassRecordData, pdfUrl?: string): Record<string, unknown> {
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    
    // 构建字段列表
    const fields = [
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**学生**\n${record.studentName || '未知'}` },
      },
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**导师**\n${record.teacherName || '未知'}` },
      },
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**课程**\n${record.courseName || '未知'}` },
      },
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**时长**\n${record.actualDuration}分钟` },
      },
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**上课时间**\n${record.classDate} ${record.startTime}` },
      },
      {
        is_short: true,
        text: { tag: 'lark_md', content: `**记录编号**\n${record.recordId}` },
      },
    ];

    // 构建按钮动作
    const actions: unknown[] = [];

    // 查看详情按钮
    actions.push({
      tag: 'button',
      text: { tag: 'plain_text', content: '📋 查看详情' },
      type: 'default',
      url: `${domain}/class-records/${record.id}`,
    });

    // 下载PDF按钮
    if (pdfUrl) {
      actions.push({
        tag: 'button',
        text: { tag: 'plain_text', content: '📄 下载PDF' },
        type: 'primary',
        url: pdfUrl,
      });
    }

    // 转发给学生按钮（携带学生联系方式）
    if (record.studentPhone || record.studentWechat || record.studentEmail) {
      const contactInfo = [
        record.studentPhone && `手机: ${record.studentPhone}`,
        record.studentWechat && `微信: ${record.studentWechat}`,
        record.studentEmail && `邮箱: ${record.studentEmail}`,
      ].filter(Boolean).join('\n');

      actions.push({
        tag: 'button',
        text: { tag: 'plain_text', content: '📤 转发给学生' },
        type: 'primary',
        value: {
          action: 'forward_to_student',
          recordId: record.id,
          studentId: record.studentId,
          studentName: record.studentName,
          contactInfo,
          pdfUrl,
        },
      });
    }

    // 上课内容摘要
    const contentElements: unknown[] = [
      {
        tag: 'div',
        fields,
      },
    ];

    // 添加上课内容
    if (record.contentSummary) {
      contentElements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**上课内容**\n${record.contentSummary.slice(0, 200)}${record.contentSummary.length > 200 ? '...' : ''}`,
        },
      });
    }

    // 添加作业
    if (record.homeworkAssigned) {
      contentElements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**课后作业**\n${record.homeworkAssigned.slice(0, 150)}${record.homeworkAssigned.length > 150 ? '...' : ''}`,
        },
      });
    }

    // 添加导师评语
    if (record.teacherFeedback) {
      contentElements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**导师评语**\n${record.teacherFeedback.slice(0, 150)}${record.teacherFeedback.length > 150 ? '...' : ''}`,
        },
      });
    }

    // 添加操作按钮
    if (actions.length > 0) {
      contentElements.push({
        tag: 'action',
        actions,
      });
    }

    // 添加学生联系方式提示
    if (record.studentPhone || record.studentWechat) {
      contentElements.push({
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: `📱 学生联系方式: ${record.studentPhone || record.studentWechat || '无'}`,
          },
        ],
      });
    }

    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '📝 课后反馈' },
        template: 'blue',
      },
      elements: contentElements,
    };
  }

  /**
   * 转发给学生
   */
  async forwardToStudent(
    recordId: string,
    targetType: 'wechat' | 'email' | 'sms'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const record = await this.getRecordWithRelations(recordId);
      if (!record) {
        return { success: false, error: '记录不存在' };
      }

      // 获取PDF链接
      let pdfUrl: string | undefined;
      if (record.pdfUrl) {
        pdfUrl = await getPDFSignedUrl(record.pdfUrl);
      }

      // 根据目标类型发送
      switch (targetType) {
        case 'wechat':
          // TODO: 实现微信转发
          console.log('[ClassFeedback] 微信转发:', {
            studentWechat: record.studentWechat,
            pdfUrl,
          });
          return { success: false, error: '微信转发功能开发中' };

        case 'email':
          // TODO: 实现邮件转发
          console.log('[ClassFeedback] 邮件转发:', {
            studentEmail: record.studentEmail,
            pdfUrl,
          });
          return { success: false, error: '邮件转发功能开发中' };

        case 'sms':
          // TODO: 实现短信转发
          console.log('[ClassFeedback] 短信转发:', {
            studentPhone: record.studentPhone,
          });
          return { success: false, error: '短信转发功能开发中' };

        default:
          return { success: false, error: '不支持的目标类型' };
      }
    } catch (error) {
      console.error('[ClassFeedback] 转发失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '转发失败',
      };
    }
  }
}

// 导出单例
export const classFeedbackService = new ClassFeedbackService();

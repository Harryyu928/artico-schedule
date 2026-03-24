/**
 * 飞书日历同步服务
 * 
 * 实现课程安排与飞书日历的双向同步
 */

import { getFeishuClient, isFeishuEnabled } from './client';
import { db } from '@/db';
import { scheduleResults, students, teachers, courses, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 日历事件数据类型
export interface CalendarEventData {
  scheduleId: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  studentOpenId?: string;
  teacherOpenId?: string;
  location?: string;
}

// 时间段映射
const TIME_SLOT_MAP: Record<string, string> = {
  '09:00-11:00': '09:00',
  '11:00-13:00': '11:00',
  '14:00-16:00': '14:00',
  '16:00-18:00': '16:00',
  '18:00-20:00': '18:00',
  '20:00-22:00': '20:00',
};

/**
 * 从date和timeSlot构建DateTime对象
 */
function buildDateTime(date: Date | string, timeSlot: string): Date {
  const d = new Date(date);
  const startTime = TIME_SLOT_MAP[timeSlot] || '09:00';
  const [hours, minutes] = startTime.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * 获取学生关联用户的飞书OpenId
 */
async function getStudentOpenId(studentId: string): Promise<string | undefined> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.studentId, studentId),
      eq(users.role, '学生')
    ),
  });
  return user?.feishuOpenId || undefined;
}

/**
 * 获取导师关联用户的飞书OpenId
 */
async function getTeacherOpenId(teacherId: string): Promise<string | undefined> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.teacherId, teacherId),
      eq(users.role, '全职导师')
    ),
  });
  return user?.feishuOpenId || undefined;
}

/**
 * 飞书日历同步服务
 */
export class FeishuCalendarService {
  /**
   * 创建课程日历事件
   */
  async createScheduleEvent(data: CalendarEventData): Promise<string | null> {
    const client = getFeishuClient();
    if (!client) {
      console.log('[Feishu] 飞书未启用，跳过日历同步');
      return null;
    }

    try {
      const eventId = await client.createCalendarEvent({
        summary: data.summary,
        description: data.description,
        start_time: {
          timestamp: Math.floor(data.startTime.getTime() / 1000),
        },
        end_time: {
          timestamp: Math.floor(data.endTime.getTime() / 1000),
        },
        reminders: [
          { minutes: 60 }, // 1小时前提醒
          { minutes: 1440 }, // 1天前提醒
        ],
      });

      // 邀请参与者
      const attendeeIds: string[] = [];
      if (data.studentOpenId) {
        attendeeIds.push(data.studentOpenId);
      }
      if (data.teacherOpenId) {
        attendeeIds.push(data.teacherOpenId);
      }

      if (attendeeIds.length > 0) {
        await client.addEventAttendees(eventId, attendeeIds);
      }

      console.log(`[Feishu] 创建日历事件成功: ${eventId}`);
      return eventId;
    } catch (error) {
      console.error('[Feishu] 创建日历事件失败:', error);
      return null;
    }
  }

  /**
   * 更新课程日历事件
   */
  async updateScheduleEvent(
    eventId: string,
    data: Partial<CalendarEventData>
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      const updateData: {
        summary?: string;
        description?: string;
        start_time?: { timestamp: number };
        end_time?: { timestamp: number };
      } = {};

      if (data.summary) {
        updateData.summary = data.summary;
      }
      if (data.description) {
        updateData.description = data.description;
      }
      if (data.startTime) {
        updateData.start_time = {
          timestamp: Math.floor(data.startTime.getTime() / 1000),
        };
      }
      if (data.endTime) {
        updateData.end_time = {
          timestamp: Math.floor(data.endTime.getTime() / 1000),
        };
      }

      await client.updateCalendarEvent(eventId, updateData);
      console.log(`[Feishu] 更新日历事件成功: ${eventId}`);
      return true;
    } catch (error) {
      console.error('[Feishu] 更新日历事件失败:', error);
      return false;
    }
  }

  /**
   * 删除课程日历事件
   */
  async deleteScheduleEvent(eventId: string): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      await client.deleteCalendarEvent(eventId);
      console.log(`[Feishu] 删除日历事件成功: ${eventId}`);
      return true;
    } catch (error) {
      console.error('[Feishu] 删除日历事件失败:', error);
      return false;
    }
  }

  /**
   * 同步课程安排到日历
   * 在创建或更新课程安排时调用
   */
  async syncScheduleToCalendar(
    scheduleId: string,
    existingEventId?: string
  ): Promise<string | null> {
    const client = getFeishuClient();
    if (!client) {
      return null;
    }

    try {
      // 获取课程安排详情
      const schedule = await db.query.scheduleResults.findFirst({
        where: eq(scheduleResults.id, scheduleId),
      });

      if (!schedule) {
        console.error(`[Feishu] 找不到课程安排: ${scheduleId}`);
        return null;
      }

      // 获取关联的学生、导师、课程信息
      const student = schedule.studentId ? await db.query.students.findFirst({
        where: eq(students.id, schedule.studentId),
      }) : null;

      const teacher = schedule.teacherId ? await db.query.teachers.findFirst({
        where: eq(teachers.id, schedule.teacherId),
      }) : null;

      const course = schedule.courseId ? await db.query.courses.findFirst({
        where: eq(courses.id, schedule.courseId),
      }) : null;

      // 获取学生和导师的飞书OpenId
      const studentOpenId = schedule.studentId ? await getStudentOpenId(schedule.studentId) : undefined;
      const teacherOpenId = schedule.teacherId ? await getTeacherOpenId(schedule.teacherId) : undefined;

      // 构建时间
      const startTime = buildDateTime(schedule.date, schedule.timeSlot);
      const endTime = new Date(startTime.getTime() + (schedule.hours || 2) * 60 * 60 * 1000);

      const eventData: CalendarEventData = {
        scheduleId,
        summary: `${course?.name || '课程'} - ${student?.name || '学生'}`,
        description: `课程: ${course?.name || '未知'}\n学生: ${student?.name || '未知'}\n导师: ${teacher?.name || '未知'}`,
        startTime,
        endTime,
        studentOpenId,
        teacherOpenId,
      };

      // 如果已有事件ID，则更新；否则创建新事件
      if (existingEventId) {
        await this.updateScheduleEvent(existingEventId, eventData);
        return existingEventId;
      } else {
        return await this.createScheduleEvent(eventData);
      }
    } catch (error) {
      console.error('[Feishu] 同步课程安排到日历失败:', error);
      return null;
    }
  }

  /**
   * 批量同步多个课程安排
   */
  async batchSyncSchedules(
    scheduleIds: string[]
  ): Promise<{ success: number; failed: number; eventIds: Record<string, string> }> {
    const result = {
      success: 0,
      failed: 0,
      eventIds: {} as Record<string, string>,
    };

    for (const scheduleId of scheduleIds) {
      try {
        const eventId = await this.syncScheduleToCalendar(scheduleId);
        if (eventId) {
          result.success++;
          result.eventIds[scheduleId] = eventId;
        } else {
          result.failed++;
        }
      } catch {
        result.failed++;
      }
    }

    return result;
  }
}

// 导出单例
export const feishuCalendarService = new FeishuCalendarService();

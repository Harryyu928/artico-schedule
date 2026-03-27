/**
 * 导师日历同步服务
 * 
 * 功能：
 * 1. 同步导师的排课到飞书日历
 * 2. 同步导师的不可用时间（从时间表模板）
 * 3. 支持增量同步和全量同步
 * 
 * 使用场景：
 * - 导师可以在飞书日历中看到自己的课程安排
 * - 导师的不可用时间会显示为"忙碌"状态
 * - 支持课前提醒
 */

import { getFeishuClient, isFeishuEnabled } from './feishu/client';
import { db } from '@/db';
import { 
  scheduleResults, 
  students, 
  teachers, 
  courses, 
  timeAvailabilities,
  users 
} from '@/db/schema';
import { eq, and, gte, lte, isNotNull, not, inArray } from 'drizzle-orm';
import { startOfWeek, endOfWeek, addWeeks, format, parseISO, addDays } from 'date-fns';

// ==================== 类型定义 ====================

export interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    coursesSynced: number;
    unavailableSynced: number;
    eventIds: string[];
  };
  error?: string;
}

// ==================== 导师日历同步服务 ====================

export class TeacherCalendarSyncService {
  
  /**
   * 同步导师的排课到飞书日历
   * @param teacherId 导师ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  async syncTeacherCalendar(
    teacherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncResult> {
    const client = getFeishuClient();
    if (!client) {
      return {
        success: false,
        message: '飞书未启用',
        error: 'FEISHU_ENABLED 未配置',
      };
    }

    try {
      // 获取导师信息
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });

      if (!teacher) {
        return {
          success: false,
          message: '导师不存在',
          error: 'TEACHER_NOT_FOUND',
        };
      }

      // 获取导师关联的用户信息（飞书OpenId）
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.teacherId, teacherId),
          inArray(users.role, ['全职导师', '兼职导师'])
        ),
      });

      // 默认同步当前周到未来4周
      const now = new Date();
      const start = startDate || startOfWeek(now, { weekStartsOn: 1 });
      const end = endDate || endOfWeek(addWeeks(now, 4), { weekStartsOn: 1 });

      // 同步课程排课
      const coursesResult = await this.syncCourses(
        teacherId,
        start,
        end
      );

      // 同步不可用时间（从时间表模板生成）
      const unavailableResult = await this.syncUnavailableTime(
        teacherId,
        start,
        end
      );

      // 更新导师的日历同步状态（使用 updatedAt 字段临时记录）
      await db.update(teachers)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(teachers.id, teacherId));

      return {
        success: true,
        message: '日历同步成功',
        data: {
          coursesSynced: coursesResult.synced,
          unavailableSynced: unavailableResult.synced,
          eventIds: [...coursesResult.eventIds, ...unavailableResult.eventIds],
        },
      };
    } catch (error) {
      console.error('[TeacherCalendar] 同步失败:', error);
      return {
        success: false,
        message: '日历同步失败',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * 同步课程排课
   */
  private async syncCourses(
    teacherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ synced: number; eventIds: string[] }> {
    const client = getFeishuClient();
    if (!client) {
      return { synced: 0, eventIds: [] };
    }
    
    const result = { synced: 0, eventIds: [] as string[] };

    try {
      // 获取导师在该时间范围内的所有排课
      const schedules = await db.query.scheduleResults.findMany({
        where: and(
          eq(scheduleResults.teacherId, teacherId),
          gte(scheduleResults.date, format(startDate, 'yyyy-MM-dd')),
          lte(scheduleResults.date, format(endDate, 'yyyy-MM-dd'))
        ),
      });

      if (!schedules || schedules.length === 0) {
        console.log('[TeacherCalendar] 没有找到需要同步的课程');
        return result;
      }

      for (const schedule of schedules) {
        try {
          // 获取学生和课程信息
          const student = schedule.studentId 
            ? await db.query.students.findFirst({
                where: eq(students.id, schedule.studentId),
              })
            : null;

          const course = schedule.courseId
            ? await db.query.courses.findFirst({
                where: eq(courses.id, schedule.courseId),
              })
            : null;

          // 构建时间
          const startTime = this.buildDateTime(schedule.date, schedule.timeSlot);
          const endTime = new Date(startTime.getTime() + (schedule.hours || 2) * 60 * 60 * 1000);

          // 构建事件标题和描述
          const statusEmoji = schedule.status === '已确认' ? '✅' : 
                             schedule.status === '已完成' ? '📝' : '⏳';
          
          const eventData = {
            summary: `${statusEmoji} ${course?.name || '课程'} - ${student?.name || '学生'}`,
            description: this.buildCourseDescription(schedule, student, course),
            start_time: { timestamp: Math.floor(startTime.getTime() / 1000) },
            end_time: { timestamp: Math.floor(endTime.getTime() / 1000) },
            reminders: [
              { minutes: 60 },  // 1小时前
              { minutes: 1440 }, // 1天前
            ],
          };

          let eventId: string;

          if (schedule.feishuEventId) {
            // 更新已有事件
            try {
              await client.updateCalendarEvent(schedule.feishuEventId, eventData);
              eventId = schedule.feishuEventId;
            } catch {
              // 如果更新失败（事件可能被删除），创建新事件
              eventId = await client.createCalendarEvent(eventData);
              await db.update(scheduleResults)
                .set({ feishuEventId: eventId })
                .where(eq(scheduleResults.id, schedule.id));
            }
          } else {
            // 创建新事件
            eventId = await client.createCalendarEvent(eventData);
            
            // 保存事件ID到数据库
            await db.update(scheduleResults)
              .set({ feishuEventId: eventId })
              .where(eq(scheduleResults.id, schedule.id));
          }

          result.synced++;
          result.eventIds.push(eventId);
        } catch (error) {
          console.error(`[TeacherCalendar] 同步课程失败: ${schedule.id}`, error);
        }
      }
    } catch (error) {
      console.error('[TeacherCalendar] 查询课程失败:', error);
    }

    return result;
  }

  /**
   * 同步导师的不可用时间
   * 从时间表模板生成具体的日历事件
   */
  private async syncUnavailableTime(
    teacherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ synced: number; eventIds: string[] }> {
    const client = getFeishuClient()!;
    const result = { synced: 0, eventIds: [] as string[] };

    // 获取导师的用户ID
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.teacherId, teacherId),
        inArray(users.role, ['全职导师', '兼职导师'])
      ),
    });

    if (!user) {
      return result;
    }

    // 获取导师的不可用时间模板
    const unavailableSlots = await db.query.timeAvailabilities.findMany({
      where: and(
        eq(timeAvailabilities.userId, user.id),
        eq(timeAvailabilities.reservationType, '不可用')
      ),
    });

    if (unavailableSlots.length === 0) {
      return result;
    }

    // 为每一周生成具体的不可用时间事件
    let currentDate = startOfWeek(startDate, { weekStartsOn: 1 });
    const weekDayMap: Record<string, number> = {
      '周一': 1, '周二': 2, '周三': 3, '周四': 4,
      '周五': 5, '周六': 6, '周日': 0,
    };

    while (currentDate <= endDate) {
      for (const slot of unavailableSlots) {
        const dayOffset = weekDayMap[slot.weekDay];
        if (dayOffset === undefined) continue;

        const eventDate = dayOffset === 0 
          ? addDays(currentDate, 6) // 周日
          : addDays(currentDate, dayOffset - 1);

        // 跳过过去的日期
        if (eventDate < new Date()) continue;
        if (eventDate > endDate) continue;

        try {
          const startTime = this.buildDateTime(
            format(eventDate, 'yyyy-MM-dd'),
            slot.timeSlot
          );
          const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

          const eventData = {
            summary: '🚫 不可用时间',
            description: `导师不可用时间\n原因: ${slot.notes || '未说明'}`,
            start_time: { timestamp: Math.floor(startTime.getTime() / 1000) },
            end_time: { timestamp: Math.floor(endTime.getTime() / 1000) },
            reminders: [],
          };

          const eventId = await client.createCalendarEvent(eventData);
          result.synced++;
          result.eventIds.push(eventId);
        } catch (error) {
          console.error('[TeacherCalendar] 同步不可用时间失败:', error);
        }
      }

      // 移动到下一周
      currentDate = addWeeks(currentDate, 1);
    }

    return result;
  }

  /**
   * 构建课程描述
   */
  private buildCourseDescription(
    schedule: typeof scheduleResults.$inferSelect,
    student: typeof students.$inferSelect | null | undefined,
    course: typeof courses.$inferSelect | null | undefined
  ): string {
    const lines = [
      `📅 日期: ${schedule.date}`,
      `⏰ 时间: ${schedule.timeSlot}`,
      `📚 课程: ${course?.name || '未知'}`,
      `👨‍🎓 学生: ${student?.name || '未知'}`,
      `📊 状态: ${schedule.status}`,
    ];

    if (schedule.notes) {
      lines.push(`📝 备注: ${schedule.notes}`);
    }

    lines.push('', '---', 'ARTiCO 教务系统自动同步');

    return lines.join('\n');
  }

  /**
   * 从日期和时间槽构建DateTime
   */
  private buildDateTime(date: Date | string, timeSlot: string): Date {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    
    // 解析时间槽（格式如 "09:00-11:00"）
    const startTime = timeSlot.split('-')[0];
    const [hours, minutes] = startTime.split(':').map(Number);
    
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  /**
   * 删除已取消的日历事件
   */
  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      await client.deleteCalendarEvent(eventId);
      return true;
    } catch (error) {
      console.error('[TeacherCalendar] 删除日历事件失败:', error);
      return false;
    }
  }

  /**
   * 获取导师的日历同步状态
   */
  async getSyncStatus(teacherId: string): Promise<{
    lastSyncedAt: Date | null;
    totalCourses: number;
    syncedCourses: number;
  }> {
    try {
      // 获取导师信息
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });

      // 统计课程
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(now, 4), { weekStartsOn: 1 });

      let courses: typeof scheduleResults.$inferSelect[] = [];
      
      try {
        courses = await db.query.scheduleResults.findMany({
          where: and(
            eq(scheduleResults.teacherId, teacherId),
            gte(scheduleResults.date, format(weekStart, 'yyyy-MM-dd')),
            lte(scheduleResults.date, format(weekEnd, 'yyyy-MM-dd'))
          ),
        });
      } catch (queryError) {
        console.error('[TeacherCalendar] 查询课程失败，可能没有排课数据:', queryError);
        // 如果查询失败，返回空结果
        return {
          lastSyncedAt: teacher?.updatedAt || null,
          totalCourses: 0,
          syncedCourses: 0,
        };
      }

      return {
        lastSyncedAt: teacher?.updatedAt || null,
        totalCourses: courses.length,
        syncedCourses: courses.filter(c => c.feishuEventId).length,
      };
    } catch (error) {
      console.error('[TeacherCalendar] 获取同步状态失败:', error);
      return {
        lastSyncedAt: null,
        totalCourses: 0,
        syncedCourses: 0,
      };
    }
  }
}

// 导出单例
export const teacherCalendarSyncService = new TeacherCalendarSyncService();

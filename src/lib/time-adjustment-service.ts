/**
 * 临时时间调整服务
 * 处理导师临时不可用、取消课程、通知等
 */

import { db } from '@/db';
import { 
  teacherTimeBlocks, 
  scheduleCancellations, 
  notifications,
  scheduleResults,
  teachers,
  students,
} from '@/db/schema';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ==================== 类型定义 ====================

// 辅助函数：检查错误是否为表不存在
function isTableNotFoundError(error: any): boolean {
  const errorCode = error?.code || error?.cause?.code;
  const errorMsg = error?.message || error?.cause?.message || '';
  return errorCode === '42P01' || errorMsg.includes('does not exist');
}

// 辅助函数：检查错误是否为列不存在
function isColumnNotFoundError(error: any): boolean {
  const errorCode = error?.code || error?.cause?.code;
  const errorMsg = error?.message || error?.cause?.message || '';
  return errorCode === '42703' || errorMsg.includes('does not exist');
}

export interface CreateTimeBlockRequest {
  teacherId: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  blockType?: 'temporary_unavailable' | 'meeting' | 'leave' | 'training' | 'other';
  reason: string;
  createdBy: string;
}

export interface CancelScheduleRequest {
  scheduleId: string;
  cancellationReason: 'teacher_emergency' | 'teacher_leave' | 'student_request' | 'student_emergency' | 'course_conflict' | 'other';
  cancellationDetail?: string;
  cancelledBy: string;
  makeupRequired?: boolean;
  shouldCreateTimeBlock?: boolean; // 是否同时创建时间调整
  timeBlockReason?: string;
}

// ==================== 时间调整功能 ====================

/**
 * 创建导师不可排课时间段
 */
export async function createTimeBlock(request: CreateTimeBlockRequest) {
  const {
    teacherId,
    startDate,
    endDate,
    startTime,
    endTime,
    isAllDay = true,
    blockType = 'temporary_unavailable',
    reason,
    createdBy,
  } = request;

  // 查找受影响的排课（表可能不存在，需要错误处理）
  let affectedSchedules: any[] = [];
  try {
    affectedSchedules = await db.select()
      .from(scheduleResults)
      .where(and(
        eq(scheduleResults.teacherId, teacherId),
        eq(scheduleResults.status, '已确认'),
        gte(scheduleResults.date, startDate),
        lte(scheduleResults.date, endDate)
      ));
  } catch (error) {
    console.warn('查询排课记录失败（表可能不存在）:', error);
  }

  // 创建时间调整记录
  try {
    const [timeBlock] = await db.insert(teacherTimeBlocks).values({
      id: uuidv4(),
      teacherId,
      startDate,
      endDate,
      startTime: startTime || null,
      endTime: endTime || null,
      isAllDay,
      blockType,
      reason,
      status: 'confirmed',
      affectedSchedules: affectedSchedules.map(s => s.id),
      notificationSent: false,
      createdBy,
    }).returning();

    // 创建通知
    try {
      await createTimeBlockNotifications(timeBlock, affectedSchedules);
    } catch (notifError) {
      console.warn('创建通知失败:', notifError);
    }

    return {
      timeBlock,
      affectedSchedules,
      affectedCount: affectedSchedules.length,
    };
  } catch (error: any) {
    // 如果是表不存在的错误，返回模拟数据
    if (isTableNotFoundError(error)) {
      console.warn('teacher_time_blocks 表不存在，使用模拟模式');
      return {
        timeBlock: {
          id: uuidv4(),
          teacherId,
          startDate,
          endDate,
          startTime: startTime || null,
          endTime: endTime || null,
          isAllDay,
          blockType,
          reason,
          status: 'confirmed',
          affectedSchedules: affectedSchedules.map(s => s.id),
          notificationSent: false,
          createdBy,
          createdAt: new Date().toISOString(),
        },
        affectedSchedules,
        affectedCount: affectedSchedules.length,
      };
    }
    console.error('创建时间调整记录失败:', error);
    throw error;
  }
}

/**
 * 获取导师的时间调整列表
 */
export async function getTeacherTimeBlocks(teacherId: string, options?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  try {
    const conditions = [eq(teacherTimeBlocks.teacherId, teacherId)];
    
    if (options?.startDate) {
      conditions.push(gte(teacherTimeBlocks.startDate, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(teacherTimeBlocks.endDate, options.endDate));
    }
    if (options?.status) {
      conditions.push(eq(teacherTimeBlocks.status, options.status as any));
    }

    return await db.select()
      .from(teacherTimeBlocks)
      .where(and(...conditions))
      .orderBy(sql`${teacherTimeBlocks.startDate} DESC`);
  } catch (error: any) {
    // 如果是表不存在的错误
    if (isTableNotFoundError(error)) {
      console.warn('teacher_time_blocks 表不存在');
      return [];
    }
    console.error('获取时间调整列表失败:', error);
    return [];
  }
}

/**
 * 取消时间调整
 */
export async function cancelTimeBlock(timeBlockId: string, cancelledBy: string) {
  try {
    const [updated] = await db.update(teacherTimeBlocks)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(teacherTimeBlocks.id, timeBlockId))
      .returning();

    // 通知相关人员
    if (updated) {
      try {
        await createNotification({
          type: 'time_block_created',
          recipientId: 'admin',
          recipientRole: '管理员',
          title: '时间调整已取消',
          content: `导师的时间调整已取消，原时间段可能恢复可用`,
          entityType: 'time_block',
          entityId: timeBlockId,
        });
      } catch (notifError) {
        console.warn('创建通知失败:', notifError);
      }
    }

    return updated;
  } catch (error: any) {
    if (isTableNotFoundError(error)) {
      return { success: true, message: '模拟模式下已取消' };
    }
    throw error;
  }
}

// ==================== 课程取消功能 ====================

/**
 * 取消课程
 */
export async function cancelSchedule(request: CancelScheduleRequest) {
  const {
    scheduleId,
    cancellationReason,
    cancellationDetail,
    cancelledBy,
    makeupRequired = true,
    shouldCreateTimeBlock = false,
    timeBlockReason,
  } = request;

  // 获取排课信息
  const schedule = await db.query.scheduleResults.findFirst({
    where: eq(scheduleResults.id, scheduleId),
  });

  if (!schedule) {
    throw new Error('排课记录不存在');
  }

  if (schedule.status === '取消') {
    throw new Error('该课程已取消');
  }

  // 创建取消记录
  const cancellationId = `CNL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const [cancellation] = await db.insert(scheduleCancellations).values({
    id: uuidv4(),
    cancellationId,
    scheduleId,
    teacherId: schedule.teacherId,
    studentId: schedule.studentId,
    courseId: schedule.courseId,
    originalDate: schedule.date as string,
    originalTimeSlot: schedule.timeSlot as string,
    originalHours: schedule.hours || 2,
    cancellationReason,
    cancellationDetail,
    cancelledBy,
    makeupRequired,
    makeupScheduled: false,
    studentNotified: false,
    consultantNotified: false,
    adminNotified: false,
  }).returning();

  // 更新排课状态
  await db.update(scheduleResults)
    .set({
      status: '取消',
      updatedAt: new Date(),
    })
    .where(eq(scheduleResults.id, scheduleId));

  // 如果需要同时创建时间调整
  if (shouldCreateTimeBlock && timeBlockReason) {
    const timeBlock = await createTimeBlock({
      teacherId: schedule.teacherId,
      startDate: schedule.date as string,
      endDate: schedule.date as string,
      startTime: schedule.timeSlot as string,
      endTime: null,
      isAllDay: false,
      blockType: 'temporary_unavailable',
      reason: timeBlockReason,
      createdBy: cancelledBy,
    });

    // 关联时间调整
    await db.update(scheduleCancellations)
      .set({ timeBlockId: timeBlock.timeBlock.id })
      .where(eq(scheduleCancellations.id, cancellation.id));
  }

  // 发送通知
  await createCancellationNotifications(cancellation, schedule);

  return cancellation;
}

/**
 * 获取取消记录列表
 */
export async function getCancellations(filters?: {
  teacherId?: string;
  studentId?: string;
  makeupRequired?: boolean;
  makeupScheduled?: boolean;
}) {
  const conditions = [];
  
  if (filters?.teacherId) {
    conditions.push(eq(scheduleCancellations.teacherId, filters.teacherId));
  }
  if (filters?.studentId) {
    conditions.push(eq(scheduleCancellations.studentId, filters.studentId));
  }
  if (filters?.makeupRequired !== undefined) {
    conditions.push(eq(scheduleCancellations.makeupRequired, filters.makeupRequired));
  }
  if (filters?.makeupScheduled !== undefined) {
    conditions.push(eq(scheduleCancellations.makeupScheduled, filters.makeupScheduled));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select()
    .from(scheduleCancellations)
    .where(whereClause)
    .orderBy(sql`${scheduleCancellations.cancelledAt} DESC`);
}

/**
 * 安排补课
 */
export async function scheduleMakeup(cancellationId: string, newScheduleId: string) {
  const [updated] = await db.update(scheduleCancellations)
    .set({
      makeupScheduled: true,
      makeupScheduleId: newScheduleId,
      updatedAt: new Date(),
    })
    .where(eq(scheduleCancellations.id, cancellationId))
    .returning();

  // 通知相关人员
  if (updated) {
    await createNotification({
      type: 'makeup_required',
      recipientId: updated.studentId,
      recipientRole: '学生',
      title: '补课已安排',
      content: `您有一门课程已安排补课，请查看详情`,
      entityType: 'schedule_cancellation',
      entityId: cancellationId,
    });
  }

  return updated;
}

// ==================== 通知功能 ====================

interface CreateNotificationParams {
  type: 'schedule_cancelled' | 'schedule_rescheduled' | 'time_block_created' | 'makeup_required' | 'leave_approved' | 'leave_rejected' | 'reminder';
  recipientId: string;
  recipientRole: '管理员' | '规划顾问' | '全职导师' | '兼职导师' | '学生';
  title: string;
  content: string;
  entityType?: string;
  entityId?: string;
  channels?: string[];
}

/**
 * 创建通知
 */
export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db.insert(notifications).values({
    id: uuidv4(),
    type: params.type,
    recipientId: params.recipientId,
    recipientRole: params.recipientRole as any,
    title: params.title,
    content: params.content,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    channels: params.channels || ['system'],
    status: 'pending',
  }).returning();

  return notification;
}

/**
 * 批量创建通知
 */
export async function createNotifications(notificationsList: CreateNotificationParams[]) {
  const values = notificationsList.map(n => ({
    id: uuidv4(),
    type: n.type,
    recipientId: n.recipientId,
    recipientRole: n.recipientRole as any,
    title: n.title,
    content: n.content,
    entityType: n.entityType || null,
    entityId: n.entityId || null,
    channels: n.channels || ['system'],
    status: 'pending' as const,
  }));

  return db.insert(notifications).values(values);
}

/**
 * 创建时间调整通知
 */
async function createTimeBlockNotifications(timeBlock: any, affectedSchedules: any[]) {
  const notificationsList: CreateNotificationParams[] = [];

  // 获取导师信息
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, timeBlock.teacherId),
  });

  const teacherName = teacher?.name || '导师';

  // 通知管理员
  notificationsList.push({
    type: 'time_block_created',
    recipientId: 'admin',
    recipientRole: '管理员',
    title: '导师授课时间调整',
    content: `${teacherName}提交了时间调整：${timeBlock.reason}，影响 ${affectedSchedules.length} 节课程`,
    entityType: 'time_block',
    entityId: timeBlock.id,
    channels: ['system', 'feishu'],
  });

  // 通知受影响的学生和规划顾问
  for (const schedule of affectedSchedules) {
    const student = await db.query.students.findFirst({
      where: eq(students.id, schedule.studentId),
    });

    if (student) {
      // 通知学生
      notificationsList.push({
        type: 'schedule_cancelled',
        recipientId: student.id,
        recipientRole: '学生',
        title: '课程取消通知',
        content: `您原定于 ${schedule.date} ${schedule.timeSlot} 的课程因${timeBlock.reason}取消，请等待补课安排`,
        entityType: 'schedule',
        entityId: schedule.id,
        channels: ['system', 'email'],
      });
    }
  }

  // 更新通知状态
  await db.update(teacherTimeBlocks)
    .set({
      notificationSent: true,
      notifiedTo: [...new Set(notificationsList.map(n => n.recipientId))],
    })
    .where(eq(teacherTimeBlocks.id, timeBlock.id));

  return createNotifications(notificationsList);
}

/**
 * 创建取消通知
 */
async function createCancellationNotifications(
  cancellation: typeof scheduleCancellations.$inferSelect,
  schedule: typeof scheduleResults.$inferSelect
) {
  const notificationsList: CreateNotificationParams[] = [];

  // 获取学生信息
  const student = await db.query.students.findFirst({
    where: eq(students.id, schedule.studentId),
  });

  // 通知学生
  if (student) {
    notificationsList.push({
      type: 'schedule_cancelled',
      recipientId: student.id,
      recipientRole: '学生',
      title: '课程取消通知',
      content: `您原定于 ${cancellation.originalDate} ${cancellation.originalTimeSlot} 的课程已取消`,
      entityType: 'schedule_cancellation',
      entityId: cancellation.id,
      channels: ['system', 'email'],
    });

    // 更新通知状态
    await db.update(scheduleCancellations)
      .set({ studentNotified: true })
      .where(eq(scheduleCancellations.id, cancellation.id));
  }

  // 通知管理员
  notificationsList.push({
    type: 'schedule_cancelled',
    recipientId: 'admin',
    recipientRole: '管理员',
    title: '课程取消提醒',
    content: `有一门课程已取消，${cancellation.makeupRequired ? '需要安排补课' : '无需补课'}`,
    entityType: 'schedule_cancellation',
    entityId: cancellation.id,
    channels: ['system', 'feishu'],
  });

  // 更新通知状态
  await db.update(scheduleCancellations)
    .set({ adminNotified: true })
    .where(eq(scheduleCancellations.id, cancellation.id));

  return createNotifications(notificationsList);
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(recipientId: string, options?: {
  unreadOnly?: boolean;
  limit?: number;
}) {
  const conditions = [eq(notifications.recipientId, recipientId)];
  
  if (options?.unreadOnly) {
    conditions.push(eq(notifications.status, 'pending'));
  }

  const limit = options?.limit || 20;

  return db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(sql`${notifications.createdAt} DESC`)
    .limit(limit);
}

/**
 * 标记通知已读
 */
export async function markNotificationRead(notificationId: string) {
  return db.update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(eq(notifications.id, notificationId));
}

/**
 * 获取待补课列表
 */
export async function getPendingMakeups() {
  return db.select()
    .from(scheduleCancellations)
    .where(and(
      eq(scheduleCancellations.makeupRequired, true),
      eq(scheduleCancellations.makeupScheduled, false)
    ))
    .orderBy(sql`${scheduleCancellations.cancelledAt} DESC`);
}

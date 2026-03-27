import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, scheduleResults, students, courses } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/teacher/notifications
 * Get teacher notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'Missing teacher ID' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(notifications.recipientId, teacherId)];
    
    if (unreadOnly) {
      conditions.push(sql`${notifications.status} != 'read'`);
    }

    // Query notifications
    const notificationList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Get unread count
    const [{ unreadCount }] = await db
      .select({ unreadCount: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, teacherId),
          sql`${notifications.status} != 'read'`
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        notifications: notificationList,
        unreadCount: Number(unreadCount) || 0,
      },
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/notifications
 * Create class reminders
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId } = body;

    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'Missing teacher ID' },
        { status: 400 }
      );
    }

    // Get upcoming classes (within next 24 hours)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    const nowStr = now.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const upcomingSchedules = await db
      .select({
        id: scheduleResults.id,
        scheduleId: scheduleResults.scheduleId,
        date: scheduleResults.date,
        timeSlot: scheduleResults.timeSlot,
        student: students,
        course: courses,
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          eq(scheduleResults.status, '已确认'),
          gte(scheduleResults.date, nowStr),
          lte(scheduleResults.date, tomorrowStr)
        )
      );

    const createdNotifications = [];

    // Create reminder for each upcoming class
    for (const schedule of upcomingSchedules) {
      // Check if reminder already exists
      const [existingNotification] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, teacherId),
            eq(notifications.entityType, 'schedule'),
            eq(notifications.entityId, schedule.id),
            eq(notifications.type, 'reminder')
          )
        )
        .limit(1);

      if (!existingNotification) {
        const notificationId = uuidv4();
        const classDate = new Date(schedule.date);
        
        const [notification] = await db.insert(notifications).values({
          id: notificationId,
          type: 'reminder',
          recipientId: teacherId,
          recipientRole: '全职导师',
          title: '上课提醒',
          content: `您有一节课程即将开始：${schedule.student?.name || '未知学生'} - ${schedule.course?.name || '未知课程'}，时间：${classDate.toLocaleDateString('zh-CN')} ${schedule.timeSlot}`,
          entityType: 'schedule',
          entityId: schedule.id,
          channels: ['system'],
          status: 'pending',
          createdBy: teacherId,
        }).returning();

        createdNotifications.push(notification);
      }
    }

    // Create reminders for pending class records
    const completedSchedules = await db
      .select({
        id: scheduleResults.id,
        scheduleId: scheduleResults.scheduleId,
        date: scheduleResults.date,
        timeSlot: scheduleResults.timeSlot,
        student: students,
        course: courses,
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          eq(scheduleResults.status, '已完成')
        )
      );

    // Check which classes don't have records
    for (const schedule of completedSchedules) {
      const [existingNotification] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, teacherId),
            eq(notifications.entityType, 'class_record_reminder'),
            eq(notifications.entityId, schedule.id),
            gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);

      if (!existingNotification) {
        const notificationId = uuidv4();
        
        const [notification] = await db.insert(notifications).values({
          id: notificationId,
          type: 'reminder',
          recipientId: teacherId,
          recipientRole: '全职导师',
          title: '上课记录待填写',
          content: `请及时填写上课记录：${schedule.student?.name || '未知学生'} - ${schedule.course?.name || '未知课程'}`,
          entityType: 'class_record_reminder',
          entityId: schedule.id,
          channels: ['system'],
          status: 'pending',
          createdBy: teacherId,
        }).returning();

        createdNotifications.push(notification);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: createdNotifications.length,
        notifications: createdNotifications,
      },
      message: `Created ${createdNotifications.length} notifications`,
    });
  } catch (error) {
    console.error('Failed to create notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notifications' },
      { status: 500 }
    );
  }
}

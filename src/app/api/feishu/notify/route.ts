/**
 * 飞书通知API
 * 
 * POST /api/feishu/notify
 * 发送各类通知消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeishuEnabled, feishuNotificationService, feishuCalendarService } from '@/lib/feishu';
import { db } from '@/db';
import { users, scheduleResults, students, teachers, courses, classRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 时间段映射
const TIME_SLOT_MAP: Record<string, string> = {
  '09:00-11:00': '09:00',
  '11:00-13:00': '11:00',
  '14:00-16:00': '14:00',
  '16:00-18:00': '16:00',
  '18:00-20:00': '18:00',
  '20:00-22:00': '20:00',
};

// 通知类型
type NotificationType = 
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_cancelled'
  | 'course_reminder'
  | 'approval_notification'
  | 'class_record';

/**
 * POST /api/feishu/notify
 * 发送通知
 */
export async function POST(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.json({ 
      success: false, 
      error: '飞书集成未启用' 
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { type, data } = body as { type: NotificationType; data: Record<string, unknown> };

    switch (type) {
      case 'schedule_created':
        return await handleScheduleCreated(data as { scheduleId: string });
      
      case 'schedule_updated':
        return await handleScheduleUpdated(data as { 
          scheduleId: string; 
          oldTime?: string; 
          newTime?: string;
          reason?: string;
        });
      
      case 'schedule_cancelled':
        return await handleScheduleCancelled(data as { 
          scheduleId: string; 
          reason?: string;
        });
      
      case 'course_reminder':
        return await handleCourseReminder(data as { 
          scheduleId: string; 
          reminderType: '1小时前' | '1天前' | '自定义';
        });
      
      case 'approval_notification':
        return await handleApprovalNotification(data as {
          openId: string;
          type: '选课单审批' | '时间调整审批' | '请假审批' | '课程变更审批';
          applicant: string;
          status: '待审批' | '已通过' | '已拒绝';
          link?: string;
          comment?: string;
        });
      
      case 'class_record':
        return await handleClassRecord(data as {
          recordId: string;
          notifyType: '学生' | '导师' | 'both';
        });
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: '未知的通知类型' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Feishu] 发送通知失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

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
 * 格式化日期时间
 */
function formatDateTime(date: Date | string | null | undefined, timeSlot?: string): string {
  if (!date) return '未设置';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  if (timeSlot) {
    return `${year}-${month}-${day} ${timeSlot}`;
  }
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取学生关联用户的飞书OpenId
 */
async function getStudentOpenId(studentId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.studentId, studentId),
      eq(users.role, '学生')
    ),
  });
  return user?.feishuOpenId || null;
}

/**
 * 获取导师关联用户的飞书OpenId
 */
async function getTeacherOpenId(teacherId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.teacherId, teacherId),
      eq(users.role, '全职导师') // 或 '兼职导师'
    ),
  });
  return user?.feishuOpenId || null;
}

/**
 * 处理排课创建通知
 */
async function handleScheduleCreated(data: { scheduleId: string }) {
  const { scheduleId } = data;

  // 获取排课详情
  const schedule = await db.query.scheduleResults.findFirst({
    where: eq(scheduleResults.id, scheduleId),
  });

  if (!schedule) {
    return NextResponse.json({ 
      success: false, 
      error: '找不到课程安排' 
    }, { status: 404 });
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
  const studentOpenId = schedule.studentId ? await getStudentOpenId(schedule.studentId) : null;
  const teacherOpenId = schedule.teacherId ? await getTeacherOpenId(schedule.teacherId) : null;

  const notificationData = {
    courseName: course?.name || '未知课程',
    studentName: student?.name || '未知学生',
    teacherName: teacher?.name || '未知导师',
    time: formatDateTime(schedule.date, schedule.timeSlot),
    scheduleId,
  };

  const results = {
    student: false,
    teacher: false,
    calendar: null as string | null,
  };

  // 发送通知给学生
  if (studentOpenId) {
    results.student = await feishuNotificationService.sendScheduleCreatedNotification(
      studentOpenId,
      notificationData
    );
  }

  // 发送通知给导师
  if (teacherOpenId) {
    results.teacher = await feishuNotificationService.sendScheduleCreatedNotification(
      teacherOpenId,
      notificationData
    );
  }

  // 同步到日历
  try {
    const startTime = buildDateTime(schedule.date, schedule.timeSlot);
    const endTime = new Date(startTime.getTime() + (schedule.hours || 2) * 60 * 60 * 1000);
    
    results.calendar = await feishuCalendarService.createScheduleEvent({
      scheduleId,
      summary: `${course?.name || '课程'} - ${student?.name || '学生'}`,
      description: `课程: ${course?.name || '未知'}\n学生: ${student?.name || '未知'}\n导师: ${teacher?.name || '未知'}`,
      startTime,
      endTime,
      studentOpenId: studentOpenId || undefined,
      teacherOpenId: teacherOpenId || undefined,
    });
    
    // 保存日历事件ID到数据库
    if (results.calendar) {
      await db.update(scheduleResults)
        .set({ feishuEventId: results.calendar })
        .where(eq(scheduleResults.id, scheduleId));
    }
  } catch (error) {
    console.error('[Feishu] 同步日历失败:', error);
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

/**
 * 处理排课更新通知
 */
async function handleScheduleUpdated(data: { 
  scheduleId: string; 
  oldTime?: string; 
  newTime?: string;
  reason?: string;
}) {
  const { scheduleId, oldTime, newTime, reason } = data;

  // 获取排课详情
  const schedule = await db.query.scheduleResults.findFirst({
    where: eq(scheduleResults.id, scheduleId),
  });

  if (!schedule) {
    return NextResponse.json({ 
      success: false, 
      error: '找不到课程安排' 
    }, { status: 404 });
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

  // 获取飞书OpenId
  const studentOpenId = schedule.studentId ? await getStudentOpenId(schedule.studentId) : null;
  const teacherOpenId = schedule.teacherId ? await getTeacherOpenId(schedule.teacherId) : null;

  const notificationData = {
    changeType: '修改' as const,
    courseName: course?.name || '未知课程',
    studentName: student?.name || '未知学生',
    teacherName: teacher?.name || '未知导师',
    oldTime,
    newTime: newTime || formatDateTime(schedule.date, schedule.timeSlot),
    reason,
  };

  const results = {
    student: false,
    teacher: false,
    calendar: false,
  };

  // 发送通知
  if (studentOpenId) {
    results.student = await feishuNotificationService.sendScheduleChangeNotification(
      studentOpenId,
      notificationData
    );
  }

  if (teacherOpenId) {
    results.teacher = await feishuNotificationService.sendScheduleChangeNotification(
      teacherOpenId,
      notificationData
    );
  }

  // 更新日历事件
  if (schedule.feishuEventId) {
    const startTime = buildDateTime(schedule.date, schedule.timeSlot);
    const endTime = new Date(startTime.getTime() + (schedule.hours || 2) * 60 * 60 * 1000);
    
    results.calendar = await feishuCalendarService.updateScheduleEvent(
      schedule.feishuEventId,
      {
        scheduleId,
        summary: `${course?.name || '课程'} - ${student?.name || '学生'}`,
        startTime,
        endTime,
      }
    );
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

/**
 * 处理排课取消通知
 */
async function handleScheduleCancelled(data: { 
  scheduleId: string; 
  reason?: string;
}) {
  const { scheduleId, reason } = data;

  // 获取排课详情
  const schedule = await db.query.scheduleResults.findFirst({
    where: eq(scheduleResults.id, scheduleId),
  });

  if (!schedule) {
    return NextResponse.json({ 
      success: false, 
      error: '找不到课程安排' 
    }, { status: 404 });
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

  // 获取飞书OpenId
  const studentOpenId = schedule.studentId ? await getStudentOpenId(schedule.studentId) : null;
  const teacherOpenId = schedule.teacherId ? await getTeacherOpenId(schedule.teacherId) : null;

  const notificationData = {
    changeType: '取消' as const,
    courseName: course?.name || '未知课程',
    studentName: student?.name || '未知学生',
    teacherName: teacher?.name || '未知导师',
    reason,
  };

  const results = {
    student: false,
    teacher: false,
    calendar: false,
  };

  // 发送通知
  if (studentOpenId) {
    results.student = await feishuNotificationService.sendScheduleChangeNotification(
      studentOpenId,
      notificationData
    );
  }

  if (teacherOpenId) {
    results.teacher = await feishuNotificationService.sendScheduleChangeNotification(
      teacherOpenId,
      notificationData
    );
  }

  // 删除日历事件
  if (schedule.feishuEventId) {
    results.calendar = await feishuCalendarService.deleteScheduleEvent(schedule.feishuEventId);
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

/**
 * 处理课程提醒
 */
async function handleCourseReminder(data: { 
  scheduleId: string; 
  reminderType: '1小时前' | '1天前' | '自定义';
}) {
  const { scheduleId, reminderType } = data;

  // 获取排课详情
  const schedule = await db.query.scheduleResults.findFirst({
    where: eq(scheduleResults.id, scheduleId),
  });

  if (!schedule) {
    return NextResponse.json({ 
      success: false, 
      error: '找不到课程安排' 
    }, { status: 404 });
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

  // 获取飞书OpenId
  const studentOpenId = schedule.studentId ? await getStudentOpenId(schedule.studentId) : null;
  const teacherOpenId = schedule.teacherId ? await getTeacherOpenId(schedule.teacherId) : null;

  const reminderData = {
    courseName: course?.name || '未知课程',
    studentName: student?.name || '未知学生',
    teacherName: teacher?.name || '未知导师',
    time: formatDateTime(schedule.date, schedule.timeSlot),
    location: '线上',
    scheduleId,
  };

  const results = {
    student: false,
    teacher: false,
  };

  // 发送提醒
  if (studentOpenId) {
    results.student = await feishuNotificationService.sendCourseReminder(
      studentOpenId,
      reminderData,
      reminderType
    );
  }

  if (teacherOpenId) {
    results.teacher = await feishuNotificationService.sendCourseReminder(
      teacherOpenId,
      reminderData,
      reminderType
    );
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

/**
 * 处理审批通知
 */
async function handleApprovalNotification(data: {
  openId: string;
  type: '选课单审批' | '时间调整审批' | '请假审批' | '课程变更审批';
  applicant: string;
  status: '待审批' | '已通过' | '已拒绝';
  link?: string;
  comment?: string;
}) {
  const result = await feishuNotificationService.sendApprovalNotification(
    data.openId,
    {
      type: data.type,
      applicant: data.applicant,
      status: data.status,
      link: data.link,
      comment: data.comment,
    }
  );

  return NextResponse.json({
    success: result,
  });
}

/**
 * 处理上课记录通知
 */
async function handleClassRecord(data: {
  recordId: string;
  notifyType: '学生' | '导师' | 'both';
}) {
  const { recordId, notifyType } = data;

  // 获取上课记录详情
  const record = await db.query.classRecords.findFirst({
    where: eq(classRecords.id, recordId),
  });

  if (!record) {
    return NextResponse.json({ 
      success: false, 
      error: '找不到上课记录' 
    }, { status: 404 });
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

  // 获取飞书OpenId
  const studentOpenId = record.studentId ? await getStudentOpenId(record.studentId) : null;
  const teacherOpenId = record.teacherId ? await getTeacherOpenId(record.teacherId) : null;

  const recordData = {
    courseName: course?.name || '未知课程',
    studentName: student?.name || '未知学生',
    teacherName: teacher?.name || '未知导师',
    time: formatDateTime(record.classDate, record.startTime),
    duration: Math.floor((record.actualDuration || 120) / 60),
    content: record.contentSummary || '',
    homework: record.homeworkAssigned || undefined,
  };

  const results = {
    student: false,
    teacher: false,
  };

  // 发送通知
  if ((notifyType === '学生' || notifyType === 'both') && studentOpenId) {
    results.student = await feishuNotificationService.sendClassRecordNotification(
      studentOpenId,
      recordData,
      '学生'
    );
  }

  if ((notifyType === '导师' || notifyType === 'both') && teacherOpenId) {
    results.teacher = await feishuNotificationService.sendClassRecordNotification(
      teacherOpenId,
      recordData,
      '导师'
    );
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

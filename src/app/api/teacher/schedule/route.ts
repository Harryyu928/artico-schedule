import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scheduleResults, students, courses, teachers, classRecords } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * GET /api/teacher/schedule
 * 获取导师课程安排
 * Query params:
 * - teacherId: 导师ID（可选，不传则从session获取）
 * - type: 'today' | 'week' | 'all' (默认 'today')
 * - date: 指定日期 (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const type = searchParams.get('type') || 'today';
    const dateStr = searchParams.get('date');

    // Build date range
    let startDate: string;
    let endDate: string;

    if (type === 'today') {
      const today = dateStr || new Date().toISOString().split('T')[0];
      startDate = today;
      endDate = today;
    } else if (type === 'week') {
      const baseDate = dateStr ? new Date(dateStr) : new Date();
      const dayOfWeek = baseDate.getDay();
      const monday = new Date(baseDate);
      monday.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      startDate = monday.toISOString().split('T')[0];
      endDate = sunday.toISOString().split('T')[0];
    } else {
      // all - get courses for next month
      startDate = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      endDate = nextMonth.toISOString().split('T')[0];
    }

    // 构建查询条件
    const conditions = [gte(scheduleResults.date, startDate), lte(scheduleResults.date, endDate)];
    
    if (teacherId) {
      conditions.push(eq(scheduleResults.teacherId, teacherId));
    }

    // 查询课程安排
    const schedules = await db
      .select({
        id: scheduleResults.id,
        scheduleId: scheduleResults.scheduleId,
        date: scheduleResults.date,
        weekDay: scheduleResults.weekDay,
        timeSlot: scheduleResults.timeSlot,
        hours: scheduleResults.hours,
        status: scheduleResults.status,
        notes: scheduleResults.notes,
        student: {
          id: students.id,
          studentId: students.studentId,
          name: students.name,
          major: students.major,
        },
        course: {
          id: courses.id,
          courseId: courses.courseId,
          name: courses.name,
          category: courses.category,
        },
        teacher: {
          id: teachers.id,
          teacherId: teachers.teacherId,
          name: teachers.name,
        },
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .leftJoin(teachers, eq(scheduleResults.teacherId, teachers.id))
      .where(and(...conditions))
      .orderBy(scheduleResults.date, scheduleResults.timeSlot);

    // 获取已填写上课记录的课程
    const scheduleIds = schedules.map(s => s.scheduleId);
    const existingRecords = scheduleIds.length > 0 
      ? await db
          .select({ scheduleId: classRecords.scheduleId })
          .from(classRecords)
          .where(sql`${classRecords.scheduleId} IN ${scheduleIds}`)
      : [];

    const recordedScheduleIds = new Set(existingRecords.map(r => r.scheduleId));

    // 为每个课程添加上课记录状态
    const schedulesWithRecordStatus = schedules.map(schedule => ({
      ...schedule,
      hasRecord: schedule.scheduleId ? recordedScheduleIds.has(schedule.scheduleId) : false,
    }));

    // 统计信息
    const stats = {
      totalCourses: schedules.length,
      pendingCourses: schedules.filter(s => s.status === '待确认').length,
      confirmedCourses: schedules.filter(s => s.status === '已确认').length,
      completedCourses: schedules.filter(s => s.status === '已完成').length,
      totalHours: schedules.reduce((sum, s) => sum + (s.hours || 0), 0),
      pendingRecords: schedules.filter(s => !recordedScheduleIds.has(s.scheduleId) && s.status === '已完成').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        schedules: schedulesWithRecordStatus,
        stats,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('获取导师课程失败:', error);
    return NextResponse.json(
      { success: false, error: '获取课程安排失败' },
      { status: 500 }
    );
  }
}

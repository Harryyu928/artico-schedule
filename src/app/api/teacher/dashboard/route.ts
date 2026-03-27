import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scheduleResults, students, classRecords, teachers, courses } from '@/db/schema';
import { eq, and, gte, lte, sql, count, sum, inArray } from 'drizzle-orm';

/**
 * GET /api/teacher/dashboard
 * Get teacher dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'Missing teacher ID' },
        { status: 400 }
      );
    }

    // Get teacher info
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, teacherId))
      .limit(1);

    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'Teacher not found' },
        { status: 404 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Get week date range
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // 1. Today's course count
    const [{ todayCourses }] = await db
      .select({ todayCourses: count() })
      .from(scheduleResults)
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          eq(scheduleResults.date, todayStr)
        )
      );

    // 2. Today's schedule list
    const todaySchedules = await db
      .select({
        id: scheduleResults.id,
        scheduleId: scheduleResults.scheduleId,
        date: scheduleResults.date,
        timeSlot: scheduleResults.timeSlot,
        hours: scheduleResults.hours,
        status: scheduleResults.status,
        student: {
          id: students.id,
          studentId: students.studentId,
          name: students.name,
        },
        course: {
          id: courses.id,
          courseId: courses.courseId,
          name: courses.name,
          category: courses.category,
        },
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          eq(scheduleResults.date, todayStr)
        )
      )
      .orderBy(scheduleResults.timeSlot);

    // 3. Week hours statistics
    const [{ weekHours }] = await db
      .select({ weekHours: sum(scheduleResults.hours) })
      .from(scheduleResults)
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          gte(scheduleResults.date, mondayStr),
          lte(scheduleResults.date, sundayStr)
        )
      );

    // 4. Total students
    const [{ totalStudents }] = await db
      .select({ totalStudents: count(sql`DISTINCT ${scheduleResults.studentId}`) })
      .from(scheduleResults)
      .where(eq(scheduleResults.teacherId, teacherId));

    // 5. Pending records count
    const completedScheduleIds = await db
      .select({ scheduleId: scheduleResults.scheduleId })
      .from(scheduleResults)
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          eq(scheduleResults.status, '已完成')
        )
      );

    let pendingRecords = 0;
    if (completedScheduleIds.length > 0) {
      const scheduleIdList = completedScheduleIds.map(s => s.scheduleId).filter(Boolean);
      
      if (scheduleIdList.length > 0) {
        const recordsCount = await db
          .select({ scheduleId: classRecords.scheduleId })
          .from(classRecords)
          .where(inArray(classRecords.scheduleId, scheduleIdList));

        const recordedIds = new Set(recordsCount.map(r => r.scheduleId));
        pendingRecords = scheduleIdList.filter(id => !recordedIds.has(id)).length;
      }
    }

    // 6. Recent students progress
    const recentStudents = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        major: students.major,
        currentStage: students.currentStage,
        consumedHours: students.consumedHours,
        totalHours: students.totalHours,
      })
      .from(students)
      .leftJoin(scheduleResults, eq(students.id, scheduleResults.studentId))
      .where(eq(scheduleResults.teacherId, teacherId))
      .groupBy(students.id)
      .limit(5);

    const studentsWithProgress = recentStudents.map(student => ({
      ...student,
      progressPercentage: student.totalHours > 0 
        ? Math.round((student.consumedHours / student.totalHours) * 100) 
        : 0,
    }));

    // 7. Week schedules by day
    const weekSchedules = await db
      .select({
        date: scheduleResults.date,
        weekDay: scheduleResults.weekDay,
        timeSlot: scheduleResults.timeSlot,
        student: {
          id: students.id,
          name: students.name,
        },
        course: {
          id: courses.id,
          name: courses.name,
          category: courses.category,
        },
        status: scheduleResults.status,
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .where(
        and(
          eq(scheduleResults.teacherId, teacherId),
          gte(scheduleResults.date, mondayStr),
          lte(scheduleResults.date, sundayStr)
        )
      )
      .orderBy(scheduleResults.date, scheduleResults.timeSlot);

    // Group by day
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const schedulesByDay = weekDays.map((day, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      return {
        day,
        date: d.toISOString().split('T')[0],
        courses: weekSchedules.filter(s => s.weekDay === day),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          teacherId: teacher.teacherId,
          name: teacher.name,
          teacherType: teacher.teacherType,
          maxWeeklyHours: teacher.maxWeeklyHours,
        },
        stats: {
          todayCourses: Number(todayCourses) || 0,
          weekHours: Number(weekHours) || 0,
          maxWeekHours: teacher.maxWeeklyHours,
          totalStudents: Number(totalStudents) || 0,
          pendingRecords,
        },
        todaySchedules,
        weekSchedules: schedulesByDay,
        recentStudents: studentsWithProgress,
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get dashboard data' },
      { status: 500 }
    );
  }
}

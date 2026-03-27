import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, courses, teachers, scheduleResults, courseSelectionItems } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/teacher/records
 * 获取上课记录列表
 * Query params:
 * - teacherId: 导师ID（可选）
 * - studentId: 学生ID（可选）
 * - status: 状态筛选（可选）
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    
    if (teacherId) {
      conditions.push(eq(classRecords.teacherId, teacherId));
    }
    
    if (studentId) {
      conditions.push(eq(classRecords.studentId, studentId));
    }
    
    if (status) {
      conditions.push(eq(classRecords.attendanceStatus, status as any));
    }
    
    if (startDate) {
      conditions.push(gte(classRecords.classDate, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(classRecords.classDate, endDate));
    }

    // 查询上课记录
    const records = await db
      .select({
        id: classRecords.id,
        recordId: classRecords.recordId,
        scheduleId: classRecords.scheduleId,
        classDate: classRecords.classDate,
        weekDay: classRecords.weekDay,
        startTime: classRecords.startTime,
        endTime: classRecords.endTime,
        actualDuration: classRecords.actualDuration,
        attendanceStatus: classRecords.attendanceStatus,
        contentSummary: classRecords.contentSummary,
        studentPerformance: classRecords.studentPerformance,
        homeworkAssigned: classRecords.homeworkAssigned,
        nextClassPlan: classRecords.nextClassPlan,
        homeworkScore: classRecords.homeworkScore,
        isSettled: classRecords.isSettled,
        settlementStatus: classRecords.settlementStatus,
        createdAt: classRecords.createdAt,
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
      .from(classRecords)
      .leftJoin(students, eq(classRecords.studentId, students.id))
      .leftJoin(courses, eq(classRecords.courseId, courses.id))
      .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(classRecords.classDate))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(classRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit),
        },
      },
    });
  } catch (error) {
    console.error('获取上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取上课记录失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/records
 * 创建上课记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scheduleId,
      studentId,
      teacherId,
      courseId,
      selectionItemId,
      classDate,
      weekDay,
      startTime,
      endTime,
      actualDuration,
      courseCategory,
      courseContentDetail,
      contentSummary,
      teachingMethod,
      studentPerformance,
      homeworkAssigned,
      homeworkDeadline,
      nextClassPlan,
      teacherFeedback,
      projectPhase,
      phaseContent,
      attachments,
      createdBy,
    } = body;

    // 验证必填字段
    if (!studentId || !teacherId || !courseId || !classDate || !contentSummary) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 生成记录ID
    const id = uuidv4();
    const recordId = `CR${Date.now().toString(36).toUpperCase()}`;

    // 计算年份月份
    const classDateObj = new Date(classDate);
    const classYear = classDateObj.getFullYear();
    const classMonth = classDateObj.getMonth() + 1;

    // Create class record
    const [record] = await db.insert(classRecords).values({
      id,
      recordId,
      scheduleId,
      studentId,
      teacherId,
      courseId,
      selectionItemId,
      classDate: classDate,  // Keep as string format (YYYY-MM-DD)
      weekDay: weekDay as any,
      startTime: startTime as any,
      endTime,
      actualDuration: actualDuration || 120,
      courseCategory,
      courseContentDetail,
      contentSummary,
      teachingMethod,
      studentPerformance,
      homeworkAssigned,
      homeworkDeadline: homeworkDeadline || undefined,
      nextClassPlan,
      teacherFeedback,
      projectPhase: projectPhase as any,
      phaseContent,
      attachments,
      createdBy: createdBy || teacherId,
      classYear,
      classMonth,
      attendanceStatus: '已完成',
      attendanceStatusFeishu: '正常',
    }).returning();

    // 如果是从课程安排创建的，更新课程安排状态
    if (scheduleId) {
      await db
        .update(scheduleResults)
        .set({ status: '已完成', updatedAt: new Date() })
        .where(eq(scheduleResults.scheduleId, scheduleId));
    }

    // 更新学生已消耗课时
    await db
      .update(students)
      .set({
        consumedHours: sql`${students.consumedHours} + ${actualDuration || 120} / 60`,
        remainingHours: sql`${students.remainingHours} - ${actualDuration || 120} / 60`,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    return NextResponse.json({
      success: true,
      data: record,
      message: '上课记录创建成功',
    });
  } catch (error) {
    console.error('创建上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建上课记录失败' },
      { status: 500 }
    );
  }
}

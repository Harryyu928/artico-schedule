import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, courses, teachers, scheduleResults } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/teacher/records/[id]
 * 获取单个上课记录详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [record] = await db
      .select()
      .from(classRecords)
      .where(eq(classRecords.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    // 获取关联信息
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, record.studentId))
      .limit(1);

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, record.courseId))
      .limit(1);

    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, record.teacherId))
      .limit(1);

    // 获取课程安排信息（如果有）
    let schedule = null;
    if (record.scheduleId) {
      const [scheduleResult] = await db
        .select()
        .from(scheduleResults)
        .where(eq(scheduleResults.scheduleId, record.scheduleId))
        .limit(1);
      schedule = scheduleResult;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        student,
        course,
        teacher,
        schedule,
      },
    });
  } catch (error) {
    console.error('获取上课记录详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取记录详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/teacher/records/[id]
 * 更新上课记录
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 检查记录是否存在
    const [existingRecord] = await db
      .select()
      .from(classRecords)
      .where(eq(classRecords.id, id))
      .limit(1);

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    // 更新记录
    const [updatedRecord] = await db
      .update(classRecords)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: '记录更新成功',
    });
  } catch (error) {
    console.error('更新上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '更新记录失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teacher/records/[id]
 * 删除上课记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查记录是否存在
    const [existingRecord] = await db
      .select()
      .from(classRecords)
      .where(eq(classRecords.id, id))
      .limit(1);

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    // 删除记录
    await db.delete(classRecords).where(eq(classRecords.id, id));

    // 如果有关联的课程安排，恢复其状态
    if (existingRecord.scheduleId) {
      await db
        .update(scheduleResults)
        .set({ status: '已确认', updatedAt: new Date() })
        .where(eq(scheduleResults.scheduleId, existingRecord.scheduleId));
    }

    // 回滚学生已消耗课时
    const duration = existingRecord.actualDuration || 120;
    await db
      .update(students)
      .set({
        consumedHours: sql`${students.consumedHours} - ${duration / 60}`,
        remainingHours: sql`${students.remainingHours} + ${duration / 60}`,
        updatedAt: new Date(),
      })
      .where(eq(students.id, existingRecord.studentId));

    return NextResponse.json({
      success: true,
      message: '记录删除成功',
    });
  } catch (error) {
    console.error('删除上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '删除记录失败' },
      { status: 500 }
    );
  }
}

import { sql } from 'drizzle-orm';

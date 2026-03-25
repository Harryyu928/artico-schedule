/**
 * 学生签字 API
 * 
 * GET  /api/sign/[token] - 通过token获取记录信息（公开）
 * POST /api/sign/[token] - 学生签字确认（公开）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - 通过token获取记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // 通过token查找记录
    const records = await db.select({
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
      attendanceStatus: classRecords.attendanceStatus,
      homeworkAssigned: classRecords.homeworkAssigned,
      homeworkDeadline: classRecords.homeworkDeadline,
      homeworkCompletionRate: classRecords.homeworkCompletionRate,
      lastHomeworkQuality: classRecords.lastHomeworkQuality,
      teacherFeedback: classRecords.teacherFeedback,
      nextClassPlan: classRecords.nextClassPlan,
      projectPhase: classRecords.projectPhase,
      studentSignature: classRecords.studentSignature,
      signatureTime: classRecords.signatureTime,
      pdfUrl: classRecords.pdfUrl,
      signTokenExpiresAt: classRecords.signTokenExpiresAt,
      // 关联信息
      studentName: students.name,
      teacherName: teachers.name,
      courseName: courses.name,
    })
    .from(classRecords)
    .leftJoin(students, eq(classRecords.studentId, students.id))
    .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
    .leftJoin(courses, eq(classRecords.courseId, courses.id))
    .where(eq(classRecords.signToken, token))
    .limit(1);
    
    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的签字链接' },
        { status: 404 }
      );
    }
    
    const record = records[0];
    
    // 检查链接是否过期
    if (record.signTokenExpiresAt) {
      const expiresAt = new Date(record.signTokenExpiresAt);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: '链接已过期' },
          { status: 410 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('获取签字记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// POST - 学生签字
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    // 通过token查找记录
    const records = await db.select()
      .from(classRecords)
      .where(eq(classRecords.signToken, token))
      .limit(1);
    
    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的签字链接' },
        { status: 404 }
      );
    }
    
    const record = records[0];
    
    // 检查链接是否过期
    if (record.signTokenExpiresAt) {
      const expiresAt = new Date(record.signTokenExpiresAt);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: '链接已过期' },
          { status: 410 }
        );
      }
    }
    
    // 检查是否已签字
    if (record.studentSignature) {
      return NextResponse.json(
        { success: false, error: '此记录已签字' },
        { status: 400 }
      );
    }
    
    // 更新签字信息
    await db.update(classRecords)
      .set({
        studentSignature: body.studentSignature || `signed_online_${Date.now()}`,
        signatureTime: new Date(),
        signatureMethod: body.signatureMethod || 'online',
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, record.id));
    
    return NextResponse.json({
      success: true,
      message: '签字成功',
    });
  } catch (error) {
    console.error('签字失败:', error);
    return NextResponse.json(
      { success: false, error: '签字失败' },
      { status: 500 }
    );
  }
}

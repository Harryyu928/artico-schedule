/**
 * 单个上课记录 API
 * 
 * GET    /api/class-records/[id]    - 获取记录详情
 * PUT    /api/class-records/[id]    - 更新记录
 * DELETE /api/class-records/[id]    - 删除记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// GET - 获取单个记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const record = await db.select({
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
      studentPerformance: classRecords.studentPerformance,
      attendanceStatus: classRecords.attendanceStatus,
      homeworkAssigned: classRecords.homeworkAssigned,
      homeworkDeadline: classRecords.homeworkDeadline,
      homeworkCompletionRate: classRecords.homeworkCompletionRate,
      lastHomeworkQuality: classRecords.lastHomeworkQuality,
      nextClassPlan: classRecords.nextClassPlan,
      teacherFeedback: classRecords.teacherFeedback,
      studentFeedback: classRecords.studentFeedback,
      projectPhase: classRecords.projectPhase,
      phaseContent: classRecords.phaseContent,
      attachments: classRecords.attachments,
      pdfUrl: classRecords.pdfUrl,
      pdfGeneratedAt: classRecords.pdfGeneratedAt,
      studentSignature: classRecords.studentSignature,
      signatureTime: classRecords.signatureTime,
      signatureMethod: classRecords.signatureMethod,
      signToken: classRecords.signToken,
      signTokenExpiresAt: classRecords.signTokenExpiresAt,
      signLinkSentAt: classRecords.signLinkSentAt,
      signLinkSentTo: classRecords.signLinkSentTo,
      createdAt: classRecords.createdAt,
      updatedAt: classRecords.updatedAt,
      // 关联信息
      studentName: students.name,
      studentPhone: students.phone,
      studentEmail: students.email,
      teacherName: teachers.name,
      teacherEmail: teachers.email,
      courseName: courses.name,
    })
    .from(classRecords)
    .leftJoin(students, eq(classRecords.studentId, students.id))
    .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
    .leftJoin(courses, eq(classRecords.courseId, courses.id))
    .where(eq(classRecords.id, id))
    .limit(1);
    
    if (record.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }
    
    // 生成签字链接
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signLink = record[0].signToken 
      ? `${domain}/sign/${record[0].signToken}` 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        ...record[0],
        signLink,
      },
    });
  } catch (error) {
    console.error('获取记录详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 检查记录是否存在
    const existing = await db.select()
      .from(classRecords)
      .where(eq(classRecords.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }
    
    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    // 基本字段更新
    const updatableFields = [
      'studentId', 'teacherId', 'courseId',
      'courseCategory', 'courseContentDetail',
      'classDate', 'weekDay', 'startTime', 'endTime', 'actualDuration',
      'contentSummary', 'teachingMethod', 'studentPerformance',
      'attendanceStatus',
      'homeworkAssigned', 'homeworkDeadline', 'homeworkCompletionRate', 'lastHomeworkQuality',
      'nextClassPlan', 'teacherFeedback', 'studentFeedback',
      'projectPhase', 'phaseContent', 'attachments',
    ];
    
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    
    // 签字相关
    if (body.studentSignature !== undefined) {
      updateData.studentSignature = body.studentSignature;
      updateData.signatureTime = new Date();
      updateData.signatureMethod = body.signatureMethod || 'online';
    }
    
    // 签字链接发送记录
    if (body.signLinkSentTo !== undefined) {
      updateData.signLinkSentTo = body.signLinkSentTo;
      updateData.signLinkSentAt = new Date();
    }
    
    await db.update(classRecords)
      .set(updateData)
      .where(eq(classRecords.id, id));
    
    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新记录失败:', error);
    return NextResponse.json(
      { success: false, error: '更新记录失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.delete(classRecords).where(eq(classRecords.id, id));
    
    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除记录失败:', error);
    return NextResponse.json(
      { success: false, error: '删除记录失败' },
      { status: 500 }
    );
  }
}

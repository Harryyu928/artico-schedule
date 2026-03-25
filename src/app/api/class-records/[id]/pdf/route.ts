/**
 * 上课记录 PDF 生成 API
 * 
 * POST /api/class-records/[id]/pdf - 生成并上传 PDF
 * GET /api/class-records/[id]/pdf - 获取 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateAndUploadPDF, getPDFSignedUrl } from '@/lib/pdf-generator';

// POST - 生成 PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取上课记录详情
    const records = await db
      .select({
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
        studentSignature: classRecords.studentSignature,
        signatureTime: classRecords.signatureTime,
        signToken: classRecords.signToken,
        studentName: students.name,
        teacherName: teachers.name,
        courseName: courses.name,
      })
      .from(classRecords)
      .leftJoin(students, eq(classRecords.studentId, students.id))
      .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
      .leftJoin(courses, eq(classRecords.courseId, courses.id))
      .where(eq(classRecords.id, id))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    const record = records[0];

    // 生成签字链接
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signLink = record.signToken 
      ? `${domain}/sign/${record.signToken}`
      : undefined;

    // 生成 PDF
    const { key, url } = await generateAndUploadPDF({
      recordId: record.recordId,
      studentName: record.studentName || '未知学生',
      teacherName: record.teacherName || '未知导师',
      courseName: record.courseName || '未知课程',
      courseCategory: record.courseCategory || undefined,
      courseContentDetail: record.courseContentDetail || undefined,
      classDate: record.classDate,
      weekDay: record.weekDay,
      startTime: record.startTime,
      endTime: record.endTime || undefined,
      actualDuration: record.actualDuration,
      contentSummary: record.contentSummary,
      teachingMethod: record.teachingMethod || undefined,
      studentPerformance: record.studentPerformance || undefined,
      attendanceStatus: record.attendanceStatus,
      homeworkAssigned: record.homeworkAssigned || undefined,
      homeworkDeadline: record.homeworkDeadline || undefined,
      homeworkCompletionRate: record.homeworkCompletionRate || undefined,
      lastHomeworkQuality: record.lastHomeworkQuality || undefined,
      nextClassPlan: record.nextClassPlan || undefined,
      teacherFeedback: record.teacherFeedback || undefined,
      studentFeedback: record.studentFeedback || undefined,
      projectPhase: record.projectPhase || undefined,
      phaseContent: record.phaseContent || undefined,
      attachments: record.attachments || undefined,
      studentSignature: record.studentSignature || undefined,
      signatureTime: record.signatureTime 
        ? new Date(record.signatureTime).toLocaleString('zh-CN')
        : undefined,
      signLink,
    });

    // 更新数据库
    await db
      .update(classRecords)
      .set({
        pdfUrl: key,
        pdfGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, id));

    return NextResponse.json({
      success: true,
      data: {
        pdfKey: key,
        pdfUrl: url,
      },
    });
  } catch (error) {
    console.error('生成PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '生成PDF失败' },
      { status: 500 }
    );
  }
}

// GET - 获取 PDF 下载链接
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取上课记录
    const records = await db
      .select({
        pdfUrl: classRecords.pdfUrl,
        recordId: classRecords.recordId,
      })
      .from(classRecords)
      .where(eq(classRecords.id, id))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    const record = records[0];

    if (!record.pdfUrl) {
      return NextResponse.json(
        { success: false, error: 'PDF尚未生成' },
        { status: 404 }
      );
    }

    // 获取签名 URL
    const signedUrl = await getPDFSignedUrl(record.pdfUrl);

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl: signedUrl,
        fileName: `${record.recordId}.pdf`,
      },
    });
  } catch (error) {
    console.error('获取PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '获取PDF失败' },
      { status: 500 }
    );
  }
}

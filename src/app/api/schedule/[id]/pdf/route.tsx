/**
 * 排课确认单 PDF 生成 API
 * 
 * POST /api/schedule/[id]/pdf - 生成并上传 PDF
 * GET /api/schedule/[id]/pdf - 获取 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scheduleResults, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  generateAndUploadPDF,
  getPDFSignedUrl,
  prepareSignatureInfo,
  formatDate,
} from '@/lib/pdf-service';
import { SchedulePDF } from '@/lib/pdf-templates/schedule-pdf';

// POST - 生成 PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取排课详情
    const schedules = await db
      .select({
        id: scheduleResults.id,
        scheduleId: scheduleResults.scheduleId,
        studentId: scheduleResults.studentId,
        teacherId: scheduleResults.teacherId,
        courseId: scheduleResults.courseId,
        date: scheduleResults.date,
        weekDay: scheduleResults.weekDay,
        timeSlot: scheduleResults.timeSlot,
        hours: scheduleResults.hours,
        status: scheduleResults.status,
        notes: scheduleResults.notes,
        pdfUrl: scheduleResults.pdfUrl,
        studentSignature: scheduleResults.studentSignature,
        signatureTime: scheduleResults.signatureTime,
        signToken: scheduleResults.signToken,
        studentName: students.name,
        studentSid: students.studentId,
        studentPhone: students.phone,
        studentEmail: students.email,
        teacherName: teachers.name,
        teacherType: teachers.teacherType,
        teacherPhone: teachers.phone,
        teacherEmail: teachers.email,
        courseName: courses.name,
        courseType: courses.type,
        courseCategory: courses.category,
      })
      .from(scheduleResults)
      .leftJoin(students, eq(scheduleResults.studentId, students.id))
      .leftJoin(teachers, eq(scheduleResults.teacherId, teachers.id))
      .leftJoin(courses, eq(scheduleResults.courseId, courses.id))
      .where(eq(scheduleResults.id, id))
      .limit(1);

    if (schedules.length === 0) {
      return NextResponse.json(
        { success: false, error: '排课记录不存在' },
        { status: 404 }
      );
    }

    const schedule = schedules[0];

    // 准备签字信息
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signatureInfo = await prepareSignatureInfo(
      schedule.signToken || undefined,
      schedule.studentSignature || undefined,
      schedule.signatureTime || undefined,
      domain
    );

    // 生成 PDF
    const pdfData = {
      scheduleId: schedule.scheduleId,
      studentName: schedule.studentName || '未知学生',
      studentId: schedule.studentSid || undefined,
      studentPhone: schedule.studentPhone || undefined,
      studentEmail: schedule.studentEmail || undefined,
      teacherName: schedule.teacherName || '未知导师',
      teacherType: schedule.teacherType || undefined,
      teacherPhone: schedule.teacherPhone || undefined,
      teacherEmail: schedule.teacherEmail || undefined,
      courseName: schedule.courseName || '未知课程',
      courseType: schedule.courseType || undefined,
      courseCategory: schedule.courseCategory || undefined,
      classDate: formatDate(schedule.date),
      weekDay: schedule.weekDay,
      timeSlot: schedule.timeSlot,
      hours: schedule.hours,
      status: schedule.status,
      notes: schedule.notes || undefined,
      studentSignature: signatureInfo.signature,
      signatureTime: signatureInfo.signatureTime,
      signLink: signatureInfo.signLink,
      qrCodeDataUrl: signatureInfo.qrCodeDataUrl,
    };

    const { key, url } = await generateAndUploadPDF(
      'schedule',
      schedule.scheduleId,
      <SchedulePDF data={pdfData} />,
      signatureInfo
    );

    // 更新数据库
    const updateData: Record<string, unknown> = {
      pdfUrl: key,
      pdfGeneratedAt: new Date(),
      updatedAt: new Date(),
    };

    // 如果生成了新的签字token，保存到数据库
    if (signatureInfo.signToken && !schedule.signToken) {
      updateData.signToken = signatureInfo.signToken;
      updateData.signTokenExpiresAt = signatureInfo.signLinkExpiresAt 
        ? new Date(signatureInfo.signLinkExpiresAt) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await db
      .update(scheduleResults)
      .set(updateData)
      .where(eq(scheduleResults.id, id));

    return NextResponse.json({
      success: true,
      data: {
        pdfKey: key,
        pdfUrl: url,
        signLink: signatureInfo.signLink,
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

    // 获取排课记录
    const schedules = await db
      .select({
        pdfUrl: scheduleResults.pdfUrl,
        scheduleId: scheduleResults.scheduleId,
      })
      .from(scheduleResults)
      .where(eq(scheduleResults.id, id))
      .limit(1);

    if (schedules.length === 0) {
      return NextResponse.json(
        { success: false, error: '排课记录不存在' },
        { status: 404 }
      );
    }

    const schedule = schedules[0];

    if (!schedule.pdfUrl) {
      return NextResponse.json(
        { success: false, error: 'PDF尚未生成' },
        { status: 404 }
      );
    }

    // 获取签名 URL
    const signedUrl = await getPDFSignedUrl(schedule.pdfUrl);

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl: signedUrl,
        fileName: `排课确认单_${schedule.scheduleId}.pdf`,
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

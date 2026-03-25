/**
 * 发送签字链接 API
 * 
 * POST /api/class-records/[id]/send-sign-link - 发送签字链接给学生
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, generateSignLinkEmailHtml, generateSignLinkEmailText } from '@/lib/email';

// POST - 发送签字链接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    // 获取上课记录详情
    const records = await db
      .select({
        id: classRecords.id,
        recordId: classRecords.recordId,
        studentId: classRecords.studentId,
        teacherId: classRecords.teacherId,
        courseId: classRecords.courseId,
        classDate: classRecords.classDate,
        signToken: classRecords.signToken,
        signTokenExpiresAt: classRecords.signTokenExpiresAt,
        signLinkSentAt: classRecords.signLinkSentAt,
        signLinkSentTo: classRecords.signLinkSentTo,
        studentSignature: classRecords.studentSignature,
        studentName: students.name,
        studentEmail: students.email,
        studentPhone: students.phone,
        studentWechat: students.wechat,
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

    // 检查是否已签字
    if (record.studentSignature) {
      return NextResponse.json(
        { success: false, error: '学生已签字，无需再次发送' },
        { status: 400 }
      );
    }

    // 检查签字Token
    if (!record.signToken) {
      return NextResponse.json(
        { success: false, error: '签字链接未生成，请先保存记录' },
        { status: 400 }
      );
    }

    // 检查链接是否过期
    if (record.signTokenExpiresAt) {
      const expiresAt = new Date(record.signTokenExpiresAt);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: '签字链接已过期，请重新生成' },
          { status: 400 }
        );
      }
    }

    // 获取收件人邮箱
    const toEmail = body.email || record.studentEmail;
    
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: '学生邮箱未设置，请先完善学生信息' },
        { status: 400 }
      );
    }

    // 生成签字链接
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signLink = `${domain}/sign/${record.signToken}`;

    // 计算过期时间描述
    let expiresIn = '7天';
    if (record.signTokenExpiresAt) {
      const expiresAt = new Date(record.signTokenExpiresAt);
      const now = new Date();
      const diffHours = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (diffHours < 24) {
        expiresIn = `${diffHours}小时`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        expiresIn = `${diffDays}天`;
      }
    }

    // 生成邮件内容
    const emailHtml = generateSignLinkEmailHtml({
      studentName: record.studentName || '同学',
      teacherName: record.teacherName || '导师',
      courseName: record.courseName || '课程',
      classDate: record.classDate,
      signLink,
      expiresIn,
    });

    const emailText = generateSignLinkEmailText({
      studentName: record.studentName || '同学',
      teacherName: record.teacherName || '导师',
      courseName: record.courseName || '课程',
      classDate: record.classDate,
      signLink,
      expiresIn,
    });

    // 发送邮件
    const emailResult = await sendEmail({
      to: toEmail,
      subject: `【ARTiCO】上课记录签字确认 - ${record.courseName} (${record.classDate})`,
      html: emailHtml,
      text: emailText,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error || '邮件发送失败' },
        { status: 500 }
      );
    }

    // 更新发送记录
    await db
      .update(classRecords)
      .set({
        signLinkSentAt: new Date(),
        signLinkSentTo: toEmail,
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, id));

    return NextResponse.json({
      success: true,
      message: '签字链接已发送',
      data: {
        messageId: emailResult.messageId,
        sentTo: toEmail,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('发送签字链接失败:', error);
    return NextResponse.json(
      { success: false, error: '发送失败' },
      { status: 500 }
    );
  }
}

// GET - 获取发送状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const records = await db
      .select({
        signLinkSentAt: classRecords.signLinkSentAt,
        signLinkSentTo: classRecords.signLinkSentTo,
        signToken: classRecords.signToken,
        signTokenExpiresAt: classRecords.signTokenExpiresAt,
        studentSignature: classRecords.studentSignature,
        studentEmail: students.email,
      })
      .from(classRecords)
      .leftJoin(students, eq(classRecords.studentId, students.id))
      .where(eq(classRecords.id, id))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    const record = records[0];

    return NextResponse.json({
      success: true,
      data: {
        hasToken: !!record.signToken,
        expiresAt: record.signTokenExpiresAt,
        sentAt: record.signLinkSentAt,
        sentTo: record.signLinkSentTo,
        isSigned: !!record.studentSignature,
        studentEmail: record.studentEmail,
      },
    });
  } catch (error) {
    console.error('获取发送状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

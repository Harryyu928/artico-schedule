/**
 * 选课单 PDF 生成 API
 * 
 * POST /api/selection-forms/[id]/pdf - 生成并上传 PDF
 * GET /api/selection-forms/[id]/pdf - 获取 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  courseSelectionForms, 
  courseSelectionItems, 
  students, 
  courses, 
  users 
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  generateAndUploadPDF,
  getPDFSignedUrl,
  prepareSignatureInfo,
  formatDate,
} from '@/lib/pdf-service';
import { SelectionFormPDF } from '@/lib/pdf-templates/selection-form-pdf';

// POST - 生成 PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取选课单详情
    const forms = await db
      .select({
        id: courseSelectionForms.id,
        formId: courseSelectionForms.formId,
        studentId: courseSelectionForms.studentId,
        status: courseSelectionForms.status,
        totalPlannedHours: courseSelectionForms.totalPlannedHours,
        estimatedStartDate: courseSelectionForms.estimatedStartDate,
        estimatedEndDate: courseSelectionForms.estimatedEndDate,
        actualStartDate: courseSelectionForms.actualStartDate,
        actualEndDate: courseSelectionForms.actualEndDate,
        totalCourses: courseSelectionForms.totalCourses,
        completedCourses: courseSelectionForms.completedCourses,
        totalHours: courseSelectionForms.totalHours,
        completedHours: courseSelectionForms.completedHours,
        notes: courseSelectionForms.notes,
        goals: courseSelectionForms.goals,
        pdfUrl: courseSelectionForms.pdfUrl,
        studentSignature: courseSelectionForms.studentSignature,
        signatureTime: courseSelectionForms.signatureTime,
        signToken: courseSelectionForms.signToken,
        studentName: students.name,
        studentSid: students.studentId,
        major: students.major,
        applicationCountry: students.applicationCountry,
        currentStage: students.currentStage,
        consultantId: students.consultantId,
      })
      .from(courseSelectionForms)
      .leftJoin(students, eq(courseSelectionForms.studentId, students.id))
      .where(eq(courseSelectionForms.id, id))
      .limit(1);

    if (forms.length === 0) {
      return NextResponse.json(
        { success: false, error: '选课单不存在' },
        { status: 404 }
      );
    }

    const form = forms[0];

    // 获取规划顾问信息
    let consultantName = '-';
    if (form.consultantId) {
      const consultants = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, form.consultantId))
        .limit(1);
      if (consultants.length > 0) {
        consultantName = consultants[0].name;
      }
    }

    // 获取课程明细
    const items = await db
      .select({
        courseName: courses.name,
        courseType: courseSelectionItems.courseType,
        courseStage: courseSelectionItems.courseStage,
        plannedHours: courseSelectionItems.plannedHours,
        completedHours: courseSelectionItems.completedHours,
        status: courseSelectionItems.status,
        priority: courseSelectionItems.priority,
        plannedStartDate: courseSelectionItems.plannedStartDate,
        plannedEndDate: courseSelectionItems.plannedEndDate,
        notes: courseSelectionItems.notes,
      })
      .from(courseSelectionItems)
      .leftJoin(courses, eq(courseSelectionItems.courseId, courses.id))
      .where(eq(courseSelectionItems.formId, id))
      .orderBy(courseSelectionItems.priority);

    // 准备签字信息
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signatureInfo = await prepareSignatureInfo(
      form.signToken || undefined,
      form.studentSignature || undefined,
      form.signatureTime || undefined,
      domain
    );

    // 生成 PDF
    const pdfData = {
      formId: form.formId,
      studentName: form.studentName || '未知学生',
      studentId: form.studentSid || undefined,
      major: form.major || undefined,
      applicationCountry: form.applicationCountry || undefined,
      currentStage: form.currentStage || undefined,
      consultantName,
      totalPlannedHours: form.totalPlannedHours,
      estimatedStartDate: formatDate(form.estimatedStartDate),
      estimatedEndDate: formatDate(form.estimatedEndDate),
      actualStartDate: form.actualStartDate ? formatDate(form.actualStartDate) : undefined,
      actualEndDate: form.actualEndDate ? formatDate(form.actualEndDate) : undefined,
      totalCourses: form.totalCourses,
      completedCourses: form.completedCourses,
      totalHours: form.totalHours,
      completedHours: form.completedHours,
      status: form.status,
      courses: items.map(item => ({
        courseName: item.courseName || '未知课程',
        courseType: item.courseType,
        courseStage: item.courseStage,
        plannedHours: item.plannedHours,
        completedHours: item.completedHours,
        status: item.status,
        priority: item.priority,
        plannedStartDate: item.plannedStartDate ? formatDate(item.plannedStartDate) : undefined,
        plannedEndDate: item.plannedEndDate ? formatDate(item.plannedEndDate) : undefined,
        notes: item.notes || undefined,
      })),
      notes: form.notes || undefined,
      goals: form.goals || undefined,
      studentSignature: signatureInfo.signature,
      signatureTime: signatureInfo.signatureTime,
      signLink: signatureInfo.signLink,
      qrCodeDataUrl: signatureInfo.qrCodeDataUrl,
    };

    const { key, url } = await generateAndUploadPDF(
      'selection-form',
      form.formId,
      <SelectionFormPDF data={pdfData} />,
      signatureInfo
    );

    // 更新数据库
    const updateData: Record<string, unknown> = {
      pdfUrl: key,
      pdfGeneratedAt: new Date(),
      updatedAt: new Date(),
    };

    // 如果生成了新的签字token，保存到数据库
    if (signatureInfo.signToken && !form.signToken) {
      updateData.signToken = signatureInfo.signToken;
      updateData.signTokenExpiresAt = signatureInfo.signLinkExpiresAt 
        ? new Date(signatureInfo.signLinkExpiresAt) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await db
      .update(courseSelectionForms)
      .set(updateData)
      .where(eq(courseSelectionForms.id, id));

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

    // 获取选课单
    const forms = await db
      .select({
        pdfUrl: courseSelectionForms.pdfUrl,
        formId: courseSelectionForms.formId,
      })
      .from(courseSelectionForms)
      .where(eq(courseSelectionForms.id, id))
      .limit(1);

    if (forms.length === 0) {
      return NextResponse.json(
        { success: false, error: '选课单不存在' },
        { status: 404 }
      );
    }

    const form = forms[0];

    if (!form.pdfUrl) {
      return NextResponse.json(
        { success: false, error: 'PDF尚未生成' },
        { status: 404 }
      );
    }

    // 获取签名 URL
    const signedUrl = await getPDFSignedUrl(form.pdfUrl);

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl: signedUrl,
        fileName: `选课单_${form.formId}.pdf`,
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

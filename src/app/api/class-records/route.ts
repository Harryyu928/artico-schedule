/**
 * 上课记录 API
 * 
 * POST   /api/class-records         - 创建记录
 * GET    /api/class-records         - 获取记录列表
 * PUT    /api/class-records/[id]    - 更新记录
 * GET    /api/class-records/[id]/pdf - 下载PDF
 * POST   /api/class-records/[id]/sign-link - 生成签字链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq, desc, and, gte, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

// GET - 获取上课记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query = db.select({
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
      createdAt: classRecords.createdAt,
      // 关联信息
      studentName: students.name,
      teacherName: teachers.name,
      courseName: courses.name,
    })
    .from(classRecords)
    .leftJoin(students, eq(classRecords.studentId, students.id))
    .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
    .leftJoin(courses, eq(classRecords.courseId, courses.id))
    .$dynamic();
    
    // 状态筛选
    if (status && status !== 'all') {
      query = query.where(eq(classRecords.attendanceStatus, status as '已完成' | '已取消' | '已排课' | '学生缺席' | '补课')) as typeof query;
    }
    
    // 搜索
    if (search) {
      query = query.where(
        or(
          like(students.name, `%${search}%`),
          like(teachers.name, `%${search}%`),
          like(courses.name, `%${search}%`),
          like(classRecords.recordId, `%${search}%`)
        )
      ) as typeof query;
    }
    
    const records = await query.orderBy(desc(classRecords.createdAt)).limit(100);
    
    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('获取上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// POST - 创建上课记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const recordId = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const id = uuidv4();
    
    // 生成签字token（7天有效）
    const signToken = randomBytes(32).toString('hex');
    const signTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await db.insert(classRecords).values({
      id,
      recordId,
      studentId: body.studentId,
      teacherId: body.teacherId,
      courseId: body.courseId,
      courseCategory: body.courseCategory,
      courseContentDetail: body.courseContentDetail,
      classDate: body.classDate,
      weekDay: body.weekDay,
      startTime: body.startTime,
      endTime: body.endTime,
      actualDuration: body.actualDuration || 120,
      contentSummary: body.contentSummary,
      teachingMethod: body.teachingMethod,
      studentPerformance: body.studentPerformance,
      attendanceStatus: body.attendanceStatus || '已排课',
      homeworkAssigned: body.homeworkAssigned,
      homeworkDeadline: body.homeworkDeadline,
      homeworkCompletionRate: body.homeworkCompletionRate || 0,
      lastHomeworkQuality: body.lastHomeworkQuality,
      nextClassPlan: body.nextClassPlan,
      teacherFeedback: body.teacherFeedback,
      studentFeedback: body.studentFeedback,
      projectPhase: body.projectPhase,
      phaseContent: body.phaseContent,
      attachments: body.attachments,
      signToken,
      signTokenExpiresAt,
      createdBy: body.createdBy || 'system',
    });
    
    // 获取域名生成签字链接
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const signLink = `${domain}/sign/${signToken}`;
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        recordId,
        signToken,
        signLink,
        signTokenExpiresAt,
      },
    });
  } catch (error) {
    console.error('创建上课记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建记录失败' },
      { status: 500 }
    );
  }
}

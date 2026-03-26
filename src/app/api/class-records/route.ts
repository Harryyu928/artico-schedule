/**
 * 上课记录 API
 * 
 * POST   /api/class-records         - 创建记录
 * GET    /api/class-records         - 获取记录列表
 * PUT    /api/class-records/[id]    - 更新记录
 * GET    /api/class-records/[id]/pdf - 下载PDF
 * POST   /api/class-records/[id]/pdf - 生成PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classRecords, students, teachers, courses } from '@/db/schema';
import { eq, desc, and, gte, like, or, sql, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { generateAndUploadPDF } from '@/lib/pdf-generator';

// GET - 获取上课记录列表（支持分页和角色过滤）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    
    // 用户角色过滤参数（使用关联ID进行精确匹配）
    const userRole = searchParams.get('userRole');
    const teacherId = searchParams.get('teacherId');      // 导师关联ID
    const studentId = searchParams.get('studentId');      // 学生关联ID
    const consultantId = searchParams.get('consultantId'); // 顾问关联ID
    
    // 构建基础查询条件
    const conditions: any[] = [];
    
    // 状态筛选
    if (status && status !== 'all') {
      conditions.push(eq(classRecords.attendanceStatus, status as '已完成' | '已取消' | '已排课' | '学生缺席' | '补课'));
    }
    
    // 角色权限过滤（使用关联ID精确匹配）
    if (userRole) {
      if ((userRole === '全职导师' || userRole === '兼职导师') && teacherId) {
        // 导师只能看到自己的上课记录
        conditions.push(eq(classRecords.teacherId, teacherId));
      } else if (userRole === '规划顾问' && consultantId) {
        // 规划顾问能看到自己负责的学生
        // 查询 consultantId 对应的学生列表
        const consultantStudents = await db.select({ id: students.id })
          .from(students)
          .where(eq(students.consultantId, consultantId));
        
        if (consultantStudents.length > 0) {
          const studentIds = consultantStudents.map(s => s.id);
          conditions.push(sql`${classRecords.studentId} IN (${studentIds.map(id => `'${id}'`).join(',')})`);
        } else {
          // 如果没有负责的学生，返回空结果
          return NextResponse.json({
            success: true,
            records: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          });
        }
      } else if (userRole === '学生' && studentId) {
        // 学生只能看到自己的上课记录
        conditions.push(eq(classRecords.studentId, studentId));
      }
      // 管理员：不做过滤，看全部
    }
    
    // 搜索 - 需要特殊处理
    const hasSearch = search && search.trim();
    
    // 先获取总数
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(classRecords)
      .leftJoin(students, eq(classRecords.studentId, students.id))
      .leftJoin(teachers, eq(classRecords.teacherId, teachers.id))
      .leftJoin(courses, eq(classRecords.courseId, courses.id));
    
    let totalResult;
    const allConditions = [...conditions];
    
    if (hasSearch) {
      allConditions.push(
        or(
          like(students.name, `%${search}%`),
          like(teachers.name, `%${search}%`),
          like(courses.name, `%${search}%`),
          like(classRecords.recordId, `%${search}%`)
        )
      );
    }
    
    if (allConditions.length > 0) {
      totalResult = await countQuery.where(and(...allConditions));
    } else {
      totalResult = await countQuery;
    }
    
    const total = Number(totalResult[0]?.count) || 0;
    
    // 获取数据
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
    .leftJoin(courses, eq(classRecords.courseId, courses.id));
    
    // 应用筛选条件
    if (allConditions.length > 0) {
      query = query.where(and(...allConditions)) as typeof query;
    }
    
    const records = await query
      .orderBy(desc(classRecords.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    
    return NextResponse.json({
      success: true,
      records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
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
    
    // 如果状态是"已完成"，自动生成PDF
    let pdfUrl = null;
    if (body.attendanceStatus === '已完成') {
      try {
        // 获取关联信息
        const [student] = await db.select().from(students).where(eq(students.id, body.studentId)).limit(1);
        const [teacher] = await db.select().from(teachers).where(eq(teachers.id, body.teacherId)).limit(1);
        const [course] = await db.select().from(courses).where(eq(courses.id, body.courseId)).limit(1);
        
        // 生成PDF
        const pdfResult = await generateAndUploadPDF({
          recordId,
          studentName: student?.name || '未知学生',
          teacherName: teacher?.name || '未知导师',
          courseName: course?.name || '未知课程',
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
          homeworkCompletionRate: body.homeworkCompletionRate,
          lastHomeworkQuality: body.lastHomeworkQuality,
          nextClassPlan: body.nextClassPlan,
          teacherFeedback: body.teacherFeedback,
          studentFeedback: body.studentFeedback,
          projectPhase: body.projectPhase,
          phaseContent: body.phaseContent,
          attachments: body.attachments,
          signLink,
        });
        
        // 更新PDF URL
        await db.update(classRecords)
          .set({ pdfUrl: pdfResult.key, pdfGeneratedAt: new Date(), updatedAt: new Date() })
          .where(eq(classRecords.id, id));
        
        pdfUrl = pdfResult.url;
      } catch (pdfError) {
        console.error('自动生成PDF失败:', pdfError);
        // PDF生成失败不影响记录创建
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        recordId,
        signToken,
        signLink,
        signTokenExpiresAt,
        pdfUrl,
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

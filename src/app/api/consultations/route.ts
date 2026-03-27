/**
 * 选课指导课 API
 * 
 * GET  /api/consultations - 获取选课指导课列表
 * POST /api/consultations - 创建选课指导课
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  students, 
  users, 
  courseSelectionForms,
  courseSelectionItems,
  courses,
  classRecords,
} from '@/db/schema';
import { eq, and, desc, or, like, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 选课指导课状态
type ConsultationStatus = '待安排' | '已预约' | '进行中' | '已完成' | '已取消';

// GET - 获取选课指导课列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ConsultationStatus | null;
    const consultantId = searchParams.get('consultantId');
    const studentId = searchParams.get('studentId');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 构建查询条件
    const conditions = [];
    
    if (status) {
      conditions.push(eq(classRecords.attendanceStatus, status as any));
    }
    
    if (consultantId) {
      conditions.push(eq(classRecords.teacherId, consultantId));
    }
    
    if (studentId) {
      conditions.push(eq(classRecords.studentId, studentId));
    }

    // 查询选课指导课记录（courseCategory = '选课指导'）
    const whereClause = conditions.length > 0 
      ? and(
          eq(classRecords.courseCategory, '选课指导'),
          ...conditions
        )
      : eq(classRecords.courseCategory, '选课指导');

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classRecords)
      .where(whereClause);
    
    const total = Number(countResult[0]?.count) || 0;

    // 分页查询
    const consultations = await db
      .select()
      .from(classRecords)
      .where(whereClause)
      .orderBy(desc(classRecords.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 获取关联信息
    const consultationsWithDetails = await Promise.all(
      consultations.map(async (record) => {
        // 获取学生信息
        const student = record.studentId 
          ? await db.query.students.findFirst({
              where: eq(students.id, record.studentId),
            })
          : null;

        // 获取顾问信息
        const consultant = record.teacherId
          ? await db.query.users.findFirst({
              where: eq(users.id, record.teacherId),
            })
          : null;

        // 检查是否已创建选课单
        const selectionForm = record.studentId
          ? await db.query.courseSelectionForms.findFirst({
              where: and(
                eq(courseSelectionForms.studentId, record.studentId),
                eq(courseSelectionForms.consultationTeacherId, record.teacherId || '')
              ),
            })
          : null;

        return {
          ...record,
          studentName: student?.name || '未知学生',
          studentSid: student?.studentId,
          consultantName: consultant?.name || '未知顾问',
          hasSelectionForm: !!selectionForm,
          selectionFormId: selectionForm?.id,
          selectionFormStatus: selectionForm?.status,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: consultationsWithDetails,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取选课指导课列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取选课指导课列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建选课指导课
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      consultantId,
      scheduledDate,
      scheduledTime,
      meetingType = '线上',
      meetingLink,
      notes,
    } = body;

    // 验证必填字段
    if (!studentId || !consultantId || !scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { success: false, error: '学生、顾问、日期和时间为必填项' },
        { status: 400 }
      );
    }

    // 获取学生信息
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    // 获取顾问信息
    const consultant = await db.query.users.findFirst({
      where: eq(users.id, consultantId),
    });

    if (!consultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }

    // 计算星期几
    const date = new Date(scheduledDate);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];

    // 获取或创建"选课指导"课程
    let consultationCourse = await db.query.courses.findFirst({
      where: eq(courses.courseId, 'CONSULTATION'),
    });

    if (!consultationCourse) {
      // 创建选课指导课程
      const [newCourse] = await db.insert(courses).values({
        id: uuidv4(),
        courseId: 'CONSULTATION',
        name: '选课指导',
        type: '基础课',
        category: 'F-GD',
        duration: '1个月',
        description: '规划顾问选课指导咨询',
      }).returning();
      consultationCourse = newCourse;
    }

    // 创建选课指导课记录
    const recordId = uuidv4();
    const recordCode = `CG${Date.now()}`;

    const [consultation] = await db.insert(classRecords).values({
      id: recordId,
      recordId: recordCode,
      studentId: studentId,
      teacherId: consultantId,
      courseId: consultationCourse.id,
      courseCategory: '选课指导',
      courseContentDetail: '选课指导咨询',
      classDate: scheduledDate,
      weekDay: weekDay as any,
      startTime: scheduledTime as any,
      actualDuration: 60, // 默认60分钟
      contentSummary: notes || '选课指导咨询',
      attendanceStatus: '已排课',
      teachingMethod: meetingType,
      createdBy: consultantId,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        ...consultation,
        studentName: student.name,
        consultantName: consultant.name,
      },
      message: '选课指导课已创建',
    });
  } catch (error) {
    console.error('创建选课指导课失败:', error);
    return NextResponse.json(
      { success: false, error: '创建选课指导课失败' },
      { status: 500 }
    );
  }
}

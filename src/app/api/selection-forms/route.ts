import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  courseSelectionForms, 
  courseSelectionItems, 
  applicationSchools,
  students,
  courses 
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/selection-forms
 * 创建选课单（新流程）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      student_id,
      schools,
      major_direction,
      projects,
      courses: selectedCourses,
      total_hours,
      goals,
      notes,
    } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: '缺少学生ID' },
        { status: 400 }
      );
    }

    // 验证学生存在
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, student_id))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    // 开始事务处理
    const formId = uuidv4();
    const formIdStr = `SEL${Date.now()}`;

    // 计算日期范围
    const today = new Date();
    const estimatedEndDate = new Date(today);
    estimatedEndDate.setMonth(estimatedEndDate.getMonth() + 6); // 默认6个月

    // 创建选课单
    const [form] = await db.insert(courseSelectionForms).values({
      id: formId,
      formId: formIdStr,
      studentId: student_id,
      status: '草稿',
      totalPlannedHours: total_hours || 0,
      estimatedStartDate: today.toISOString().split('T')[0] as any,
      estimatedEndDate: estimatedEndDate.toISOString().split('T')[0] as any,
      totalCourses: selectedCourses?.length || 0,
      completedCourses: 0,
      totalHours: total_hours || 0,
      completedHours: 0,
      goals: goals || null,
      notes: notes || null,
    } as any).returning();

    // 添加申请院校
    if (schools && schools.length > 0) {
      for (const school of schools) {
        await db.insert(applicationSchools).values({
          id: uuidv4(),
          studentId: student_id,
          schoolName: school.schoolName,
          country: school.country as any,
          major: school.major,
          degree: school.degree as any,
          priority: school.priority || 1,
          deadline: school.deadline || null,
        } as any);
      }
    }

    // 添加选课明细
    if (selectedCourses && selectedCourses.length > 0) {
      for (const course of selectedCourses) {
        // 查找或创建课程
        let courseRecord = await db
          .select()
          .from(courses)
          .where(eq(courses.courseId, course.id))
          .limit(1);

        let courseId: string;
        if (courseRecord.length === 0) {
          // 创建课程记录
          const [newCourse] = await db.insert(courses).values({
            id: uuidv4(),
            courseId: course.id,
            name: course.name,
            type: course.type === 'foundation' ? '基础课' : '项目课',
            category: course.category as any,
            duration: '4周' as any,
          }).returning();
          courseId = newCourse.id;
        } else {
          courseId = courseRecord[0].id;
        }

        await db.insert(courseSelectionItems).values({
          id: uuidv4(),
          formId: formId,
          courseId: courseId,
          courseType: course.type === 'foundation' ? '基础课' as any : '项目课' as any,
          courseStage: '基础' as any,
          plannedHours: course.hours,
          scheduledHours: 0,
          completedHours: 0,
          status: '待排课' as any,
          priority: course.type === 'foundation' ? 1 : 5,
          notes: course.projectType ? `项目类型: ${course.projectType}` : null,
        } as any);
      }
    }

    return NextResponse.json({
      success: true,
      form: {
        id: formId,
        formId: formIdStr,
        studentId: student_id,
        status: '草稿',
        totalCourses: selectedCourses?.length || 0,
        totalHours: total_hours || 0,
        goals,
        notes,
      },
      message: '选课单创建成功',
    });
  } catch (error) {
    console.error('创建选课单失败:', error);
    return NextResponse.json(
      { success: false, error: '创建选课单失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/selection-forms
 * 获取选课单列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    const conditions = [];
    
    if (studentId) {
      conditions.push(eq(courseSelectionForms.studentId, studentId));
    }
    
    if (status) {
      conditions.push(eq(courseSelectionForms.status, status as any));
    }

    const forms = await db
      .select()
      .from(courseSelectionForms)
      .where(conditions.length > 0 ? eq(courseSelectionForms.studentId, studentId!) : undefined)
      .orderBy(courseSelectionForms.createdAt);

    return NextResponse.json({
      success: true,
      forms,
    });
  } catch (error) {
    console.error('获取选课单列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取选课单列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 选课指导课详情 API
 * 
 * GET  /api/consultations/[id] - 获取选课指导课详情
 * PUT   /api/consultations/[id] - 更新选课指导课（开始/完成/取消）
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
  teachers,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 获取选课指导课详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 获取选课指导课记录
    const consultation = await db.query.classRecords.findFirst({
      where: eq(classRecords.id, id),
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: '选课指导课不存在' },
        { status: 404 }
      );
    }

    // 获取学生信息
    const student = consultation.studentId
      ? await db.query.students.findFirst({
          where: eq(students.id, consultation.studentId),
        })
      : null;

    // 获取顾问信息
    const consultant = consultation.teacherId
      ? await db.query.users.findFirst({
          where: eq(users.id, consultation.teacherId),
        })
      : null;

    // 获取已有的选课单
    const selectionForm = consultation.studentId
      ? await db.query.courseSelectionForms.findFirst({
          where: and(
            eq(courseSelectionForms.studentId, consultation.studentId),
            eq(courseSelectionForms.consultationTeacherId, consultation.teacherId || '')
          ),
        })
      : null;

    // 获取选课单明细
    let selectionItems: any[] = [];
    if (selectionForm) {
      selectionItems = await db.query.courseSelectionItems.findMany({
        where: eq(courseSelectionItems.formId, selectionForm.id),
      });
    }

    // 获取所有可用课程
    const availableCourses = await db.query.courses.findMany();

    // 获取可匹配导师
    const availableTeachers = await db.query.teachers.findMany({
      where: eq(teachers.cooperationStatus, '合作中'),
    });

    return NextResponse.json({
      success: true,
      data: {
        consultation: {
          ...consultation,
          studentName: student?.name || '未知学生',
          studentSid: student?.studentId,
          studentInfo: student,
          consultantName: consultant?.name || '未知顾问',
        },
        selectionForm: selectionForm ? {
          ...selectionForm,
          items: selectionItems,
        } : null,
        availableCourses,
        availableTeachers,
      },
    });
  } catch (error) {
    console.error('获取选课指导课详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取选课指导课详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新选课指导课状态
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, data } = body;

    // 获取选课指导课记录
    const consultation = await db.query.classRecords.findFirst({
      where: eq(classRecords.id, id),
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: '选课指导课不存在' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start': {
        // 开始选课指导（更新备注表示已开始）
        const [updated] = await db.update(classRecords)
          .set({
            teacherFeedback: (consultation.teacherFeedback || '') + '\n[指导已开始]',
            updatedAt: new Date(),
          })
          .where(eq(classRecords.id, id))
          .returning();

        return NextResponse.json({
          success: true,
          data: updated,
          message: '选课指导课已开始',
        });
      }

      case 'complete': {
        // 完成选课指导，创建选课单
        const { 
          goals, 
          notes, 
          selectedCourses,
          estimatedStartDate,
          estimatedEndDate,
        } = data || {};

        // 更新选课指导记录
        const [updated] = await db.update(classRecords)
          .set({
            attendanceStatus: '已完成',
            contentSummary: notes || consultation.contentSummary,
            teacherFeedback: goals,
            updatedAt: new Date(),
          })
          .where(eq(classRecords.id, id))
          .returning();

        // 创建选课单（如果还没有）
        let selectionForm = null;
        if (consultation.studentId && consultation.teacherId) {
          // 检查是否已有选课单
          selectionForm = await db.query.courseSelectionForms.findFirst({
            where: and(
              eq(courseSelectionForms.studentId, consultation.studentId),
              eq(courseSelectionForms.consultationTeacherId, consultation.teacherId)
            ),
          });

          if (!selectionForm && selectedCourses && selectedCourses.length > 0) {
            // 创建选课单
            const formId = uuidv4();
            const formCode = `SF${Date.now()}`;

            const [newForm] = await db.insert(courseSelectionForms).values({
              id: formId,
              formId: formCode,
              studentId: consultation.studentId,
              consultationTeacherId: consultation.teacherId,
              status: '草稿',
              estimatedStartDate: estimatedStartDate || new Date().toISOString().split('T')[0],
              estimatedEndDate: estimatedEndDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              goals: goals,
              notes: notes,
              totalPlannedHours: selectedCourses.reduce((sum: number, c: any) => sum + (c.plannedHours || 0), 0),
              totalCourses: selectedCourses.length,
            }).returning();

            // 添加选课单明细
            for (const course of selectedCourses) {
              await db.insert(courseSelectionItems).values({
                id: uuidv4(),
                formId: formId,
                courseId: course.courseId,
                courseType: course.courseType || '基础课',
                courseStage: course.courseStage || '基础',
                plannedHours: course.plannedHours || 10,
                priority: course.priority || 5,
                notes: course.notes,
              });
            }

            selectionForm = newForm;
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            consultation: updated,
            selectionForm,
          },
          message: '选课指导课已完成，选课单已创建',
        });
      }

      case 'cancel': {
        // 取消选课指导
        const [updated] = await db.update(classRecords)
          .set({
            attendanceStatus: '已取消',
            updatedAt: new Date(),
          })
          .where(eq(classRecords.id, id))
          .returning();

        return NextResponse.json({
          success: true,
          data: updated,
          message: '选课指导课已取消',
        });
      }

      case 'update': {
        // 更新选课指导信息
        const [updated] = await db.update(classRecords)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(classRecords.id, id))
          .returning();

        return NextResponse.json({
          success: true,
          data: updated,
          message: '选课指导课已更新',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: '无效的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('更新选课指导课失败:', error);
    return NextResponse.json(
      { success: false, error: '更新选课指导课失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除选课指导课
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 只能删除未开始的选课指导课
    const consultation = await db.query.classRecords.findFirst({
      where: eq(classRecords.id, id),
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: '选课指导课不存在' },
        { status: 404 }
      );
    }

    if (consultation.attendanceStatus === '已完成') {
      return NextResponse.json(
        { success: false, error: '已完成的选课指导课不能删除' },
        { status: 400 }
      );
    }

    await db.delete(classRecords).where(eq(classRecords.id, id));

    return NextResponse.json({
      success: true,
      message: '选课指导课已删除',
    });
  } catch (error) {
    console.error('删除选课指导课失败:', error);
    return NextResponse.json(
      { success: false, error: '删除选课指导课失败' },
      { status: 500 }
    );
  }
}

/**
 * 单个顾问 API
 * 
 * GET /api/consultants/[id] - 获取顾问详情
 * PUT /api/consultants/[id] - 更新顾问信息
 * DELETE /api/consultants/[id] - 删除顾问
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { consultants, students } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 获取顾问详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            lastLoginAt: true,
          },
        },
      },
    });

    if (!consultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }

    // 获取统计数据
    const studentStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${students.studentStatus} = '在读' then 1 else 0 end)`,
      })
      .from(students)
      .where(eq(students.consultantId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...consultant,
        stats: {
          totalStudents: studentStats[0]?.total || 0,
          activeStudents: studentStats[0]?.active || 0,
        },
      },
    });
  } catch (error) {
    console.error('获取顾问详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取顾问详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新顾问信息
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      level,
      email,
      phone,
      wechat,
      feishuUserId,
      userId,
      isActive,
      notes,
    } = body;

    // 检查顾问是否存在
    const existingConsultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, id),
    });

    if (!existingConsultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }

    // 更新顾问
    const [updatedConsultant] = await db
      .update(consultants)
      .set({
        ...(name && { name }),
        ...(level && { level }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(wechat !== undefined && { wechat }),
        ...(feishuUserId !== undefined && { feishuUserId }),
        ...(userId !== undefined && { userId }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      })
      .where(eq(consultants.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedConsultant,
      message: '顾问更新成功',
    });
  } catch (error) {
    console.error('更新顾问失败:', error);
    return NextResponse.json(
      { success: false, error: '更新顾问失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除顾问
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 检查顾问是否存在
    const existingConsultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, id),
    });

    if (!existingConsultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }

    // 检查是否有关联学生
    const relatedStudents = await db.query.students.findFirst({
      where: eq(students.consultantId, id),
    });

    if (relatedStudents) {
      return NextResponse.json(
        { success: false, error: '该顾问有关联学生，无法删除' },
        { status: 400 }
      );
    }

    // 删除顾问
    await db.delete(consultants).where(eq(consultants.id, id));

    return NextResponse.json({
      success: true,
      message: '顾问删除成功',
    });
  } catch (error) {
    console.error('删除顾问失败:', error);
    return NextResponse.json(
      { success: false, error: '删除顾问失败' },
      { status: 500 }
    );
  }
}

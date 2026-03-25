/**
 * 结课审核详情与操作 API
 * GET    /api/settlements/[id] - 获取结课详情
 * PUT    /api/settlements/[id] - 更新结课信息
 * POST   /api/settlements/[id]/submit - 提交审核
 * POST   /api/settlements/[id]/review - 审核结课
 * DELETE /api/settlements/[id] - 取消结课
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courseSettlements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  submitSettlement,
  reviewSettlement,
} from '@/lib/settlement-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 获取结课详情
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const settlement = await db.query.courseSettlements.findFirst({
      where: eq(courseSettlements.id, id),
    });

    if (!settlement) {
      return NextResponse.json(
        { error: '结课记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error('获取结课详情失败:', error);
    return NextResponse.json(
      { 
        error: '获取失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 更新结课信息（仅限待提交状态）
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const settlement = await db.query.courseSettlements.findFirst({
      where: eq(courseSettlements.id, id),
    });

    if (!settlement) {
      return NextResponse.json(
        { error: '结课记录不存在' },
        { status: 404 }
      );
    }

    if (settlement.status !== 'pending') {
      return NextResponse.json(
        { error: '只有待提交状态的结课记录可以修改' },
        { status: 400 }
      );
    }

    // 允许更新的字段
    const allowedFields = [
      'teachingHours',
      'teachingContent',
      'studentPerformance',
      'homeworkAssigned',
      'nextPlan',
      'bonusAmount',
      'deductionAmount',
      'templateData',
    ];

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // 重新计算最终金额
    if (body.bonusAmount !== undefined || body.deductionAmount !== undefined) {
      const base = settlement.baseAmount;
      const bonus = body.bonusAmount ?? settlement.bonusAmount ?? 0;
      const deduction = body.deductionAmount ?? settlement.deductionAmount ?? 0;
      updateData.finalAmount = base + bonus - deduction;
    }

    const [updated] = await db.update(courseSettlements)
      .set(updateData)
      .where(eq(courseSettlements.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新结课信息失败:', error);
    return NextResponse.json(
      { 
        error: '更新失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 取消结课
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const settlement = await db.query.courseSettlements.findFirst({
      where: eq(courseSettlements.id, id),
    });

    if (!settlement) {
      return NextResponse.json(
        { error: '结课记录不存在' },
        { status: 404 }
      );
    }

    if (!['pending', 'submitted'].includes(settlement.status)) {
      return NextResponse.json(
        { error: '只有待提交或待审核状态的结课记录可以取消' },
        { status: 400 }
      );
    }

    await db.update(courseSettlements)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(courseSettlements.id, id));

    return NextResponse.json({
      success: true,
      message: '结课已取消',
    });
  } catch (error) {
    console.error('取消结课失败:', error);
    return NextResponse.json(
      { 
        error: '取消失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

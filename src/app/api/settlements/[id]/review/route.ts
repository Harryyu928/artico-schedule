/**
 * 结课审核 API
 * POST /api/settlements/[id]/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewSettlement, batchReviewSettlements } from '@/lib/settlement-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { 
      action, 
      reviewerId, 
      reviewNotes, 
      adjustAmount, 
      adjustReason,
      // 批量审核参数
      settlementIds,
    } = body;

    // 批量审核
    if (settlementIds && Array.isArray(settlementIds)) {
      const result = await batchReviewSettlements({
        settlementIds,
        action,
        reviewerId,
        reviewNotes,
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `批量审核完成: 成功 ${result.success} 个, 失败 ${result.failed} 个`,
      });
    }

    // 单个审核
    if (!action || !reviewerId) {
      return NextResponse.json(
        { error: '缺少必要参数: action 或 reviewerId' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: '无效的审核操作' },
        { status: 400 }
      );
    }

    const settlement = await reviewSettlement({
      settlementId: id,
      action,
      reviewerId,
      reviewNotes,
      adjustAmount,
      adjustReason,
    });

    return NextResponse.json({
      success: true,
      data: settlement,
      message: action === 'approve' ? '审核通过，课酬已计入' : '审核已拒绝',
    });
  } catch (error) {
    console.error('审核结课申请失败:', error);
    return NextResponse.json(
      { 
        error: '审核失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

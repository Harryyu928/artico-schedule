/**
 * 结课提交 API
 * POST /api/settlements/[id]/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitSettlement } from '@/lib/settlement-service';

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
    const { submittedBy } = body;

    if (!submittedBy) {
      return NextResponse.json(
        { error: '缺少提交人信息' },
        { status: 400 }
      );
    }

    const settlement = await submitSettlement(id, submittedBy);

    return NextResponse.json({
      success: true,
      data: settlement,
      message: '结课申请已提交，等待审核',
    });
  } catch (error) {
    console.error('提交结课申请失败:', error);
    return NextResponse.json(
      { 
        error: '提交失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 结课审核 API
 * GET  /api/settlements - 获取结课列表
 * POST /api/settlements - 创建结课申请
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getSettlements, 
  createSettlement,
  batchSubmitSettlements,
} from '@/lib/settlement-service';

/**
 * 获取结课列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await getSettlements({
      teacherId,
      studentId,
      status,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    console.error('获取结课列表失败:', error);
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
 * 创建结课申请
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, classRecordId, classRecordIds, teacherId, notes } = body;

    // 单个结课
    if (action === 'single' && classRecordId) {
      const settlement = await createSettlement({
        classRecordId,
        teachingContent: notes,
      });
      
      return NextResponse.json({
        success: true,
        data: settlement,
        message: '结课申请创建成功',
      });
    }

    // 批量结课
    if (action === 'batch' && classRecordIds && classRecordIds.length > 0) {
      const result = await batchSubmitSettlements({
        classRecordIds,
        teacherId,
        notes,
      });
      
      return NextResponse.json({
        success: result.success > 0,
        data: result,
        message: `批量结课完成: 成功 ${result.success} 个, 失败 ${result.failed} 个`,
      });
    }

    return NextResponse.json(
      { error: '缺少必要参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('创建结课申请失败:', error);
    return NextResponse.json(
      { 
        error: '创建失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

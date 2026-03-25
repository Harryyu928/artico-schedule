/**
 * 临时时间调整 API
 * POST /api/time-blocks - 创建时间调整
 * GET /api/time-blocks - 获取时间调整列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createTimeBlock, 
  getTeacherTimeBlocks,
  cancelTimeBlock,
} from '@/lib/time-adjustment-service';

/**
 * 创建导师时间调整
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await createTimeBlock({
      teacherId: body.teacherId,
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime,
      endTime: body.endTime,
      isAllDay: body.isAllDay ?? true,
      blockType: body.blockType || 'temporary_unavailable',
      reason: body.reason,
      createdBy: body.createdBy || 'system',
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `时间调整已创建，影响 ${result.affectedCount} 节课程`,
    });
  } catch (error) {
    console.error('创建时间调整失败:', error);
    return NextResponse.json(
      { error: '创建失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取时间调整列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;

    if (!teacherId) {
      return NextResponse.json(
        { error: '缺少教师ID参数' },
        { status: 400 }
      );
    }

    const timeBlocks = await getTeacherTimeBlocks(teacherId, {
      startDate,
      endDate,
      status,
    });

    return NextResponse.json({
      success: true,
      data: timeBlocks,
    });
  } catch (error) {
    console.error('获取时间调整列表失败:', error);
    return NextResponse.json(
      { error: '获取失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 取消时间调整
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeBlockId = searchParams.get('id');
    const cancelledBy = searchParams.get('cancelledBy') || 'system';

    if (!timeBlockId) {
      return NextResponse.json(
        { error: '缺少时间调整ID' },
        { status: 400 }
      );
    }

    const result = await cancelTimeBlock(timeBlockId, cancelledBy);

    return NextResponse.json({
      success: true,
      data: result,
      message: '时间调整已取消',
    });
  } catch (error) {
    console.error('取消时间调整失败:', error);
    return NextResponse.json(
      { error: '取消失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

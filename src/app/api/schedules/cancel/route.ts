/**
 * 课程取消 API
 * POST /api/schedules/cancel - 取消课程
 * GET /api/schedules/cancellations - 获取取消列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  cancelSchedule, 
  getCancellations,
  scheduleMakeup,
  getPendingMakeups,
} from '@/lib/time-adjustment-service';

/**
 * 取消课程
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await cancelSchedule({
      scheduleId: body.scheduleId,
      cancellationReason: body.cancellationReason,
      cancellationDetail: body.cancellationDetail,
      cancelledBy: body.cancelledBy || 'system',
      makeupRequired: body.makeupRequired ?? true,
      shouldCreateTimeBlock: body.createTimeBlock ?? false,
      timeBlockReason: body.timeBlockReason,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: '课程已取消，相关通知已发送',
    });
  } catch (error) {
    console.error('取消课程失败:', error);
    return NextResponse.json(
      { error: '取消失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取取消列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const makeupRequired = searchParams.get('makeupRequired') === 'true' ? true : 
                           searchParams.get('makeupRequired') === 'false' ? false : undefined;
    const makeupScheduled = searchParams.get('makeupScheduled') === 'true' ? true : 
                            searchParams.get('makeupScheduled') === 'false' ? false : undefined;
    const action = searchParams.get('action');

    // 获取待补课列表
    if (action === 'pending-makeups') {
      const pending = await getPendingMakeups();
      return NextResponse.json({
        success: true,
        data: pending,
        total: pending.length,
      });
    }

    const cancellations = await getCancellations({
      teacherId,
      studentId,
      makeupRequired,
      makeupScheduled,
    });

    return NextResponse.json({
      success: true,
      data: cancellations,
      total: cancellations.length,
    });
  } catch (error) {
    console.error('获取取消列表失败:', error);
    return NextResponse.json(
      { error: '获取失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 安排补课
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await scheduleMakeup(
      body.cancellationId,
      body.newScheduleId
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: '补课已安排',
    });
  } catch (error) {
    console.error('安排补课失败:', error);
    return NextResponse.json(
      { error: '安排失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

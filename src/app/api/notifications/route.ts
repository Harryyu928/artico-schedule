/**
 * 通知 API
 * GET /api/notifications - 获取用户通知列表
 * PUT /api/notifications - 标记通知已读
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserNotifications,
  markNotificationRead,
} from '@/lib/time-adjustment-service';

/**
 * 获取用户通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recipientId = searchParams.get('recipientId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!recipientId) {
      return NextResponse.json(
        { error: '缺少接收者ID' },
        { status: 400 }
      );
    }

    const notifications = await getUserNotifications(recipientId, {
      unreadOnly,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      total: notifications.length,
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { error: '获取失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 标记通知已读
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await markNotificationRead(body.notificationId);

    return NextResponse.json({
      success: true,
      data: result,
      message: '通知已标记为已读',
    });
  } catch (error) {
    console.error('标记通知失败:', error);
    return NextResponse.json(
      { error: '标记失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

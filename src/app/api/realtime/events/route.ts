/**
 * 实时事件流 API (Server-Sent Events)
 * GET /api/realtime/events
 * 
 * 客户端连接示例：
 * const eventSource = new EventSource('/api/realtime/events?userId=xxx');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Received event:', data);
 * };
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSSEConnection, getConnectionStats } from '@/lib/realtime-service';

/**
 * 建立 SSE 连接
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    // 创建 SSE 流
    const stream = createSSEConnection(userId);
    
    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    });
  } catch (error) {
    console.error('[Realtime] SSE connection failed:', error);
    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    );
  }
}

/**
 * 获取连接统计
 */
export async function HEAD(request: NextRequest) {
  const stats = getConnectionStats();
  
  return NextResponse.json({
    onlineUsers: stats.onlineUsers,
    totalConnections: stats.totalConnections,
  });
}

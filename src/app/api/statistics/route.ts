import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/db-service';

/**
 * GET /api/statistics
 * 获取系统统计数据
 */
export async function GET() {
  try {
    const stats = await getStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

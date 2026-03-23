import { NextRequest, NextResponse } from 'next/server';
import { schedulingEngine } from '@/lib/scheduling-engine';
import type { AutoScheduleRequest } from '@/types';

/**
 * POST /api/schedule/auto
 * 执行自动排课
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutoScheduleRequest = await request.json();
    
    const result = await schedulingEngine.autoSchedule(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('自动排课失败:', error);
    return NextResponse.json(
      { error: '自动排课失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

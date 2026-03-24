import { NextRequest, NextResponse } from 'next/server';
import { schedulingEngine } from '@/lib/scheduling-engine';
import type { AutoScheduleRequest } from '@/types';

/**
 * POST /api/schedule/auto
 * 执行自动排课
 */
export async function POST(request: NextRequest) {
  try {
    let body: AutoScheduleRequest = {};
    
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // body 为空或解析失败，使用默认值
    }
    
    const result = await schedulingEngine.autoSchedule(body);
    
    return NextResponse.json({
      success: result.success,
      scheduled: result.scheduled_count,
      failed: result.failed_count,
      results: result.results,
      conflicts: result.conflicts,
    });
  } catch (error: any) {
    console.error('自动排课失败:', error);
    
    // 检查是否是数据库表不存在错误
    const errorMessage = error.message || '';
    if (errorMessage.includes('relation') || errorMessage.includes('does not exist') || errorMessage.includes('Failed query')) {
      return NextResponse.json({
        success: false,
        scheduled: 0,
        failed: 0,
        results: [],
        conflicts: [],
        message: '自动排课需要先设置数据：请在系统中添加学生、导师、课程数据，并设置可用时间。',
      });
    }
    
    return NextResponse.json(
      { error: '自动排课失败', message: errorMessage },
      { status: 500 }
    );
  }
}

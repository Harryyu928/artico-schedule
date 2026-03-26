/**
 * 课后反馈API
 * 
 * POST /api/class-feedback - 触发课后反馈流程
 * POST /api/class-feedback?action=forward - 转发给学生
 */

import { NextRequest, NextResponse } from 'next/server';
import { classFeedbackService } from '@/lib/class-feedback-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, recordId, targetType } = body;

    // 转发给学生
    if (action === 'forward') {
      if (!recordId) {
        return NextResponse.json(
          { success: false, error: '缺少recordId参数' },
          { status: 400 }
        );
      }

      if (!targetType) {
        return NextResponse.json(
          { success: false, error: '缺少targetType参数' },
          { status: 400 }
        );
      }

      const result = await classFeedbackService.forwardToStudent(recordId, targetType);
      return NextResponse.json(result);
    }

    // 触发课后反馈流程
    if (!recordId) {
      return NextResponse.json(
        { success: false, error: '缺少recordId参数' },
        { status: 400 }
      );
    }

    const result = await classFeedbackService.processCompletedRecord(recordId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ClassFeedback API] 处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
      },
      { status: 500 }
    );
  }
}

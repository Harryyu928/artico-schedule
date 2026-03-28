/**
 * 工作流自动推进 API
 * 
 * POST /api/workflows/auto-advance - 检查并推进工作流
 * GET /api/workflows/auto-advance - 获取可推进的工作流列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkStageAdvancement,
  advanceWorkflowStage,
  checkAndAdvanceAll,
  getAdvancementHistory,
  onTaskCompleted,
} from '@/lib/workflow-auto-advance';
import { getCurrentUser } from '@/lib/auth-middleware';

/**
 * GET /api/workflows/auto-advance
 * 获取工作流推进状态和历史
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const instanceId = searchParams.get('instanceId');
    const action = searchParams.get('action') || 'check';

    // 获取推进历史
    if (action === 'history' && instanceId) {
      const history = await getAdvancementHistory(instanceId);
      return NextResponse.json({
        success: true,
        data: history,
      });
    }

    // 检查单个工作流的推进状态
    if (action === 'check' && instanceId) {
      const checkResult = await checkStageAdvancement(instanceId);
      return NextResponse.json({
        success: true,
        data: checkResult,
      });
    }

    // 获取所有可推进的工作流
    if (action === 'list') {
      // 这里可以添加获取可推进工作流列表的逻辑
      return NextResponse.json({
        success: true,
        message: '功能开发中',
      });
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[AutoAdvanceAPI] GET failed:', error);
    return NextResponse.json(
      { 
        error: '操作失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/auto-advance
 * 执行工作流推进
 * 
 * Body:
 * - action: 'advance' | 'check_all' | 'task_completed'
 * - instanceId: 工作流实例ID
 * - taskId: 任务ID (task_completed时使用)
 * - advancementType: 'auto' | 'manual'
 * - reason: 推进原因
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    const body = await request.json();
    const { action, instanceId, taskId, advancementType, reason } = body;

    // 任务完成触发的推进检查
    if (action === 'task_completed' && taskId) {
      const result = await onTaskCompleted(taskId, user?.id);
      return NextResponse.json({
        success: true,
        data: result,
        message: result ? '工作流已自动推进' : '工作流无需推进',
      });
    }

    // 手动推进单个工作流
    if (action === 'advance' && instanceId) {
      // 先检查是否可以推进
      const checkResult = await checkStageAdvancement(instanceId);
      
      if (!checkResult.canAdvance) {
        return NextResponse.json(
          { 
            error: '无法推进',
            reason: checkResult.reason,
            completionRate: checkResult.completionRate,
            pendingRequiredTasks: checkResult.pendingRequiredTasks,
          },
          { status: 400 }
        );
      }

      // 执行推进
      const result = await advanceWorkflowStage(instanceId, {
        advancementType: advancementType || 'manual',
        trigger: 'manual_request',
        reason: reason || checkResult.reason,
        operatorId: user?.id,
      });

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? result.reason : '推进失败',
      });
    }

    // 批量检查并推进所有工作流
    if (action === 'check_all') {
      // 仅管理员可执行
      if (user?.role !== '管理员') {
        return NextResponse.json(
          { error: '权限不足' },
          { status: 403 }
        );
      }

      const result = await checkAndAdvanceAll();
      
      return NextResponse.json({
        success: true,
        data: result,
        message: `检查了 ${result.checked} 个工作流，推进了 ${result.advanced} 个`,
      });
    }

    // 回滚工作流
    if (action === 'rollback' && instanceId) {
      // 仅管理员可执行
      if (user?.role !== '管理员') {
        return NextResponse.json(
          { error: '权限不足，仅管理员可执行回滚操作' },
          { status: 403 }
        );
      }

      const { rollbackReason } = body;
      
      if (!rollbackReason) {
        return NextResponse.json(
          { error: '回滚原因不能为空' },
          { status: 400 }
        );
      }

      const { rollbackStage } = await import('@/lib/workflow-auto-advance');
      const result = await rollbackStage(instanceId, {
        reason: rollbackReason,
        operatorId: user.id,
      });

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? result.reason : '回滚失败',
      });
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[AutoAdvanceAPI] POST failed:', error);
    return NextResponse.json(
      { 
        error: '操作失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

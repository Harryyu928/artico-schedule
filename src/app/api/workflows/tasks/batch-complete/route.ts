/**
 * 批量完成任务 API
 * POST /api/workflows/tasks/batch-complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workflowTaskInstances, workflowInstances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { checkUserTaskPermission, type UserRole } from '@/lib/workflow-permissions';

interface BatchCompleteRequest {
  taskIds: string[];
  userId: string;
  userRole: UserRole;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchCompleteRequest = await request.json();
    const { taskIds, userId, userRole, notes } = body;

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要完成的任务' },
        { status: 400 }
      );
    }

    // 限制批量操作数量
    if (taskIds.length > 50) {
      return NextResponse.json(
        { error: '单次最多完成50个任务' },
        { status: 400 }
      );
    }

    // 获取所有任务
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(inArray(workflowTaskInstances.id, taskIds));

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: '部分任务不存在' },
        { status: 404 }
      );
    }

    // 检查权限
    const permissionResults = await Promise.all(
      tasks.map(async (task) => ({
        taskId: task.id,
        canComplete: await checkUserTaskPermission(userId, userRole, task.id, 'complete'),
        task,
      }))
    );

    // 分离有权限和无权限的任务
    const allowedTasks = permissionResults.filter(r => r.canComplete);
    const deniedTasks = permissionResults.filter(r => !r.canComplete);

    // 批量更新允许的任务
    const completedAt = new Date();
    const updatePromises = allowedTasks.map(({ task }) =>
      db.update(workflowTaskInstances)
        .set({
          status: 'completed',
          completedAt,
          notes: notes ? `${task.notes || ''}\n[批量完成] ${notes}` : task.notes,
          updatedAt: completedAt,
        })
        .where(eq(workflowTaskInstances.id, task.id))
    );

    await Promise.all(updatePromises);

    // 检查并更新工作流进度
    const instanceIds = [...new Set(allowedTasks.map(r => r.task.instanceId))];
    const stageAdvanceResults: { instanceId: string; advanced: boolean }[] = [];

    for (const instanceId of instanceIds) {
      // 更新工作流进度
      await updateWorkflowProgress(instanceId);
    }

    return NextResponse.json({
      success: true,
      data: {
        total: taskIds.length,
        completed: allowedTasks.length,
        denied: deniedTasks.length,
        deniedTasks: deniedTasks.map(r => ({
          id: r.task.id,
          name: r.task.name,
        })),
      },
    });
  } catch (error) {
    console.error('批量完成任务失败:', error);
    return NextResponse.json(
      { 
        error: '批量完成失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 更新工作流进度
 */
async function updateWorkflowProgress(instanceId: string) {
  try {
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });
    
    if (!instance) return;
    
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));
    
    if (tasks.length === 0) return;
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    
    const updateData: any = {
      completedTasks,
      progress,
      updatedAt: new Date(),
    };
    
    if (completedTasks === totalTasks) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else if (completedTasks > 0 && instance.status === 'pending') {
      updateData.status = 'in_progress';
      if (!instance.startedAt) {
        updateData.startedAt = new Date();
      }
    }
    
    await db.update(workflowInstances)
      .set(updateData)
      .where(eq(workflowInstances.id, instanceId));
  } catch (error) {
    console.error('更新工作流进度失败:', error);
  }
}

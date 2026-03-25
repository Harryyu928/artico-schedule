import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowInstances,
  workflowTaskInstances,
  workflowStageDefinitions,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/workflows/tasks/[taskId]
 * 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return NextResponse.json(
      { error: '获取任务详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/tasks/[taskId]
 * 更新任务状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    
    // 查询任务
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.status) {
      updateData.status = body.status;
    }
    if (body.assigneeId !== undefined) {
      updateData.assigneeId = body.assigneeId;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.checklist !== undefined) {
      updateData.checklist = body.checklist;
      // 更新清单完成数
      const completedCount = body.checklist.filter((item: any) => item.completed).length;
      updateData.completedChecklist = completedCount;
    }
    
    // 如果状态变为completed，记录完成时间
    if (body.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
    }
    
    // 如果状态变为in_progress，记录开始时间
    if (body.status === 'in_progress' && !task.startedAt) {
      updateData.startedAt = new Date();
    }

    // 更新任务
    await db.update(workflowTaskInstances)
      .set(updateData)
      .where(eq(workflowTaskInstances.id, taskId));

    // 更新工作流实例的进度
    await updateWorkflowProgress(task.instanceId);

    // 重新查询更新后的任务
    const updatedTask = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('更新任务失败:', error);
    return NextResponse.json(
      { error: '更新任务失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/tasks/[taskId]
 * 更新任务清单项
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    const { checklistItemId, completed, checklistItemIndex } = body;
    
    // 查询任务
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 更新清单项
    const checklist = task.checklist as { text: string; completed: boolean }[] || [];
    
    // 支持通过index或id更新
    if (checklistItemIndex !== undefined && checklistItemIndex < checklist.length) {
      checklist[checklistItemIndex].completed = completed;
    } else if (checklistItemId !== undefined) {
      const item = checklist.find((_: any, index: number) => index === checklistItemId);
      if (item) {
        item.completed = completed;
      }
    }

    // 计算清单完成进度
    const completedCount = checklist.filter((item: any) => item.completed).length;
    const totalCount = checklist.length;
    
    const updateData: any = {
      checklist,
      completedChecklist: completedCount,
      updatedAt: new Date(),
    };
    
    // 如果全部完成，自动标记任务为completed
    if (completedCount === totalCount && totalCount > 0 && task.status !== 'completed') {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    // 更新任务
    await db.update(workflowTaskInstances)
      .set(updateData)
      .where(eq(workflowTaskInstances.id, taskId));

    // 更新工作流实例的进度
    await updateWorkflowProgress(task.instanceId);

    // 重新查询更新后的任务
    const updatedTask = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('更新任务清单失败:', error);
    return NextResponse.json(
      { error: '更新任务清单失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 更新工作流实例的进度
 */
async function updateWorkflowProgress(instanceId: string) {
  try {
    // 获取工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });
    
    if (!instance) return;
    
    // 获取该实例的所有任务
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));
    
    if (tasks.length === 0) return;
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    
    // 更新工作流实例
    const updateData: any = {
      completedTasks,
      progress,
      updatedAt: new Date(),
    };
    
    // 检查当前阶段是否全部完成
    const currentStageTasks = tasks.filter(t => t.stageId === instance.currentStageId);
    const currentStageCompleted = currentStageTasks.every(t => t.status === 'completed');
    
    // 如果当前阶段完成，自动推进到下一阶段
    if (currentStageCompleted && currentStageTasks.length > 0 && instance.currentStageId) {
      const nextStage = await getNextStage(instance.workflowId, instance.currentStageId);
      
      if (nextStage) {
        // 推进到下一阶段
        updateData.currentStageId = nextStage.id;
        
        // 发送阶段变更通知（可扩展）
        console.log(`[Workflow] Instance ${instanceId} advanced to stage: ${nextStage.name}`);
      } else {
        // 没有下一阶段，工作流完成
        updateData.status = 'completed';
        updateData.completedAt = new Date();
        console.log(`[Workflow] Instance ${instanceId} completed`);
      }
    } else if (completedTasks === totalTasks) {
      // 所有任务完成，标记为completed
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

/**
 * 获取下一阶段
 */
async function getNextStage(workflowId: string, currentStageId: string) {
  // 获取所有阶段
  const stages = await db.select()
    .from(workflowStageDefinitions)
    .where(eq(workflowStageDefinitions.workflowId, workflowId))
    .orderBy(workflowStageDefinitions.stageOrder);
  
  // 找到当前阶段的索引
  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  
  // 返回下一阶段
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }
  
  return null;
}

/**
 * 检查工作流实例是否已有开始时间
 */
async function hasStartedAt(instanceId: string): Promise<boolean> {
  const instance = await db.query.workflowInstances.findFirst({
    where: eq(workflowInstances.id, instanceId),
  });
  return !!instance?.startedAt;
}

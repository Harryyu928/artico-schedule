import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowInstances,
  workflowTaskInstances,
  workflowStageDefinitions,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  checkTaskPermission, 
  getTaskActionSummary,
  type TaskAction 
} from '@/lib/workflow-permissions';
import { getCurrentUser } from '@/lib/auth-middleware';

/**
 * GET /api/workflows/tasks/[taskId]
 * 获取任务详情（含操作权限）
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

    // 获取当前用户权限摘要
    const user = await getCurrentUser(request);
    let permissions: Record<TaskAction, boolean> = {
      view: false,
      start: false,
      complete: false,
      skip: false,
      reassign: false,
      edit: false,
      add_notes: false,
    };

    if (user) {
      permissions = await getTaskActionSummary(taskId, user.id);
    }

    return NextResponse.json({
      ...task,
      permissions,
    });
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
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

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

    // 根据操作类型检查权限
    let requiredAction: TaskAction = 'edit';
    if (body.status === 'in_progress') {
      requiredAction = 'start';
    } else if (body.status === 'completed') {
      requiredAction = 'complete';
    } else if (body.status === 'skipped') {
      requiredAction = 'skip';
    } else if (body.assigneeId !== undefined) {
      requiredAction = 'reassign';
    } else if (body.notes !== undefined && Object.keys(body).length === 2) { // only id and notes
      requiredAction = 'add_notes';
    }

    // 检查权限
    const permissionResult = await checkTaskPermission(taskId, user.id, requiredAction);
    if (!permissionResult.allowed) {
      return NextResponse.json(
        { error: permissionResult.reason || '权限不足' },
        { status: 403 }
      );
    }

    // 准备更新数据
    const updateData: Record<string, unknown> = {
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
      const completedCount = body.checklist.filter((item: { completed: boolean }) => item.completed).length;
      updateData.completedChecklist = completedCount;
    }
    
    // 如果状态变为completed，记录完成时间
    if (body.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
      updateData.status = 'completed';
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

    // 触发模块联动（上课记录完成时更新进度）
    if (body.status === 'completed') {
      await triggerModuleLinkage(task);
    }

    // 重新查询更新后的任务
    const updatedTask = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    // 返回更新后的权限摘要
    const permissions = await getTaskActionSummary(taskId, user.id);

    return NextResponse.json({
      ...updatedTask,
      permissions,
    });
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
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

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

    // 检查权限
    const permissionResult = await checkTaskPermission(taskId, user.id, 'complete');
    if (!permissionResult.allowed) {
      return NextResponse.json(
        { error: permissionResult.reason || '权限不足' },
        { status: 403 }
      );
    }

    // 更新清单项
    const checklist = task.checklist as { text: string; completed: boolean }[] || [];
    
    // 支持通过index或id更新
    if (checklistItemIndex !== undefined && checklistItemIndex < checklist.length) {
      checklist[checklistItemIndex].completed = completed;
    } else if (checklistItemId !== undefined) {
      const item = checklist.find((_: { text: string; completed: boolean }, index: number) => index === checklistItemId);
      if (item) {
        item.completed = completed;
      }
    }

    // 计算清单完成进度
    const completedCount = checklist.filter((item: { completed: boolean }) => item.completed).length;
    const totalCount = checklist.length;
    
    const updateData: Record<string, unknown> = {
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

    // 如果任务完成，触发模块联动
    if (updateData.status === 'completed') {
      await triggerModuleLinkage(task);
    }

    // 重新查询更新后的任务
    const updatedTask = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    // 返回更新后的权限摘要
    const permissions = await getTaskActionSummary(taskId, user.id);

    return NextResponse.json({
      ...updatedTask,
      permissions,
    });
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

/**
 * 触发模块联动
 * 当任务完成时，自动更新相关模块
 */
async function triggerModuleLinkage(task: {
  id: string;
  instanceId: string;
  name: string;
  stageId: string;
}) {
  try {
    // 获取工作流实例信息
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, task.instanceId),
    });

    if (!instance) return;

    // 根据任务名称触发不同的联动
    switch (task.name) {
      case '填写上课记录':
        // 上课记录完成后，更新选课单进度
        if (instance.entityType === 'selection_form') {
          console.log(`[Linkage] Updating selection form progress for ${instance.entityId}`);
          // 这里可以调用选课单服务更新进度
        }
        break;

      case '发送签字链接':
        // 签字链接发送后，通知学生
        console.log(`[Linkage] Sign link sent notification for ${instance.entityId}`);
        break;

      case '确认学生签字':
        // 学生签字完成后，更新相关状态
        console.log(`[Linkage] Student signature confirmed for ${instance.entityId}`);
        break;

      default:
        // 默认不做处理
        break;
    }
  } catch (error) {
    console.error('模块联动失败:', error);
  }
}

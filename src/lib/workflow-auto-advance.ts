/**
 * 工作流自动推进服务
 * 实现阶段自动推进、条件检查、通知发送、日志记录
 */

import { db } from '@/db';
import { 
  workflowInstances,
  workflowStageDefinitions,
  workflowTaskInstances,
  workflowDefinitions,
  workflowAdvancementLogs,
  notifications,
  users,
} from '@/db/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 推进规则类型
export type AdvancementRule = 
  | 'all_tasks_completed'      // 所有任务完成
  | 'required_tasks_completed' // 必要任务完成
  | 'manual_confirmation'      // 手动确认
  | 'time_based'               // 基于时间
  | 'external_trigger';        // 外部触发

// 推进条件
export interface AdvancementCondition {
  type: AdvancementRule;
  config?: {
    requiredTaskIds?: string[];     // 必要任务ID列表
    minCompletionRate?: number;      // 最低完成率 (0-100)
    waitingPeriodHours?: number;     // 等待时间（小时）
    externalEvent?: string;          // 外部事件名称
  };
}

// 推进结果
export interface AdvancementResult {
  success: boolean;
  instanceId: string;
  previousStageId?: string;
  previousStageName?: string;
  newStageId?: string;
  newStageName?: string;
  workflowCompleted?: boolean;
  reason: string;
  advancedAt: Date;
  affectedTasks: string[];
  notifiedUsers: string[];
}

// 推进日志
export interface AdvancementLog {
  id: string;
  instanceId: string;
  fromStageId?: string;
  toStageId?: string;
  advancementType: 'auto' | 'manual';
  trigger: string;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * 检查阶段是否可以推进
 */
export async function checkStageAdvancement(
  instanceId: string
): Promise<{
  canAdvance: boolean;
  reason: string;
  nextStageId?: string;
  nextStageName?: string;
  completionRate: number;
  pendingRequiredTasks: string[];
}> {
  try {
    // 获取工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });

    if (!instance) {
      return {
        canAdvance: false,
        reason: '工作流实例不存在',
        completionRate: 0,
        pendingRequiredTasks: [],
      };
    }

    if (instance.status === 'completed') {
      return {
        canAdvance: false,
        reason: '工作流已完成',
        completionRate: 100,
        pendingRequiredTasks: [],
      };
    }

    // 获取当前阶段的所有任务
    const currentStageTasks = await db.select()
      .from(workflowTaskInstances)
      .where(and(
        eq(workflowTaskInstances.instanceId, instanceId),
        eq(workflowTaskInstances.stageId, instance.currentStageId || '')
      ));

    if (currentStageTasks.length === 0) {
      return {
        canAdvance: false,
        reason: '当前阶段没有任务',
        completionRate: 0,
        pendingRequiredTasks: [],
      };
    }

    // 计算完成率
    const completedTasks = currentStageTasks.filter(t => t.status === 'completed');
    const completionRate = Math.round((completedTasks.length / currentStageTasks.length) * 100);

    // 检查必要任务（高优先级任务）
    const requiredTasks = currentStageTasks.filter(t => t.priority === 'high');
    const pendingRequiredTasks = requiredTasks
      .filter(t => t.status !== 'completed')
      .map(t => t.name);

    // 检查是否所有任务都已完成
    const allCompleted = currentStageTasks.every(t => t.status === 'completed');
    
    if (!allCompleted) {
      // 检查是否满足最低完成率要求（默认80%）
      const minCompletionRate = 80;
      if (completionRate < minCompletionRate) {
        return {
          canAdvance: false,
          reason: `完成率不足：当前${completionRate}%，需要${minCompletionRate}%`,
          completionRate,
          pendingRequiredTasks,
        };
      }

      // 检查是否有必要任务未完成
      if (pendingRequiredTasks.length > 0) {
        return {
          canAdvance: false,
          reason: `必要任务未完成：${pendingRequiredTasks.join('、')}`,
          completionRate,
          pendingRequiredTasks,
        };
      }
    }

    // 获取下一阶段
    const nextStage = await getNextStage(instance.workflowId, instance.currentStageId || undefined);

    if (!nextStage) {
      // 没有下一阶段，工作流完成
      return {
        canAdvance: true,
        reason: '所有阶段已完成，工作流即将结束',
        completionRate,
        pendingRequiredTasks: [],
      };
    }

    return {
      canAdvance: true,
      reason: `阶段任务已完成，准备进入下一阶段：${nextStage.name}`,
      nextStageId: nextStage.id,
      nextStageName: nextStage.name,
      completionRate,
      pendingRequiredTasks: [],
    };
  } catch (error) {
    console.error('[AutoAdvance] 检查推进条件失败:', error);
    return {
      canAdvance: false,
      reason: `检查失败：${error instanceof Error ? error.message : '未知错误'}`,
      completionRate: 0,
      pendingRequiredTasks: [],
    };
  }
}

/**
 * 执行阶段自动推进
 */
export async function advanceWorkflowStage(
  instanceId: string,
  options: {
    advancementType?: 'auto' | 'manual';
    trigger?: string;
    reason?: string;
    operatorId?: string;
  } = {}
): Promise<AdvancementResult> {
  const { advancementType = 'auto', trigger = 'task_completion', reason, operatorId } = options;
  
  try {
    // 获取工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });

    if (!instance) {
      return {
        success: false,
        instanceId,
        reason: '工作流实例不存在',
        advancedAt: new Date(),
        affectedTasks: [],
        notifiedUsers: [],
      };
    }

    // 获取当前阶段信息
    const currentStage = instance.currentStageId 
      ? await db.query.workflowStageDefinitions.findFirst({
          where: eq(workflowStageDefinitions.id, instance.currentStageId),
        })
      : null;

    // 获取下一阶段
    const nextStage = await getNextStage(instance.workflowId, instance.currentStageId || undefined);

    // 准备更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    let workflowCompleted = false;
    let newStageId: string | undefined;
    let newStageName: string | undefined;

    if (!nextStage) {
      // 没有下一阶段，标记工作流完成
      workflowCompleted = true;
      updateData.status = 'completed';
      updateData.completedAt = new Date();
      updateData.progress = 100;
    } else {
      // 推进到下一阶段
      newStageId = nextStage.id;
      newStageName = nextStage.name;
      updateData.currentStageId = nextStage.id;
      
      // 激活下一阶段的任务
      await activateStageTasks(instanceId, nextStage.id);
    }

    // 更新工作流实例
    await db.update(workflowInstances)
      .set(updateData)
      .where(eq(workflowInstances.id, instanceId));

    // 获取受影响的任务
    const affectedTasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));

    // 发送通知
    const notifiedUsers = await sendAdvancementNotifications({
      instanceId,
      instance,
      previousStageName: currentStage?.name,
      newStageName,
      workflowCompleted,
      reason: reason || (workflowCompleted ? '工作流已完成' : `已进入${newStageName}阶段`),
    });

    // 记录推进日志
    await logAdvancement({
      instanceId,
      fromStageId: instance.currentStageId || undefined,
      toStageId: newStageId,
      advancementType,
      trigger,
      reason: reason || (workflowCompleted ? '工作流完成' : '阶段任务完成，自动推进'),
      operatorId,
    });

    console.log(`[AutoAdvance] Instance ${instanceId} advanced: ${currentStage?.name} -> ${newStageName || 'completed'}`);

    return {
      success: true,
      instanceId,
      previousStageId: instance.currentStageId || undefined,
      previousStageName: currentStage?.name,
      newStageId,
      newStageName,
      workflowCompleted,
      reason: workflowCompleted ? '工作流已完成' : `已进入${newStageName}阶段`,
      advancedAt: new Date(),
      affectedTasks: affectedTasks.map(t => t.id),
      notifiedUsers,
    };
  } catch (error) {
    console.error('[AutoAdvance] 推进失败:', error);
    return {
      success: false,
      instanceId,
      reason: `推进失败：${error instanceof Error ? error.message : '未知错误'}`,
      advancedAt: new Date(),
      affectedTasks: [],
      notifiedUsers: [],
    };
  }
}

/**
 * 任务完成时自动触发推进检查
 */
export async function onTaskCompleted(
  taskId: string,
  completedBy?: string
): Promise<AdvancementResult | null> {
  try {
    // 获取任务信息
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    if (!task) {
      console.log(`[AutoAdvance] Task ${taskId} not found`);
      return null;
    }

    // 检查阶段是否可以推进
    const checkResult = await checkStageAdvancement(task.instanceId);

    if (!checkResult.canAdvance) {
      console.log(`[AutoAdvance] Cannot advance: ${checkResult.reason}`);
      return null;
    }

    // 执行自动推进
    return await advanceWorkflowStage(task.instanceId, {
      advancementType: 'auto',
      trigger: 'task_completion',
      reason: checkResult.reason,
      operatorId: completedBy,
    });
  } catch (error) {
    console.error('[AutoAdvance] Task completion trigger failed:', error);
    return null;
  }
}

/**
 * 批量检查并推进所有可推进的工作流
 */
export async function checkAndAdvanceAll(): Promise<{
  checked: number;
  advanced: number;
  failed: number;
  details: AdvancementResult[];
}> {
  try {
    // 获取所有进行中的工作流实例
    const activeInstances = await db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.status, 'in_progress'));

    const results: AdvancementResult[] = [];
    let advanced = 0;
    let failed = 0;

    for (const instance of activeInstances) {
      const checkResult = await checkStageAdvancement(instance.id);

      if (checkResult.canAdvance) {
        const result = await advanceWorkflowStage(instance.id, {
          advancementType: 'auto',
          trigger: 'scheduled_check',
          reason: checkResult.reason,
        });

        results.push(result);

        if (result.success) {
          advanced++;
        } else {
          failed++;
        }
      }
    }

    console.log(`[AutoAdvance] Batch check: checked ${activeInstances.length}, advanced ${advanced}, failed ${failed}`);

    return {
      checked: activeInstances.length,
      advanced,
      failed,
      details: results,
    };
  } catch (error) {
    console.error('[AutoAdvance] Batch check failed:', error);
    return {
      checked: 0,
      advanced: 0,
      failed: 0,
      details: [],
    };
  }
}

/**
 * 获取下一阶段
 */
async function getNextStage(workflowId: string, currentStageId?: string) {
  const stages = await db.select()
    .from(workflowStageDefinitions)
    .where(eq(workflowStageDefinitions.workflowId, workflowId))
    .orderBy(workflowStageDefinitions.stageOrder);

  if (!currentStageId) {
    return stages.length > 0 ? stages[0] : null;
  }

  const currentIndex = stages.findIndex(s => s.id === currentStageId);

  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }

  return null;
}

/**
 * 激活阶段任务
 */
async function activateStageTasks(instanceId: string, stageId: string) {
  try {
    // 获取该阶段的所有任务
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(and(
        eq(workflowTaskInstances.instanceId, instanceId),
        eq(workflowTaskInstances.stageId, stageId)
      ));

    // 检查每个任务的依赖是否满足
    for (const task of tasks) {
      if (task.dependsOn && task.dependsOn.length > 0) {
        // 获取依赖任务的状态
        const depTasks = await db.select()
          .from(workflowTaskInstances)
          .where(inArray(workflowTaskInstances.id, task.dependsOn));

        const allDepsCompleted = depTasks.every(t => t.status === 'completed');

        await db.update(workflowTaskInstances)
          .set({
            blockedByDependencies: !allDepsCompleted,
            updatedAt: new Date(),
          })
          .where(eq(workflowTaskInstances.id, task.id));
      }
    }

    console.log(`[AutoAdvance] Activated ${tasks.length} tasks for stage ${stageId}`);
  } catch (error) {
    console.error('[AutoAdvance] Failed to activate stage tasks:', error);
  }
}

/**
 * 发送推进通知
 */
async function sendAdvancementNotifications(params: {
  instanceId: string;
  instance: typeof workflowInstances.$inferSelect;
  previousStageName?: string;
  newStageName?: string;
  workflowCompleted: boolean;
  reason: string;
}): Promise<string[]> {
  const { instanceId, instance, previousStageName, newStageName, workflowCompleted, reason } = params;
  
  try {
    // 获取工作流定义
    const workflowDef = await db.query.workflowDefinitions.findFirst({
      where: eq(workflowDefinitions.id, instance.workflowId),
    });

    // 获取所有参与任务的用户
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));

    const participantIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId))];

    // 获取下一阶段的任务分配者
    let nextStageAssignees: string[] = [];
    if (!workflowCompleted && newStageName) {
      const nextStageTasks = tasks.filter(t => 
        // 假设任务已经更新到下一阶段
        true
      );
      nextStageAssignees = nextStageTasks.filter(t => t.assigneeId).map(t => t.assigneeId!);
    }

    const notifiedUserIds: string[] = [];

    // 发送通知给所有参与者
    for (const userId of [...participantIds, ...nextStageAssignees]) {
      if (!userId || notifiedUserIds.includes(userId)) continue;

      // 获取用户角色
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      await db.insert(notifications).values({
        id: uuidv4(),
        recipientId: userId,
        recipientRole: user?.role || '全职导师', // 使用用户实际角色
        type: workflowCompleted ? 'workflow_completed' : 'workflow_advanced',
        title: workflowCompleted ? '工作流已完成' : '工作流已进入新阶段',
        content: workflowCompleted
          ? `${workflowDef?.name || '工作流'}已完成所有阶段`
          : `${workflowDef?.name || '工作流'}已从「${previousStageName}」进入「${newStageName}」阶段`,
        entityType: 'workflow_instance',
        entityId: instanceId,
        channels: ['system'],
        status: 'pending',
        createdAt: new Date(),
      });

      notifiedUserIds.push(userId);
    }

    console.log(`[AutoAdvance] Sent notifications to ${notifiedUserIds.length} users`);
    return notifiedUserIds;
  } catch (error) {
    console.error('[AutoAdvance] Failed to send notifications:', error);
    return [];
  }
}

/**
 * 记录推进日志
 */
async function logAdvancement(params: {
  instanceId: string;
  fromStageId?: string;
  toStageId?: string;
  advancementType: 'auto' | 'manual';
  trigger: string;
  reason: string;
  operatorId?: string;
}) {
  try {
    const { instanceId, fromStageId, toStageId, advancementType, trigger, reason, operatorId } = params;

    // 获取阶段名称
    let fromStageName: string | undefined;
    let toStageName: string | undefined;

    if (fromStageId) {
      const fromStage = await db.query.workflowStageDefinitions.findFirst({
        where: eq(workflowStageDefinitions.id, fromStageId),
      });
      fromStageName = fromStage?.name;
    }

    if (toStageId) {
      const toStage = await db.query.workflowStageDefinitions.findFirst({
        where: eq(workflowStageDefinitions.id, toStageId),
      });
      toStageName = toStage?.name;
    }

    // 插入日志记录
    // 注意：需要确保 workflowAdvancementLogs 表存在
    // 如果表不存在，使用 console.log 记录
    
    console.log(`[AdvancementLog] ${instanceId}: ${fromStageName || 'start'} -> ${toStageName || 'completed'} (${advancementType}, ${trigger})`);

    // 尝试写入数据库日志
    try {
      await db.insert(workflowAdvancementLogs).values({
        id: uuidv4(),
        instanceId,
        fromStageId,
        toStageId,
        advancementType,
        trigger,
        reason,
        metadata: {
          fromStageName,
          toStageName,
          operatorId,
        },
        createdAt: new Date(),
      });
    } catch (dbError) {
      // 如果表不存在，仅使用 console.log
      console.log('[AdvancementLog] DB insert skipped:', (dbError as Error).message);
    }
  } catch (error) {
    console.error('[AutoAdvance] Failed to log advancement:', error);
  }
}

/**
 * 获取工作流推进历史
 */
export async function getAdvancementHistory(instanceId: string) {
  try {
    // 尝试从数据库获取
    const logs = await db.query.workflowAdvancementLogs.findMany({
      where: eq(workflowAdvancementLogs.instanceId, instanceId),
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    return logs || [];
  } catch (error) {
    console.error('[AutoAdvance] Failed to get advancement history:', error);
    return [];
  }
}

/**
 * 回滚到上一阶段（管理员操作）
 */
export async function rollbackStage(
  instanceId: string,
  options: {
    reason: string;
    operatorId: string;
  }
): Promise<AdvancementResult> {
  const { reason, operatorId } = options;

  try {
    // 获取工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });

    if (!instance) {
      return {
        success: false,
        instanceId,
        reason: '工作流实例不存在',
        advancedAt: new Date(),
        affectedTasks: [],
        notifiedUsers: [],
      };
    }

    // 获取所有阶段
    const stages = await db.select()
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.workflowId, instance.workflowId))
      .orderBy(workflowStageDefinitions.stageOrder);

    const currentIndex = stages.findIndex(s => s.id === instance.currentStageId);

    if (currentIndex <= 0) {
      return {
        success: false,
        instanceId,
        reason: '已经是第一个阶段，无法回滚',
        advancedAt: new Date(),
        affectedTasks: [],
        notifiedUsers: [],
      };
    }

    // 获取上一阶段
    const previousStage = stages[currentIndex - 1];

    // 更新工作流实例
    await db.update(workflowInstances)
      .set({
        currentStageId: previousStage.id,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(workflowInstances.id, instanceId));

    // 重置当前阶段的任务状态
    await db.update(workflowTaskInstances)
      .set({
        status: 'pending',
        completedAt: null,
        startedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(workflowTaskInstances.instanceId, instanceId),
        eq(workflowTaskInstances.stageId, previousStage.id)
      ));

    // 记录日志
    await logAdvancement({
      instanceId,
      fromStageId: instance.currentStageId || undefined,
      toStageId: previousStage.id,
      advancementType: 'manual',
      trigger: 'rollback',
      reason: `回滚原因：${reason}`,
      operatorId,
    });

    return {
      success: true,
      instanceId,
      previousStageId: instance.currentStageId || undefined,
      previousStageName: stages[currentIndex].name,
      newStageId: previousStage.id,
      newStageName: previousStage.name,
      reason: `已回滚到${previousStage.name}阶段`,
      advancedAt: new Date(),
      affectedTasks: [],
      notifiedUsers: [],
    };
  } catch (error) {
    console.error('[AutoAdvance] Rollback failed:', error);
    return {
      success: false,
      instanceId,
      reason: `回滚失败：${error instanceof Error ? error.message : '未知错误'}`,
      advancedAt: new Date(),
      affectedTasks: [],
      notifiedUsers: [],
    };
  }
}

/**
 * 工作流任务依赖服务
 * 实现任务前置依赖检查和处理
 */

import { db } from '@/db';
import { workflowTaskInstances, workflowTaskTemplates } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// 依赖检查结果
export interface DependencyCheckResult {
  canStart: boolean;
  blockedBy: string[];
  pendingDependencies: string[];
  completedDependencies: string[];
}

/**
 * 检查任务是否可以开始（所有依赖是否已完成）
 */
export async function checkTaskDependencies(
  taskId: string
): Promise<DependencyCheckResult> {
  // 获取任务
  const task = await db.query.workflowTaskInstances.findFirst({
    where: eq(workflowTaskInstances.id, taskId),
  });

  if (!task) {
    throw new Error('任务不存在');
  }

  // 如果没有依赖，可以直接开始
  if (!task.dependsOn || task.dependsOn.length === 0) {
    return {
      canStart: true,
      blockedBy: [],
      pendingDependencies: [],
      completedDependencies: [],
    };
  }

  // 获取所有依赖任务
  const dependencyTasks = await db.select()
    .from(workflowTaskInstances)
    .where(inArray(workflowTaskInstances.id, task.dependsOn));

  // 分类依赖任务
  const completedDependencies: string[] = [];
  const pendingDependencies: string[] = [];
  const blockedBy: string[] = [];

  for (const depTask of dependencyTasks) {
    if (depTask.status === 'completed') {
      completedDependencies.push(depTask.id);
    } else {
      pendingDependencies.push(depTask.id);
      blockedBy.push(depTask.name);
    }
  }

  return {
    canStart: pendingDependencies.length === 0,
    blockedBy,
    pendingDependencies,
    completedDependencies,
  };
}

/**
 * 更新任务的阻塞状态
 */
export async function updateTaskBlockedStatus(
  taskId: string
): Promise<boolean> {
  const checkResult = await checkTaskDependencies(taskId);
  
  await db.update(workflowTaskInstances)
    .set({
      blockedByDependencies: !checkResult.canStart,
      updatedAt: new Date(),
    })
    .where(eq(workflowTaskInstances.id, taskId));

  return checkResult.canStart;
}

/**
 * 批量更新任务的依赖状态
 */
export async function updateDependenciesForTask(
  completedTaskId: string
): Promise<{
  unblocked: string[];
  stillBlocked: string[];
}> {
  // 查找所有依赖此任务的任务
  // 由于dependsOn是JSONB数组，需要使用SQL查询
  const tasksWithDependency = await db.select()
    .from(workflowTaskInstances)
    .where(eq(workflowTaskInstances.status, 'pending'));

  const dependentTasks = tasksWithDependency.filter(task => 
    task.dependsOn && task.dependsOn.includes(completedTaskId)
  );

  const unblocked: string[] = [];
  const stillBlocked: string[] = [];

  for (const task of dependentTasks) {
    const canStart = await updateTaskBlockedStatus(task.id);
    
    if (canStart) {
      unblocked.push(task.id);
    } else {
      stillBlocked.push(task.id);
    }
  }

  return { unblocked, stillBlocked };
}

/**
 * 为任务设置依赖关系
 */
export async function setTaskDependencies(
  taskId: string,
  dependsOn: string[]
): Promise<void> {
  // 验证依赖任务是否存在
  if (dependsOn.length > 0) {
    const dependencyTasks = await db.select()
      .from(workflowTaskInstances)
      .where(inArray(workflowTaskInstances.id, dependsOn));

    if (dependencyTasks.length !== dependsOn.length) {
      throw new Error('部分依赖任务不存在');
    }

    // 检查是否形成循环依赖
    const hasCycle = await checkCircularDependency(taskId, dependsOn);
    if (hasCycle) {
      throw new Error('不能设置循环依赖');
    }
  }

  // 更新依赖关系
  await db.update(workflowTaskInstances)
    .set({
      dependsOn: dependsOn.length > 0 ? dependsOn : null,
      blockedByDependencies: dependsOn.length > 0,
      updatedAt: new Date(),
    })
    .where(eq(workflowTaskInstances.id, taskId));

  // 如果有依赖，检查是否可以开始
  if (dependsOn.length > 0) {
    await updateTaskBlockedStatus(taskId);
  }
}

/**
 * 检查循环依赖
 */
async function checkCircularDependency(
  taskId: string,
  dependsOn: string[]
): Promise<boolean> {
  const visited = new Set<string>();
  const toVisit = [...dependsOn];

  while (toVisit.length > 0) {
    const currentId = toVisit.pop()!;
    
    if (currentId === taskId) {
      return true; // 发现循环
    }

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // 获取当前任务的依赖
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, currentId),
    });

    if (task?.dependsOn && task.dependsOn.length > 0) {
      toVisit.push(...task.dependsOn);
    }
  }

  return false;
}

/**
 * 从任务模板创建依赖关系
 */
export async function createDependenciesFromTemplates(
  instanceId: string
): Promise<void> {
  // 获取实例的所有任务
  const tasks = await db.select()
    .from(workflowTaskInstances)
    .where(eq(workflowTaskInstances.instanceId, instanceId));

  // 建立模板ID到任务实例ID的映射
  const templateToInstanceMap = new Map<string, string>();
  for (const task of tasks) {
    if (task.templateId) {
      templateToInstanceMap.set(task.templateId, task.id);
    }
  }

  // 获取所有模板的依赖关系
  const templateIds = tasks.filter(t => t.templateId).map(t => t.templateId!);
  const templates = await db.select()
    .from(workflowTaskTemplates)
    .where(inArray(workflowTaskTemplates.id, templateIds));

  // 设置依赖关系
  for (const template of templates) {
    if (template.dependsOn && template.dependsOn.length > 0) {
      const instanceId = templateToInstanceMap.get(template.id);
      if (!instanceId) continue;

      // 转换模板依赖为实例依赖
      const instanceDependencies: string[] = [];
      for (const depTemplateId of template.dependsOn) {
        const depInstanceId = templateToInstanceMap.get(depTemplateId);
        if (depInstanceId) {
          instanceDependencies.push(depInstanceId);
        }
      }

      if (instanceDependencies.length > 0) {
        await setTaskDependencies(instanceId, instanceDependencies);
      }
    }
  }
}

/**
 * 获取任务的完整依赖链
 */
export async function getDependencyChain(
  taskId: string
): Promise<{
  upstream: typeof workflowTaskInstances.$inferSelect[];
  downstream: typeof workflowTaskInstances.$inferSelect[];
}> {
  // 获取上游依赖链（此任务依赖的任务）
  const upstream: typeof workflowTaskInstances.$inferSelect[] = [];
  const visitedUpstream = new Set<string>();
  
  async function collectUpstream(id: string) {
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, id),
    });
    
    if (!task || !task.dependsOn || task.dependsOn.length === 0) return;
    
    for (const depId of task.dependsOn) {
      if (visitedUpstream.has(depId)) continue;
      visitedUpstream.add(depId);
      
      const depTask = await db.query.workflowTaskInstances.findFirst({
        where: eq(workflowTaskInstances.id, depId),
      });
      
      if (depTask) {
        upstream.push(depTask);
        await collectUpstream(depId);
      }
    }
  }
  
  await collectUpstream(taskId);

  // 获取下游依赖链（依赖此任务的任务）
  const downstream: typeof workflowTaskInstances.$inferSelect[] = [];
  const visitedDownstream = new Set<string>();
  
  async function collectDownstream(id: string) {
    // 查找所有依赖此任务的任务
    const allTasks = await db.select()
      .from(workflowTaskInstances);
    
    const dependentTasks = allTasks.filter(t => 
      t.dependsOn && t.dependsOn.includes(id)
    );
    
    for (const depTask of dependentTasks) {
      if (visitedDownstream.has(depTask.id)) continue;
      visitedDownstream.add(depTask.id);
      
      downstream.push(depTask);
      await collectDownstream(depTask.id);
    }
  }
  
  await collectDownstream(taskId);

  return { upstream, downstream };
}

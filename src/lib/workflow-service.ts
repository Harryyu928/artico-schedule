/**
 * 工作流服务层
 * 提供工作流实例创建和管理的高级功能
 */

import { db } from '@/db';
import { 
  workflowDefinitions, 
  workflowStageDefinitions,
  workflowTaskTemplates,
  workflowInstances,
  workflowTaskInstances,
  students,
  courseSelectionForms,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 为学生自动创建入学流程工作流实例
 */
export async function createStudentOnboardingWorkflow(studentId: string, studentName: string) {
  try {
    return await createWorkflowInstance({
      workflowType: 'student_onboarding',
      entityType: 'student',
      entityId: studentId,
      entityName: studentName,
    });
  } catch (error) {
    console.error('创建学生入学流程失败:', error);
    throw error;
  }
}

/**
 * 为选课单自动创建处理流程工作流实例
 */
export async function createSelectionFormWorkflow(formId: string, studentId: string, studentName: string) {
  try {
    return await createWorkflowInstance({
      workflowType: 'selection_form',
      entityType: 'selection_form',
      entityId: formId,
      entityName: `${studentName}的选课单`,
    });
  } catch (error) {
    console.error('创建选课单处理流程失败:', error);
    throw error;
  }
}

/**
 * 创建工作流实例
 */
export async function createWorkflowInstance(params: {
  workflowType: string;
  entityType: string;
  entityId: string;
  entityName: string;
}) {
  const { workflowType, entityType, entityId, entityName } = params;

  // 检查是否已存在相同的工作流实例
  const existing = await db.query.workflowInstances.findFirst({
    where: and(
      eq(workflowInstances.entityType, entityType),
      eq(workflowInstances.entityId, entityId)
    ),
  });
  
  if (existing) {
    console.log(`[Workflow] Instance already exists for ${entityType}:${entityId}`);
    return existing;
  }

  // 查找工作流定义
  const allDefs = await db.select().from(workflowDefinitions);
  const workflowDef = allDefs.find(d => d.type === workflowType);
  
  if (!workflowDef) {
    throw new Error(`工作流类型不存在: ${workflowType}`);
  }

  // 获取阶段定义
  const stageDefs = await db.select()
    .from(workflowStageDefinitions)
    .where(eq(workflowStageDefinitions.workflowId, workflowDef.id))
    .orderBy(workflowStageDefinitions.stageOrder);
  
  if (stageDefs.length === 0) {
    throw new Error('工作流没有定义阶段');
  }

  const firstStage = stageDefs[0];
  
  // 创建工作流实例
  const instanceId = uuidv4();
  
  await db.insert(workflowInstances).values({
    id: instanceId,
    workflowId: workflowDef.id,
    entityType,
    entityId,
    currentStageId: firstStage.id,
    status: 'pending',
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    startedAt: null, // 不自动设置开始时间，等第一个任务开始时设置
  });

  // 创建任务实例
  let totalTasks = 0;
  const createdTasks: { templateId: string; instanceId: string }[] = [];
  
  for (const stageDef of stageDefs) {
    const taskTemplates = await db.select()
      .from(workflowTaskTemplates)
      .where(eq(workflowTaskTemplates.stageId, stageDef.id))
      .orderBy(workflowTaskTemplates.taskOrder);
    
    for (const template of taskTemplates) {
      const taskInstanceId = uuidv4();
      await db.insert(workflowTaskInstances).values({
        id: taskInstanceId,
        instanceId,
        templateId: template.id,
        stageId: stageDef.id,
        name: template.name,
        description: template.description,
        priority: template.priority,
        assigneeRole: template.assigneeRole,
        status: 'pending',
        checklist: template.checklist as any || [],
        totalChecklist: (template.checklist as any)?.length || 0,
        completedChecklist: 0,
        dependsOn: template.dependsOn as any || null,
        blockedByDependencies: (template.dependsOn && (template.dependsOn as any).length > 0) || false,
      });
      totalTasks++;
      createdTasks.push({ templateId: template.id, instanceId: taskInstanceId });
    }
  }
  
  // 处理依赖关系映射（将模板依赖转换为实例依赖）
  const templateToInstanceMap = new Map(createdTasks.map(t => [t.templateId, t.instanceId]));
  
  for (const { templateId, instanceId } of createdTasks) {
    const template = await db.query.workflowTaskTemplates.findFirst({
      where: eq(workflowTaskTemplates.id, templateId),
    });
    
    if (template?.dependsOn && (template.dependsOn as string[]).length > 0) {
      const instanceDependencies = (template.dependsOn as string[])
        .map(depTemplateId => templateToInstanceMap.get(depTemplateId))
        .filter(Boolean) as string[];
      
      if (instanceDependencies.length > 0) {
        await db.update(workflowTaskInstances)
          .set({ dependsOn: instanceDependencies })
          .where(eq(workflowTaskInstances.id, instanceId));
      }
    }
  }
  
  // 更新总任务数
  await db.update(workflowInstances)
    .set({ totalTasks })
    .where(eq(workflowInstances.id, instanceId));

  // 查询创建的实例
  const newInstance = await db.query.workflowInstances.findFirst({
    where: eq(workflowInstances.id, instanceId),
  });

  console.log(`[Workflow] Created instance ${instanceId} for ${entityType}:${entityId}, total tasks: ${totalTasks}`);

  return {
    ...newInstance,
    workflowName: workflowDef.name,
    entityName,
    currentStageName: firstStage.name,
  };
}

/**
 * 完成特定任务（用于其他模块调用）
 */
export async function completeTaskByName(instanceId: string, taskName: string) {
  const task = await db.query.workflowTaskInstances.findFirst({
    where: and(
      eq(workflowTaskInstances.instanceId, instanceId),
      eq(workflowTaskInstances.name, taskName)
    ),
  });
  
  if (!task) {
    console.log(`[Workflow] Task "${taskName}" not found in instance ${instanceId}`);
    return null;
  }
  
  if (task.status === 'completed') {
    return task;
  }
  
  // 更新任务状态
  await db.update(workflowTaskInstances)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowTaskInstances.id, task.id));
  
  // 解除依赖此任务的其他任务的阻塞状态
  await unblockDependentTasks(task.id);
  
  // 更新工作流进度
  await updateWorkflowProgress(instanceId);
  
  return task;
}

/**
 * 解除依赖任务阻塞
 */
async function unblockDependentTasks(completedTaskId: string) {
  try {
    // 获取所有依赖此任务的任务
    const allTasks = await db.select()
      .from(workflowTaskInstances);
    
    const dependentTasks = allTasks.filter(t => 
      t.dependsOn && 
      (t.dependsOn as string[]).includes(completedTaskId) &&
      t.status === 'pending'
    );
    
    for (const dependentTask of dependentTasks) {
      // 检查所有依赖是否都已完成
      const dependencies = dependentTask.dependsOn as string[] || [];
      const allCompleted = await Promise.all(
        dependencies.map(async (depId) => {
          const depTask = await db.query.workflowTaskInstances.findFirst({
            where: eq(workflowTaskInstances.id, depId),
          });
          return depTask?.status === 'completed';
        })
      );
      
      // 如果所有依赖都已完成，解除阻塞
      if (allCompleted.every(Boolean)) {
        await db.update(workflowTaskInstances)
          .set({
            blockedByDependencies: false,
            updatedAt: new Date(),
          })
          .where(eq(workflowTaskInstances.id, dependentTask.id));
        
        console.log(`[Workflow] Unblocked task: ${dependentTask.name}`);
      }
    }
  } catch (error) {
    console.error('解除任务阻塞失败:', error);
  }
}

/**
 * 获取实体的工作流实例
 */
export async function getEntityWorkflowInstance(entityType: string, entityId: string) {
  const instance = await db.query.workflowInstances.findFirst({
    where: and(
      eq(workflowInstances.entityType, entityType),
      eq(workflowInstances.entityId, entityId)
    ),
    orderBy: [desc(workflowInstances.createdAt)],
  });
  
  return instance;
}

/**
 * 更新工作流进度（从任务完成触发）
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
    const currentStageCompleted = currentStageTasks.length > 0 && 
      currentStageTasks.every(t => t.status === 'completed');
    
    // 如果当前阶段完成，自动推进到下一阶段
    if (currentStageCompleted && instance.currentStageId) {
      const nextStage = await getNextStage(instance.workflowId, instance.currentStageId);
      
      if (nextStage) {
        updateData.currentStageId = nextStage.id;
        console.log(`[Workflow] Instance ${instanceId} advanced to stage: ${nextStage.name}`);
      } else {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
        console.log(`[Workflow] Instance ${instanceId} completed`);
      }
    } else if (completedTasks === totalTasks) {
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
  const stages = await db.select()
    .from(workflowStageDefinitions)
    .where(eq(workflowStageDefinitions.workflowId, workflowId))
    .orderBy(workflowStageDefinitions.stageOrder);
  
  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }
  
  return null;
}

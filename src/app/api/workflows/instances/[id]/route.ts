import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowDefinitions, 
  workflowStageDefinitions,
  workflowInstances,
  workflowTaskInstances,
  students,
  courseSelectionForms,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/workflows/instances/[id]
 * 获取工作流实例详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 查询工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, id),
    });
    
    if (!instance) {
      return NextResponse.json(
        { error: '工作流实例不存在' },
        { status: 404 }
      );
    }

    // 获取工作流定义
    const workflowDef = await db.query.workflowDefinitions.findFirst({
      where: eq(workflowDefinitions.id, instance.workflowId),
    });

    // 获取所有阶段定义
    const stageDefs = await db.select()
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.workflowId, instance.workflowId))
      .orderBy(workflowStageDefinitions.stageOrder);
    
    // 计算工作流开始时间
    const workflowStartTime = instance.startedAt || instance.createdAt;
    const startTime = new Date(workflowStartTime);
    
    // 获取每个阶段的任务实例，并计算预估时间
    const stages = await Promise.all(
      stageDefs.map(async (stageDef, index) => {
        const tasks = await db.select()
          .from(workflowTaskInstances)
          .where(and(
            eq(workflowTaskInstances.instanceId, instance.id),
            eq(workflowTaskInstances.stageId, stageDef.id)
          ));
        
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        
        // 计算阶段状态
        let stageStatus = 'pending';
        if (tasks.length > 0) {
          if (completedTasks === tasks.length) {
            stageStatus = 'completed';
          } else if (tasks.some(t => t.status === 'in_progress')) {
            stageStatus = 'in_progress';
          }
        }

        // 计算预估时间
        const estimatedDays = stageDef.estimatedDays || calculateDefaultEstimatedDays(stageDef.stageOrder);
        const estimatedHours = estimatedDays * 8; // 假设每天8小时工作时间

        // 计算实际用时
        let actualDuration = 0;
        let stageStartTime: Date | null = null;
        let stageEndTime: Date | null = null;
        
        if (stageStatus !== 'pending') {
          // 找到阶段开始时间（第一个任务的开始时间或创建时间）
          const firstTask = tasks.find(t => t.startedAt || t.createdAt);
          if (firstTask) {
            stageStartTime = firstTask.startedAt ? new Date(firstTask.startedAt) : new Date(firstTask.createdAt);
          }
          
          // 找到阶段结束时间
          if (stageStatus === 'completed') {
            const lastCompletedTask = tasks
              .filter(t => t.completedAt)
              .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
            if (lastCompletedTask) {
              stageEndTime = new Date(lastCompletedTask.completedAt!);
            }
          }
          
          // 计算实际用时（小时）
          if (stageStartTime) {
            const endTime = stageEndTime || new Date();
            actualDuration = Math.round((endTime.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60));
          }
        }

        // 计算预估开始和结束日期
        const estimatedStartDate = new Date(startTime);
        for (let i = 0; i < index; i++) {
          const prevStage = stageDefs[i];
          estimatedStartDate.setDate(estimatedStartDate.getDate() + (prevStage.estimatedDays || 3));
        }
        const estimatedEndDate = new Date(estimatedStartDate);
        estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays);

        return {
          id: stageDef.id,
          stageOrder: stageDef.stageOrder,
          name: stageDef.name,
          color: stageDef.color,
          icon: stageDef.icon,
          status: stageStatus,
          completedTasks,
          totalTasks: tasks.length,
          // 预估时间
          estimatedDays,
          estimatedHours,
          estimatedStartDate: estimatedStartDate.toISOString().split('T')[0],
          estimatedEndDate: estimatedEndDate.toISOString().split('T')[0],
          // 实际用时
          actualDuration,
          actualDurationFormatted: formatDuration(actualDuration),
          // 进度百分比
          progressPercentage: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
          tasks: tasks.map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            assigneeRole: t.assigneeRole,
            assigneeId: t.assigneeId,
            priority: t.priority,
            completedAt: t.completedAt,
            checklist: t.checklist,
            // 任务预估时间（分钟）
            estimatedMinutes: stageDef.estimatedDays ? Math.round((estimatedDays * 8 * 60) / tasks.length) : undefined,
          })),
        };
      })
    );

    // 计算总预估时间
    const totalEstimatedDays = stages.reduce((sum, s) => sum + s.estimatedDays, 0);
    const totalActualHours = stages.reduce((sum, s) => sum + s.actualDuration, 0);
    
    // 预计完成日期
    const estimatedCompletionDate = new Date(startTime);
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + totalEstimatedDays);

    // 获取实体名称
    let entityName = instance.entityId;
    if (instance.entityType === 'student') {
      const student = await db.query.students.findFirst({
        where: eq(students.id, instance.entityId),
      });
      if (student) {
        entityName = student.name;
      }
    } else if (instance.entityType === 'selection_form') {
      const form = await db.query.courseSelectionForms.findFirst({
        where: eq(courseSelectionForms.id, instance.entityId),
      });
      if (form) {
        const student = await db.query.students.findFirst({
          where: eq(students.id, form.studentId),
        });
        entityName = student ? `${student.name}的选课单` : `选课单 ${form.formId}`;
      }
    }

    // 获取当前阶段名称
    const currentStage = stageDefs.find(s => s.id === instance.currentStageId);

    return NextResponse.json({
      ...instance,
      workflowName: workflowDef?.name || '',
      entityName,
      currentStageName: currentStage?.name || '',
      // 时间统计
      timeStats: {
        totalEstimatedDays,
        totalEstimatedHours: totalEstimatedDays * 8,
        totalActualHours,
        totalActualDays: Math.round(totalActualHours / 8 * 10) / 10,
        estimatedCompletionDate: estimatedCompletionDate.toISOString().split('T')[0],
        daysRemaining: Math.max(0, Math.ceil((estimatedCompletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        isOverdue: Date.now() > estimatedCompletionDate.getTime() && instance.status !== 'completed',
      },
      stages,
    });
  } catch (error) {
    console.error('获取工作流实例详情失败:', error);
    return NextResponse.json(
      { error: '获取工作流实例详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 计算默认预估天数（基于阶段顺序）
 */
function calculateDefaultEstimatedDays(stageOrder: number): number {
  // 默认每个阶段预估3天
  return 3;
}

/**
 * 格式化持续时间
 */
function formatDuration(hours: number): string {
  if (hours < 1) {
    return '< 1小时';
  } else if (hours < 24) {
    return `${hours}小时`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days}天`;
    }
    return `${days}天${remainingHours}小时`;
  }
}

/**
 * PUT /api/workflows/instances/[id]
 * 更新工作流实例状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    
    // 查询工作流实例
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, id),
    });
    
    if (!instance) {
      return NextResponse.json(
        { error: '工作流实例不存在' },
        { status: 404 }
      );
    }

    // 更新实例
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.status) {
      updateData.status = body.status;
    }
    if (body.currentStageId) {
      updateData.currentStageId = body.currentStageId;
    }
    if (body.progress !== undefined) {
      updateData.progress = body.progress;
    }
    if (body.completedTasks !== undefined) {
      updateData.completedTasks = body.completedTasks;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate;
    }
    
    // 如果状态变为completed，设置完成时间
    if (body.status === 'completed') {
      updateData.completedAt = new Date();
    }

    await db.update(workflowInstances)
      .set(updateData)
      .where(eq(workflowInstances.id, id));

    // 重新查询更新后的实例
    const updatedInstance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, id),
    });

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error('更新工作流实例失败:', error);
    return NextResponse.json(
      { error: '更新工作流实例失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

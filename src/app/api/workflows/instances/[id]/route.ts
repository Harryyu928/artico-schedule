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
    
    // 获取每个阶段的任务实例
    const stages = await Promise.all(
      stageDefs.map(async (stageDef) => {
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
        
        return {
          id: stageDef.id,
          stageOrder: stageDef.stageOrder,
          name: stageDef.name,
          color: stageDef.color,
          icon: stageDef.icon,
          status: stageStatus,
          completedTasks,
          totalTasks: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            assigneeRole: t.assigneeRole,
            assigneeId: t.assigneeId,
            priority: t.priority,
            completedAt: t.completedAt,
            checklist: t.checklist,
          })),
        };
      })
    );

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

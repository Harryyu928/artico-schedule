import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowDefinitions, 
  workflowStageDefinitions,
  workflowTaskTemplates,
  workflowInstances,
  workflowTaskInstances,
  students
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/workflows
 * 获取工作流定义列表和实例
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const includeInstances = searchParams.get('includeInstances') === 'true';

  try {
    // 查询工作流定义
    let definitionsQuery = db.select().from(workflowDefinitions);
    
    // 获取所有定义
    const definitions = await definitionsQuery;
    
    // 获取每个定义的阶段
    const definitionsWithStages = await Promise.all(
      definitions.map(async (def) => {
        const stages = await db.select()
          .from(workflowStageDefinitions)
          .where(eq(workflowStageDefinitions.workflowId, def.id))
          .orderBy(workflowStageDefinitions.stageOrder);
        
        // 获取每个阶段的任务模板
        const stagesWithTasks = await Promise.all(
          stages.map(async (stage) => {
            const tasks = await db.select()
              .from(workflowTaskTemplates)
              .where(eq(workflowTaskTemplates.stageId, stage.id))
              .orderBy(workflowTaskTemplates.taskOrder);
            
            return {
              ...stage,
              tasks: tasks.map(t => ({
                name: t.name,
                assigneeRole: t.assigneeRole,
              })),
            };
          })
        );
        
        return {
          ...def,
          stages: stagesWithTasks,
        };
      })
    );
    
    let result: any = { definitions: definitionsWithStages };
    
    // 如果需要，获取实例
    if (includeInstances) {
      const instances = await db.select()
        .from(workflowInstances)
        .orderBy(desc(workflowInstances.createdAt));
      
      // 获取每个实例的阶段信息
      const instancesWithStages = await Promise.all(
        instances.map(async (instance) => {
          // 获取该工作流定义的所有阶段
          const stages = await db.select()
            .from(workflowStageDefinitions)
            .where(eq(workflowStageDefinitions.workflowId, instance.workflowId))
            .orderBy(workflowStageDefinitions.stageOrder);
          
          // 获取每个阶段的任务实例
          const stagesWithTasks = await Promise.all(
            stages.map(async (stage) => {
              const tasks = await db.select()
                .from(workflowTaskInstances)
                .where(and(
                  eq(workflowTaskInstances.instanceId, instance.id),
                  eq(workflowTaskInstances.stageId, stage.id)
                ));
              
              const completedTasks = tasks.filter(t => t.status === 'completed').length;
              
              return {
                id: stage.id,
                name: stage.name,
                color: stage.color,
                icon: stage.icon,
                status: tasks.length > 0 
                  ? (completedTasks === tasks.length ? 'completed' : 
                     tasks.some(t => t.status === 'in_progress') ? 'in_progress' : 'pending')
                  : 'pending',
                completedTasks,
                totalTasks: tasks.length,
                tasks,
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
          }
          
          // 获取当前阶段名称
          const currentStage = stages.find(s => s.id === instance.currentStageId);
          
          return {
            ...instance,
            entityName,
            currentStageName: currentStage?.name || '',
            stages: stagesWithTasks,
          };
        })
      );
      
      result.instances = instancesWithStages;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取工作流列表失败:', error);
    return NextResponse.json(
      { error: '获取工作流列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * 创建工作流实例
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowType, entityType, entityId, entityName } = body;

    if (!workflowType || !entityType || !entityId) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 查找工作流定义
    const workflowDef = await db.query.workflowDefinitions.findFirst({
      where: eq(workflowDefinitions.type, workflowType),
    });
    
    if (!workflowDef) {
      return NextResponse.json(
        { error: '工作流类型不存在' },
        { status: 400 }
      );
    }

    // 获取阶段定义
    const stageDefs = await db.select()
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.workflowId, workflowDef.id))
      .orderBy(workflowStageDefinitions.stageOrder);
    
    if (stageDefs.length === 0) {
      return NextResponse.json(
        { error: '工作流没有定义阶段' },
        { status: 400 }
      );
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
      startedAt: new Date(),
    });

    // 创建任务实例
    let totalTasks = 0;
    for (const stageDef of stageDefs) {
      const taskTemplates = await db.select()
        .from(workflowTaskTemplates)
        .where(eq(workflowTaskTemplates.stageId, stageDef.id))
        .orderBy(workflowTaskTemplates.taskOrder);
      
      for (const template of taskTemplates) {
        await db.insert(workflowTaskInstances).values({
          id: uuidv4(),
          instanceId,
          templateId: template.id,
          stageId: stageDef.id,
          name: template.name,
          description: template.description,
          priority: template.priority,
          assigneeRole: template.assigneeRole,
          status: 'pending',
          checklist: template.checklist?.map((text: string) => ({ text, completed: false })) || [],
          totalChecklist: template.checklist?.length || 0,
          completedChecklist: 0,
        });
        totalTasks++;
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

    return NextResponse.json({
      ...newInstance,
      workflowName: workflowDef.name,
      entityName: entityName || entityId,
      currentStageName: firstStage.name,
    }, { status: 201 });
  } catch (error) {
    console.error('创建工作流实例失败:', error);
    return NextResponse.json(
      { error: '创建工作流实例失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

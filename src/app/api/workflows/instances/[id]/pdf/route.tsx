/**
 * 工作流任务清单 PDF 生成 API
 * 
 * POST /api/workflows/instances/[id]/pdf - 生成并上传 PDF
 * GET /api/workflows/instances/[id]/pdf - 获取 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowInstances, 
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTaskInstances,
  workflowTaskTemplates,
  students,
  users,
} from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { 
  generateAndUploadPDF,
  getPDFSignedUrl,
  formatDateTime,
  formatDate,
} from '@/lib/pdf-service';
import { WorkflowPDF } from '@/lib/pdf-templates/workflow-pdf';

// 工作流类型映射
const WORKFLOW_TYPE_NAMES: Record<string, string> = {
  'student_onboarding': '学生入学流程',
  'selection_form': '选课单处理流程',
  'course_progress': '课程进度流程',
  'application_tracking': '申请跟踪流程',
};

// 实体类型映射
const ENTITY_TYPE_NAMES: Record<string, string> = {
  'student': '学生',
  'selection_form': '选课单',
};

// POST - 生成 PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取工作流实例
    const instances = await db
      .select({
        id: workflowInstances.id,
        workflowId: workflowInstances.workflowId,
        entityType: workflowInstances.entityType,
        entityId: workflowInstances.entityId,
        status: workflowInstances.status,
        progress: workflowInstances.progress,
        totalTasks: workflowInstances.totalTasks,
        completedTasks: workflowInstances.completedTasks,
        startedAt: workflowInstances.startedAt,
        completedAt: workflowInstances.completedAt,
        dueDate: workflowInstances.dueDate,
        notes: workflowInstances.notes,
        workflowName: workflowDefinitions.name,
        workflowType: workflowDefinitions.type,
      })
      .from(workflowInstances)
      .leftJoin(workflowDefinitions, eq(workflowInstances.workflowId, workflowDefinitions.id))
      .where(eq(workflowInstances.id, id))
      .limit(1);

    if (instances.length === 0) {
      return NextResponse.json(
        { success: false, error: '工作流实例不存在' },
        { status: 404 }
      );
    }

    const instance = instances[0];

    // 获取关联实体名称
    let entityName = instance.entityId;
    if (instance.entityType === 'student') {
      const studentRecords = await db
        .select({ name: students.name })
        .from(students)
        .where(eq(students.id, instance.entityId))
        .limit(1);
      if (studentRecords.length > 0) {
        entityName = studentRecords[0].name;
      }
    }

    // 获取阶段定义
    const stageDefs = await db
      .select()
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.workflowId, instance.workflowId))
      .orderBy(asc(workflowStageDefinitions.stageOrder));

    // 获取任务实例
    const taskInstances = await db
      .select({
        id: workflowTaskInstances.id,
        stageId: workflowTaskInstances.stageId,
        name: workflowTaskInstances.name,
        description: workflowTaskInstances.description,
        status: workflowTaskInstances.status,
        priority: workflowTaskInstances.priority,
        assigneeId: workflowTaskInstances.assigneeId,
        assigneeRole: workflowTaskInstances.assigneeRole,
        dueDate: workflowTaskInstances.dueDate,
        completedAt: workflowTaskInstances.completedAt,
        notes: workflowTaskInstances.notes,
        checklist: workflowTaskInstances.checklist,
      })
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, id));

    // 获取任务分配者姓名
    const assigneeIds = taskInstances
      .filter(t => t.assigneeId)
      .map(t => t.assigneeId as string);
    
    const assigneeMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const assignees = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, assigneeIds[0])); // 简化处理
      
      assignees.forEach(a => {
        assigneeMap[a.id] = a.name;
      });
    }

    // 构建阶段数据
    const stages = stageDefs.map((stageDef) => {
      const stageTasks = taskInstances
        .filter(t => t.stageId === stageDef.id)
        .map((task) => ({
          id: task.id,
          name: task.name,
          description: task.description || undefined,
          status: task.status,
          priority: task.priority,
          assigneeName: task.assigneeId ? assigneeMap[task.assigneeId] : undefined,
          assigneeRole: task.assigneeRole || undefined,
          dueDate: task.dueDate ? formatDate(task.dueDate) : undefined,
          completedAt: task.completedAt ? formatDateTime(task.completedAt) : undefined,
          notes: task.notes || undefined,
          checklist: task.checklist as Array<{ text: string; completed: boolean }> | undefined,
        }));

      // 计算阶段状态
      const completedCount = stageTasks.filter(t => t.status === 'completed').length;
      let stageStatus = 'pending';
      if (completedCount === stageTasks.length && stageTasks.length > 0) {
        stageStatus = 'completed';
      } else if (completedCount > 0 || stageTasks.some(t => t.status === 'in_progress')) {
        stageStatus = 'in_progress';
      }

      return {
        id: stageDef.id,
        name: stageDef.name,
        order: stageDef.stageOrder,
        color: stageDef.color,
        status: stageStatus,
        estimatedDays: stageDef.estimatedDays || undefined,
        tasks: stageTasks,
      };
    });

    // 生成 PDF
    const pdfData = {
      workflowName: instance.workflowName || '工作流',
      workflowType: instance.workflowType ? (WORKFLOW_TYPE_NAMES[instance.workflowType] || instance.workflowType) : '未知类型',
      entityId: instance.entityId,
      entityName,
      entityType: instance.entityType ? (ENTITY_TYPE_NAMES[instance.entityType] || instance.entityType) : '未知',
      totalTasks: instance.totalTasks,
      completedTasks: instance.completedTasks,
      progress: instance.progress,
      status: instance.status,
      startedAt: instance.startedAt ? formatDateTime(instance.startedAt) : undefined,
      completedAt: instance.completedAt ? formatDateTime(instance.completedAt) : undefined,
      dueDate: instance.dueDate ? formatDate(instance.dueDate) : undefined,
      stages,
      notes: instance.notes || undefined,
    };

    const { key, url } = await generateAndUploadPDF(
      'workflow',
      id,
      <WorkflowPDF data={pdfData} />
    );

    return NextResponse.json({
      success: true,
      data: {
        pdfKey: key,
        pdfUrl: url,
      },
    });
  } catch (error) {
    console.error('生成PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '生成PDF失败' },
      { status: 500 }
    );
  }
}

// GET - 获取 PDF 下载链接
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 由于工作流会更新，建议每次都重新生成
    return NextResponse.json({
      success: false,
      error: '请使用POST方法生成PDF',
      hint: '工作流状态会变化，建议每次都重新生成',
    });
  } catch (error) {
    console.error('获取PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '获取PDF失败' },
      { status: 500 }
    );
  }
}

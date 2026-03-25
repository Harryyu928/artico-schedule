/**
 * 批量创建工作流实例 API
 * POST /api/workflows/instances/batch-create
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowDefinitions, 
  workflowStageDefinitions,
  workflowTaskTemplates,
  workflowInstances, 
  workflowTaskInstances,
  students,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createWorkflowInstance } from '@/lib/workflow-service';

interface BatchCreateRequest {
  definitionId: string;
  entityIds: string[];
  entityType: 'student' | 'application';
  createdBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchCreateRequest = await request.json();
    const { definitionId, entityIds, entityType, createdBy } = body;

    if (!definitionId || !entityIds || entityIds.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 限制批量创建数量
    if (entityIds.length > 20) {
      return NextResponse.json(
        { error: '单次最多创建20个工作流实例' },
        { status: 400 }
      );
    }

    // 检查工作流定义是否存在
    const definition = await db.query.workflowDefinitions.findFirst({
      where: eq(workflowDefinitions.id, definitionId),
    });

    if (!definition) {
      return NextResponse.json(
        { error: '工作流定义不存在' },
        { status: 404 }
      );
    }

    // 验证实体是否存在
    const results: {
      entityId: string;
      success: boolean;
      instanceId?: string;
      error?: string;
    }[] = [];

    for (const entityId of entityIds) {
      try {
        // 检查是否已存在实例
        const existingInstance = await db.query.workflowInstances.findFirst({
          where: and(
            eq(workflowInstances.workflowId, definitionId),
            eq(workflowInstances.entityId, entityId),
            eq(workflowInstances.status, 'in_progress')
          ),
        });

        if (existingInstance) {
          results.push({
            entityId,
            success: false,
            error: '该实体已存在活动的工作流实例',
          });
          continue;
        }

        // 创建工作流实例
        const instance = await createWorkflowInstance({
          workflowType: definition.type,
          entityType,
          entityId,
          entityName: entityId, // 可以根据实际情况获取名称
        });

        results.push({
          entityId,
          success: true,
          instanceId: instance.id,
        });
      } catch (error) {
        results.push({
          entityId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        total: entityIds.length,
        created: successCount,
        failed: failCount,
        results,
      },
    });
  } catch (error) {
    console.error('批量创建工作流实例失败:', error);
    return NextResponse.json(
      { 
        error: '批量创建失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

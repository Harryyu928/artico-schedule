/**
 * 飞书多维表格连接测试 API
 * GET /api/feishu/test - 测试飞书连接
 * GET /api/feishu/tables - 获取表格列表
 * GET /api/feishu/fields - 获取指定表格字段
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBitableService } from '@/lib/feishu-bitable-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'test';

  const service = getBitableService();

  // 检查配置
  if (!service.isConfigured) {
    return NextResponse.json({
      success: false,
      error: '飞书配置不完整',
      required: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'FEISHU_APP_TOKEN'],
      provided: {
        appId: !!process.env.FEISHU_APP_ID,
        appSecret: !!process.env.FEISHU_APP_SECRET,
        appToken: !!process.env.FEISHU_APP_TOKEN,
      },
    }, { status: 400 });
  }

  try {
    switch (action) {
      case 'test': {
        const result = await service.testConnection();
        return NextResponse.json({
          success: result.success,
          message: result.message,
          tables: result.tables,
          config: {
            appToken: service.appToken,
            tableIds: service.tableIds,
          },
        });
      }

      case 'tables': {
        const result = await service.testConnection();
        return NextResponse.json(result);
      }

      case 'fields': {
        const tableId = searchParams.get('tableId');
        if (!tableId) {
          return NextResponse.json({
            success: false,
            error: '请提供 tableId 参数',
          }, { status: 400 });
        }

        const fields = await service.getTableFields(tableId);
        return NextResponse.json({
          success: true,
          tableId,
          fields,
          count: fields.length,
        });
      }

      case 'records': {
        const tableId = searchParams.get('tableId');
        if (!tableId) {
          return NextResponse.json({
            success: false,
            error: '请提供 tableId 参数',
          }, { status: 400 });
        }

        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const result = await service.listRecords(tableId, { pageSize });
        
        return NextResponse.json({
          success: true,
          tableId,
          records: result.records,
          hasMore: result.hasMore,
          pageToken: result.pageToken,
          count: result.records.length,
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: `未知操作: ${action}`,
          availableActions: ['test', 'tables', 'fields', 'records'],
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] 飞书测试错误:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

/**
 * 飞书多维表格数据导入 API
 * 
 * POST /api/feishu/import
 * Body: { dryRun?: boolean, limit?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { importDataToFeishu } from '@/lib/feishu-import';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, limit } = body;

    // 检查配置
    if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
      return NextResponse.json({
        success: false,
        error: '飞书配置不完整',
      }, { status: 400 });
    }

    const filePath = process.env.COZE_WORKSPACE_PATH 
      ? `${process.env.COZE_WORKSPACE_PATH}/temp_data.xlsx`
      : '/tmp/artdico_data.xlsx';
    
    console.log(`[Import] 开始导入数据, dryRun=${dryRun}, limit=${limit || '无限制'}`);

    const stats = await importDataToFeishu(filePath, { dryRun, limit });

    return NextResponse.json({
      success: true,
      message: dryRun ? '预演完成' : '导入完成',
      stats,
    });

  } catch (error) {
    console.error('[Import] 导入失败:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '使用 POST 方法执行导入',
    usage: {
      method: 'POST',
      body: {
        dryRun: 'boolean - 是否预演模式（不实际写入）',
        limit: 'number - 限制导入记录数（用于测试）',
      },
    },
    examples: [
      { description: '预演模式', body: { dryRun: true } },
      { description: '测试导入100条', body: { limit: 100 } },
      { description: '完整导入', body: {} },
    ],
  });
}

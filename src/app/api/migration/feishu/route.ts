/**
 * 数据迁移 API
 * 
 * POST /api/migration/feishu - 执行飞书数据迁移
 * GET /api/migration/feishu - 获取迁移状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { feishuDataMigrationService } from '@/lib/migration/feishu-data-migration';

// 迁移状态存储（简单实现，生产环境应使用数据库）
let migrationStatus: {
  isRunning: boolean;
  lastRun: Date | null;
  stats: unknown | null;
} = {
  isRunning: false,
  lastRun: null,
  stats: null,
};

/**
 * GET - 获取迁移状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: migrationStatus,
  });
}

/**
 * POST - 执行数据迁移
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否正在运行
    if (migrationStatus.isRunning) {
      return NextResponse.json(
        { success: false, error: '迁移任务正在运行中，请稍后再试' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { dryRun = false, filePath = '/tmp/feishu_data.xlsx' } = body;

    // 更新状态
    migrationStatus.isRunning = true;

    console.log(`[Migration API] 开始迁移, dryRun=${dryRun}, filePath=${filePath}`);

    // 执行迁移
    const stats = await feishuDataMigrationService.migrateFromExcel(filePath, {
      dryRun,
      batchSize: 100,
    });

    // 更新状态
    migrationStatus.isRunning = false;
    migrationStatus.lastRun = new Date();
    migrationStatus.stats = stats;

    return NextResponse.json({
      success: true,
      message: dryRun ? '迁移预演完成' : '迁移完成',
      data: stats,
    });
  } catch (error) {
    migrationStatus.isRunning = false;
    console.error('[Migration API] 迁移失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '迁移失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 飞书同步任务
 * 
 * 功能：
 * 1. 定时从飞书拉取最新数据
 * 2. 提供手动同步接口
 * 3. 记录同步状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllFromFeishu, syncTeachersFromFeishu, syncStudentsFromFeishu, syncClassRecordsFromFeishu } from '@/lib/feishu-sync-service';

// 同步状态存储（内存缓存，生产环境应使用Redis）
let syncStatus = {
  lastSyncTime: null as Date | null,
  isSyncing: false,
  lastResult: null as any,
  nextSyncTime: null as Date | null,
};

// 同步间隔（毫秒）
const SYNC_INTERVAL = 60 * 60 * 1000; // 1小时

/**
 * POST /api/feishu/sync
 * 
 * 执行同步操作
 * - type: 'all' | 'teachers' | 'students' | 'classRecords'
 * - force: 是否强制同步（忽略同步中状态）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || 'all';
    const force = body.force || false;

    // 检查是否正在同步
    if (syncStatus.isSyncing && !force) {
      return NextResponse.json({
        success: false,
        message: '同步进行中，请稍后再试',
        status: syncStatus,
      }, { status: 429 });
    }

    syncStatus.isSyncing = true;
    console.log(`[Sync] 开始同步，类型: ${type}`);

    let result;
    const startTime = Date.now();

    switch (type) {
      case 'teachers':
        result = { teachers: await syncTeachersFromFeishu() };
        break;
      case 'students':
        result = { students: await syncStudentsFromFeishu() };
        break;
      case 'classRecords':
        result = { classRecords: await syncClassRecordsFromFeishu() };
        break;
      case 'all':
      default:
        result = await syncAllFromFeishu();
        break;
    }

    const duration = Date.now() - startTime;

    // 更新状态
    syncStatus.lastSyncTime = new Date();
    syncStatus.isSyncing = false;
    syncStatus.lastResult = {
      ...result,
      duration,
    };
    syncStatus.nextSyncTime = new Date(Date.now() + SYNC_INTERVAL);

    return NextResponse.json({
      success: true,
      message: '同步完成',
      duration,
      result,
      status: syncStatus,
    });

  } catch (error) {
    syncStatus.isSyncing = false;
    console.error('[Sync] 同步失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '同步失败', 
        message: (error as Error).message,
        status: syncStatus,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feishu/sync
 * 
 * 获取同步状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: {
      ...syncStatus,
      syncInterval: SYNC_INTERVAL,
      syncIntervalMinutes: SYNC_INTERVAL / 60000,
    },
  });
}

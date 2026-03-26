import { NextRequest, NextResponse } from 'next/server';
import { syncAllFromFeishu, syncTeachersFromFeishu, syncStudentsFromFeishu, syncClassRecordsFromFeishu } from '@/lib/feishu-sync-service';

/**
 * POST /api/feishu/sync-to-db
 * 从飞书多维表格同步数据到本地数据库
 * 
 * Body:
 * - type: 'all' | 'teachers' | 'students' | 'classRecords' (默认 'all')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || 'all';

    console.log(`[API] 开始同步，类型: ${type}`);

    let result;
    
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

    return NextResponse.json({
      success: true,
      message: '同步完成',
      result,
    });
  } catch (error) {
    console.error('[API] 同步失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '同步失败', 
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feishu/sync-to-db
 * 获取同步状态（简化版，直接执行同步）
 */
export async function GET() {
  return NextResponse.json({
    message: '使用 POST 方法执行同步',
    usage: {
      method: 'POST',
      body: {
        type: 'all | teachers | students | classRecords',
      },
    },
  });
}

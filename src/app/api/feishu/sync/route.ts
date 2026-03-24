/**
 * 飞书数据同步 API
 * 
 * POST /api/feishu/sync
 * 同步数据到飞书多维表格
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeishuEnabled, feishuBitableService } from '@/lib/feishu';

/**
 * POST /api/feishu/sync
 * 同步数据到飞书
 */
export async function POST(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.json({ 
      success: false, 
      error: '飞书集成未启用' 
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { type } = body as { type: 'students' | 'teachers' | 'all' };

    let success = 0;
    let failed = 0;

    if (type === 'students') {
      const result = await feishuBitableService.syncAllStudents();
      success = result.success;
      failed = result.failed;
    } else if (type === 'teachers') {
      const result = await feishuBitableService.syncAllTeachers();
      success = result.success;
      failed = result.failed;
    } else if (type === 'all') {
      const studentResult = await feishuBitableService.syncAllStudents();
      const teacherResult = await feishuBitableService.syncAllTeachers();
      success = studentResult.success + teacherResult.success;
      failed = studentResult.failed + teacherResult.failed;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: '未知的同步类型' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synced: success,
      failed,
    });
  } catch (error) {
    console.error('[Feishu] 同步失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

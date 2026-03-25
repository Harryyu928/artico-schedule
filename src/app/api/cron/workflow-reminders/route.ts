/**
 * 工作流提醒定时任务 API
 * 定期检查任务到期/超时并发送提醒
 * 建议配置: 每小时执行一次
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendDueReminders } from '@/lib/workflow-notifications';

// 验证Cron密钥
function validateCronKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronKey = process.env.CRON_SECRET_KEY;
  
  if (!cronKey) {
    console.warn('[Cron] CRON_SECRET_KEY not configured');
    return true; // 开发环境允许
  }
  
  return authHeader === `Bearer ${cronKey}`;
}

export async function GET(request: NextRequest) {
  try {
    // 验证权限
    if (!validateCronKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting workflow reminder check...');
    
    // 执行提醒检查
    const result = await checkAndSendDueReminders();
    
    console.log(`[Cron] Reminder check completed: ${result.dueSoonSent} due soon, ${result.overdueSent} overdue`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        dueSoonSent: result.dueSoonSent,
        overdueSent: result.overdueSent,
        errors: result.errors.length,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[Cron] Workflow reminder check failed:', error);
    return NextResponse.json(
      { 
        error: 'Reminder check failed',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// 也支持POST请求
export async function POST(request: NextRequest) {
  return GET(request);
}

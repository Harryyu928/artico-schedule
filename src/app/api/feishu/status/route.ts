/**
 * 飞书集成状态 API
 * 
 * GET /api/feishu/status
 * 获取飞书集成配置状态
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    enabled: process.env.FEISHU_ENABLED === 'true',
    appId: process.env.FEISHU_APP_ID || '',
    hasAppSecret: !!process.env.FEISHU_APP_SECRET,
    hasAppToken: !!process.env.FEISHU_APP_TOKEN,
    calendarId: process.env.FEISHU_CALENDAR_ID || '',
    config: {
      appId: process.env.FEISHU_APP_ID || '',
      calendarId: process.env.FEISHU_CALENDAR_ID || '',
    },
  };

  return NextResponse.json(status);
}

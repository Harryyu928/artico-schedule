/**
 * 飞书配置 API
 * 
 * POST /api/feishu/config
 * 保存飞书配置（仅演示，实际配置需要修改环境变量）
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/feishu/config
 * 保存飞书配置
 * 
 * 注意：此API仅用于演示，实际生产环境需要：
 * 1. 通过环境变量配置（推荐）
 * 2. 保存到数据库配置表
 * 3. 使用加密存储敏感信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, appSecret, appToken, calendarId } = body;

    // 验证必填字段
    if (!appId) {
      return NextResponse.json({ 
        success: false, 
        error: 'App ID 是必填项' 
      }, { status: 400 });
    }

    // 在实际生产环境中，这里应该：
    // 1. 验证用户权限（只有管理员可以修改配置）
    // 2. 加密存储敏感信息
    // 3. 保存到数据库或更新环境变量

    // 演示：返回成功，但提示需要配置环境变量
    console.log('[Feishu] 配置更新请求:', {
      appId,
      appSecret: appSecret ? '******' : undefined,
      appToken: appToken ? '******' : undefined,
      calendarId,
    });

    // 生成需要配置的环境变量
    const envConfig: string[] = [];
    envConfig.push(`FEISHU_ENABLED=true`);
    envConfig.push(`FEISHU_APP_ID=${appId}`);
    if (appSecret) {
      envConfig.push(`FEISHU_APP_SECRET=${appSecret}`);
    }
    if (appToken) {
      envConfig.push(`FEISHU_APP_TOKEN=${appToken}`);
    }
    if (calendarId) {
      envConfig.push(`FEISHU_CALENDAR_ID=${calendarId}`);
    }

    return NextResponse.json({
      success: true,
      message: '配置已记录，请将以下环境变量配置到系统中',
      envConfig: envConfig.join('\n'),
      note: '实际生产环境需要通过环境变量或数据库存储配置',
    });
  } catch (error) {
    console.error('[Feishu] 保存配置失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * GET /api/feishu/config
 * 获取飞书配置说明
 */
export async function GET() {
  return NextResponse.json({
    envVariables: [
      { name: 'FEISHU_ENABLED', description: '是否启用飞书集成', example: 'true' },
      { name: 'FEISHU_APP_ID', description: '飞书应用ID', example: 'cli_xxxxxxxxxxxx' },
      { name: 'FEISHU_APP_SECRET', description: '飞书应用密钥', example: 'xxxxxxxxxxxxxxxx' },
      { name: 'FEISHU_APP_TOKEN', description: '多维表格Token', example: 'bascnxxxxxxxxxx' },
      { name: 'FEISHU_CALENDAR_ID', description: '日历ID', example: 'ou_xxxxxxxxxxxx' },
      { name: 'FEISHU_ENCRYPT_KEY', description: '事件加密密钥（可选）', example: 'xxxxxxxxxxxxxxxx' },
      { name: 'FEISHU_VERIFICATION_TOKEN', description: '事件验证令牌（可选）', example: 'xxxxxxxxxxxxxxxx' },
      { name: 'FEISHU_TABLE_STUDENTS', description: '学生表ID', example: 'tbl_students' },
      { name: 'FEISHU_TABLE_TEACHERS', description: '导师表ID', example: 'tbl_teachers' },
      { name: 'FEISHU_TABLE_COURSES', description: '课程表ID', example: 'tbl_courses' },
      { name: 'FEISHU_TABLE_SCHEDULES', description: '排课表ID', example: 'tbl_schedules' },
      { name: 'FEISHU_TABLE_CLASS_RECORDS', description: '上课记录表ID', example: 'tbl_class_records' },
    ],
  });
}

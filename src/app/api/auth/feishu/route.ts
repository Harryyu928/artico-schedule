/**
 * 飞书登录认证 API
 * 
 * GET /api/auth/feishu - 获取飞书登录URL
 * POST /api/auth/feishu - 处理飞书登录回调
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, teachers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getFeishuClient, isFeishuEnabled } from '@/lib/feishu';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

// 飞书登录重定向URI（需要在飞书开放平台配置）
const FEISHU_REDIRECT_URI = `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/auth/feishu/callback`;

/**
 * GET /api/auth/feishu
 * 获取飞书登录URL，跳转到飞书授权页面
 */
export async function GET(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.json(
      { error: '飞书登录未启用' },
      { status: 400 }
    );
  }

  const appId = process.env.FEISHU_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: '飞书应用配置不完整' },
      { status: 500 }
    );
  }

  // 生成state参数用于防CSRF攻击
  const state = randomUUID();
  
  // 将state存入cookie用于验证
  const cookieStore = await cookies();
  cookieStore.set('feishu_auth_state', state, {
    httpOnly: true,
    secure: true,
    maxAge: 300, // 5分钟有效期
    path: '/',
  });

  // 构建飞书授权URL
  const authUrl = new URL('https://open.feishu.cn/open-apis/authen/v1/authorize');
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('redirect_uri', FEISHU_REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  // 重定向到飞书授权页面
  return NextResponse.redirect(authUrl.toString());
}

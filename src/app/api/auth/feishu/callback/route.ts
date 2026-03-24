/**
 * 飞书登录回调 API
 * 
 * GET /api/auth/feishu/callback
 * 处理飞书授权回调，获取用户信息并完成登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, teachers } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { getFeishuClient, isFeishuEnabled } from '@/lib/feishu';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/feishu/callback
 * 处理飞书授权回调
 */
export async function GET(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.redirect(
      new URL('/login?error=feishu_disabled', request.url)
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 验证state防止CSRF攻击
  const cookieStore = await cookies();
  const savedState = cookieStore.get('feishu_auth_state')?.value;

  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_state', request.url)
    );
  }

  // 清除state cookie
  cookieStore.delete('feishu_auth_state');

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', request.url)
    );
  }

  const client = getFeishuClient();
  if (!client) {
    return NextResponse.redirect(
      new URL('/login?error=feishu_client_error', request.url)
    );
  }

  try {
    // 通过授权码获取用户信息
    const userInfo = await client.getUserInfoByCode(code);
    const { open_id, union_id, name, email, mobile, avatar_url } = userInfo;

    // 查找是否已存在绑定该飞书账号的用户
    let user = await db.query.users.findFirst({
      where: or(
        eq(users.feishuOpenId, open_id),
        email ? eq(users.email, email) : undefined
      ),
    });

    if (user) {
      // 用户已存在，更新飞书信息
      await db.update(users)
        .set({
          feishuOpenId: open_id,
          feishuUnionId: union_id,
          lastLoginAt: new Date(),
          lastLoginMethod: 'feishu',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    } else {
      // 用户不存在，创建新用户
      const userId = randomUUID();
      
      // 检查是否在导师表中
      const teacher = email ? await db.query.teachers.findFirst({
        where: eq(teachers.email, email),
      }) : null;

      // 检查是否在学生表中
      const student = email ? await db.query.students.findFirst({
        where: eq(students.email, email),
      }) : null;

      if (teacher) {
        // 创建导师用户
        const role = teacher.teacherType === '全职' ? '全职导师' : '兼职导师';
        user = await db.insert(users).values({
          id: userId,
          username: `feishu_${open_id.slice(0, 10)}`,
          name: name || teacher.name,
          email: email || teacher.email,
          phone: mobile || teacher.phone,
          avatar: avatar_url,
          role,
          teacherId: teacher.id,
          feishuOpenId: open_id,
          feishuUnionId: union_id,
          lastLoginAt: new Date(),
          lastLoginMethod: 'feishu',
          isActive: true,
        }).returning().then(rows => rows[0]);

        // 更新导师表的飞书信息
        await db.update(teachers)
          .set({ feishuUserId: open_id })
          .where(eq(teachers.id, teacher.id));
      } else if (student) {
        // 创建学生用户
        user = await db.insert(users).values({
          id: userId,
          username: `feishu_${open_id.slice(0, 10)}`,
          name: name || student.name,
          email: email || student.email,
          phone: mobile || student.phone,
          avatar: avatar_url,
          role: '学生',
          studentId: student.id,
          feishuOpenId: open_id,
          feishuUnionId: union_id,
          lastLoginAt: new Date(),
          lastLoginMethod: 'feishu',
          isActive: true,
        }).returning().then(rows => rows[0]);
      } else {
        // 新用户，创建默认学生角色
        user = await db.insert(users).values({
          id: userId,
          username: `feishu_${open_id.slice(0, 10)}`,
          name: name || '新用户',
          email: email || null,
          phone: mobile || null,
          avatar: avatar_url,
          role: '学生',
          feishuOpenId: open_id,
          feishuUnionId: union_id,
          lastLoginAt: new Date(),
          lastLoginMethod: 'feishu',
          isActive: true,
        }).returning().then(rows => rows[0]);
      }
    }

    if (!user) {
      throw new Error('创建用户失败');
    }

    // 创建会话（设置cookie）
    const sessionId = randomUUID();
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      sessionId,
      role: user.role,
      name: user.name,
    })).toString('base64');

    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    // 登录成功，重定向到首页
    return NextResponse.redirect(
      new URL('/?login=success', request.url)
    );
  } catch (error) {
    console.error('[Feishu] 登录失败:', error);
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url)
    );
  }
}

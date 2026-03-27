/**
 * 权限管理 API
 * 
 * GET  /api/auth/check - 检查当前用户权限
 * GET  /api/auth/user - 获取当前用户信息
 * POST /api/auth/login - 模拟登录（开发环境）
 * POST /api/auth/logout - 登出
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, teachers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_HIERARCHY,
  hasPermission,
  type UserRole,
  type Permission,
} from '@/types/permissions';

// GET - 获取当前用户信息或检查权限
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'user';
  
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    // 查询用户
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    const userRole = user.role as UserRole;
    
    if (action === 'check') {
      // 检查权限
      const permission = searchParams.get('permission') as Permission;
      
      if (!permission) {
        return NextResponse.json(
          { success: false, error: '缺少权限参数' },
          { status: 400 }
        );
      }
      
      const hasAccess = hasPermission(userRole, permission);
      
      return NextResponse.json({
        success: true,
        data: {
          hasPermission: hasAccess,
          role: userRole,
          permission,
        },
      });
    }
    
    if (action === 'permissions') {
      // 获取用户所有权限
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            role: userRole,
            roleName: ROLE_DISPLAY_NAMES[userRole],
            roleLevel: ROLE_HIERARCHY[userRole],
          },
          permissions: ROLE_PERMISSIONS[userRole],
        },
      });
    }
    
    // 返回用户信息
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        roleName: ROLE_DISPLAY_NAMES[userRole],
        roleLevel: ROLE_HIERARCHY[userRole],
      },
    });
  } catch (error) {
    console.error('权限检查失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST - 登录/登出
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    // 判断是否需要 secure cookie
    // 如果是 HTTPS 或者配置了生产域名，则需要 secure
    const isSecure = process.env.NODE_ENV === 'production' || 
                     !!process.env.COZE_PROJECT_DOMAIN_DEFAULT?.startsWith('https');
    
    if (action === 'logout') {
      // 登出
      const cookieStore = await cookies();
      cookieStore.delete('user_id');
      
      return NextResponse.json({
        success: true,
        message: '已登出',
      });
    }
    
    if (action === 'login') {
      // 开发环境模拟登录
      const { userId, role } = body;
      
      // 如果指定了用户ID，使用该用户
      if (userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        
        if (user) {
          const cookieStore = await cookies();
          cookieStore.set('user_id', user.id, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7天
            path: '/',
          });
          
          return NextResponse.json({
            success: true,
            data: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
          });
        }
      }
      
      // 如果指定了角色，创建或查找该角色的用户
      if (role) {
        // 查找该角色的第一个用户
        const user = await db.query.users.findFirst({
          where: eq(users.role, role),
        });
        
        if (user) {
          // 如果是导师角色但没有关联 teacherId，创建 teacher 记录
          if ((user.role === '全职导师' || user.role === '兼职导师') && !user.teacherId) {
            const teacherRecordId = uuidv4();
            const teacherType = user.role === '全职导师' ? '全职' : '兼职';
            
            await db.insert(teachers).values({
              id: teacherRecordId,
              teacherId: `T${Date.now()}`,
              name: user.name || `测试${user.role}`,
              teachableCourses: ['F-GD', 'F-TA'],
              teacherType: teacherType,
              maxWeeklyHours: user.role === '全职导师' ? 20 : 10,
              currentHours: 0,
              email: user.email,
            });
            
            // 更新用户的 teacherId
            await db.update(users)
              .set({ teacherId: teacherRecordId })
              .where(eq(users.id, user.id));
          }
          
          const cookieStore = await cookies();
          cookieStore.set('user_id', user.id, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          });
          
          return NextResponse.json({
            success: true,
            data: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
          });
        }
        
        // 创建新用户
        const newUserId = uuidv4();
        const roleDisplayName = ROLE_DISPLAY_NAMES[role as UserRole] || role;
        
        // 如果是导师角色，先创建 teacher 记录
        let teacherRecordId: string | undefined;
        if (role === '全职导师' || role === '兼职导师') {
          teacherRecordId = uuidv4();
          const teacherType = role === '全职导师' ? '全职' : '兼职';
          
          await db.insert(teachers).values({
            id: teacherRecordId,
            teacherId: `T${Date.now()}`,
            name: `测试${roleDisplayName}`,
            teachableCourses: ['F-GD', 'F-TA'],
            teacherType: teacherType,
            maxWeeklyHours: role === '全职导师' ? 20 : 10,
            currentHours: 0,
            email: `test_${role}@example.com`,
          });
        }
        
        await db.insert(users).values({
          id: newUserId,
          name: `测试${roleDisplayName}`,
          username: `test_${role}_${Date.now()}`,
          email: `test_${role}@example.com`,
          role: role as UserRole,
          teacherId: teacherRecordId,
        });
        
        const cookieStore = await cookies();
        cookieStore.set('user_id', newUserId, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        
        return NextResponse.json({
          success: true,
          data: {
            id: newUserId,
            name: `测试${roleDisplayName}`,
            role: role,
          },
        });
      }
      
      return NextResponse.json(
        { success: false, error: '请提供用户ID或角色' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

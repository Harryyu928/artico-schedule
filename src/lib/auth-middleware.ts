/**
 * 权限中间件
 * 用于验证用户权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hasPermission, type Permission, type UserRole } from '@/types/permissions';

// 权限检查结果
export interface PermissionCheckResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
}

// 从请求中获取当前用户
export async function getCurrentUser(request: NextRequest): Promise<PermissionCheckResult['user'] | null> {
  try {
    // 从 cookie 获取用户 ID
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return null;
    }
    
    // 查询用户
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      name: user.name,
      role: user.role as UserRole,
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

// 检查权限
export async function checkPermission(
  request: NextRequest,
  permission: Permission
): Promise<PermissionCheckResult> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return {
      success: false,
      error: '未登录',
    };
  }
  
  if (!hasPermission(user.role, permission)) {
    return {
      success: false,
      error: '权限不足',
    };
  }
  
  return {
    success: true,
    user,
  };
}

// 检查多个权限（满足任一即可）
export async function checkAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<PermissionCheckResult> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return {
      success: false,
      error: '未登录',
    };
  }
  
  const hasAny = permissions.some(p => hasPermission(user.role, p));
  
  if (!hasAny) {
    return {
      success: false,
      error: '权限不足',
    };
  }
  
  return {
    success: true,
    user,
  };
}

// 检查多个权限（需全部满足）
export async function checkAllPermissions(
  request: NextRequest,
  permissions: Permission[]
): Promise<PermissionCheckResult> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return {
      success: false,
      error: '未登录',
    };
  }
  
  const hasAll = permissions.every(p => hasPermission(user.role, p));
  
  if (!hasAll) {
    return {
      success: false,
      error: '权限不足',
    };
  }
  
  return {
    success: true,
    user,
  };
}

// 创建权限拒绝响应
export function createPermissionDeniedResponse(message: string = '权限不足'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

// 创建未登录响应
export function createUnauthorizedResponse(message: string = '未登录'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

// 装饰器：为 API 路由添加权限检查
export function withPermission(
  permission: Permission,
  handler: (request: NextRequest, user: NonNullable<PermissionCheckResult['user']>) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await checkPermission(request, permission);
    
    if (!result.success || !result.user) {
      return createPermissionDeniedResponse(result.error);
    }
    
    return handler(request, result.user);
  };
}

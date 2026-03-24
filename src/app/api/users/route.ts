/**
 * 用户管理 API
 * 
 * GET    /api/users - 获取用户列表（支持按角色筛选）
 * POST   /api/users - 创建用户
 * GET    /api/users/[id] - 获取用户详情
 * PUT    /api/users/[id] - 更新用户信息
 * DELETE /api/users/[id] - 删除用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray, or, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  ROLE_DISPLAY_NAMES,
  ROLE_HIERARCHY,
  getManageableRoles,
  type UserRole,
} from '@/types/permissions';

// GET - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null;
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    
    // 构建查询条件
    const conditions = [];
    
    if (role) {
      conditions.push(eq(users.role, role));
    }
    
    if (isActive !== null) {
      conditions.push(eq(users.isActive, isActive === 'true'));
    }
    
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }
    
    // 查询用户列表
    const userList = await db.query.users.findMany({
      where: conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    
    return NextResponse.json({
      success: true,
      data: userList.map(user => ({
        ...user,
        roleName: ROLE_DISPLAY_NAMES[user.role as UserRole] || user.role,
        roleLevel: ROLE_HIERARCHY[user.role as UserRole] || 0,
      })),
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 导入 and 函数
import { and } from 'drizzle-orm';

// POST - 创建用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, role, isActive } = body;
    
    // 验证必填字段
    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: '姓名和角色为必填项' },
        { status: 400 }
      );
    }
    
    // 验证角色是否有效
    if (!ROLE_DISPLAY_NAMES[role as UserRole]) {
      return NextResponse.json(
        { success: false, error: '无效的角色' },
        { status: 400 }
      );
    }
    
    // 创建用户
    const userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      name,
      username: `user_${Date.now()}`,
      email: email || null,
      phone: phone || null,
      role: role as UserRole,
      isActive: isActive ?? true,
    });
    
    // 查询创建的用户
    const newUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...newUser,
        roleName: ROLE_DISPLAY_NAMES[newUser!.role as UserRole],
      },
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { success: false, error: '创建用户失败' },
      { status: 500 }
    );
  }
}

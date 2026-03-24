/**
 * 用户详情 API
 * 
 * GET    /api/users/[id] - 获取用户详情
 * PUT    /api/users/[id] - 更新用户信息
 * DELETE /api/users/[id] - 删除用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  ROLE_DISPLAY_NAMES,
  ROLE_HIERARCHY,
  type UserRole,
} from '@/types/permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 获取用户详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...user,
        roleName: ROLE_DISPLAY_NAMES[user.role as UserRole] || user.role,
        roleLevel: ROLE_HIERARCHY[user.role as UserRole] || 0,
      },
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新用户信息
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 检查用户是否存在
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role !== undefined) {
      // 验证角色是否有效
      if (!ROLE_DISPLAY_NAMES[body.role as UserRole]) {
        return NextResponse.json(
          { success: false, error: '无效的角色' },
          { status: 400 }
        );
      }
      updateData.role = body.role;
    }
    if (body.status !== undefined) updateData.isActive = body.status === 'active';
    if (body.notificationChannels !== undefined) {
      updateData.notificationChannels = body.notificationChannels;
    }
    if (body.feishuOpenId !== undefined) updateData.feishuOpenId = body.feishuOpenId;
    if (body.feishuUserId !== undefined) updateData.feishuUserId = body.feishuUserId;
    
    // 更新用户
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, id));
    
    // 查询更新后的用户
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        roleName: ROLE_DISPLAY_NAMES[updatedUser!.role as UserRole],
      },
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // 检查用户是否存在
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 删除用户
    await db.delete(users).where(eq(users.id, id));
    
    return NextResponse.json({
      success: true,
      message: '用户已删除',
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}

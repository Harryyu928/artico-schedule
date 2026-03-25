import { NextRequest, NextResponse } from 'next/server';
import {
  setTimeAvailability,
  batchSetTimeAvailability,
  getTimeAvailabilities,
  deleteUserTimeAvailabilities,
} from '@/lib/db-service';
import type { SetTimeAvailabilityRequest, BatchSetTimeAvailabilityRequest } from '@/types';

/**
 * GET /api/availability
 * 获取时间可用性列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const userRole = searchParams.get('userRole') || undefined;
    const weekDay = searchParams.get('weekDay') || undefined;

    const availabilities = await getTimeAvailabilities({ userId, userRole, weekDay });
    
    return NextResponse.json(availabilities);
  } catch (error) {
    console.error('获取时间可用性列表失败:', error);
    return NextResponse.json(
      { error: '获取时间可用性列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability
 * 设置单个时间可用性
 */
export async function POST(request: NextRequest) {
  try {
    const body: SetTimeAvailabilityRequest = await request.json();
    
    const availability = await setTimeAvailability(body);
    
    return NextResponse.json(availability);
  } catch (error) {
    console.error('设置时间可用性失败:', error);
    return NextResponse.json(
      { error: '设置时间可用性失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/availability
 * 批量设置时间可用性
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 兼容前端发送的两种格式
    // 格式1: { user_id, user_role, name, availabilities: [...] }
    // 格式2: { userId, userRole, slots: [...] }
    const availabilities = body.availabilities || body.slots || [];
    const userId = body.user_id || body.userId;
    const userRole = body.user_role || body.userRole;
    const name = body.name || '';
    
    // 转换字段名（前端驼峰 -> 后端下划线）
    const normalizedAvailabilities = availabilities.map((a: any) => ({
      week_day: a.week_day || a.weekDay,
      time_slot: a.time_slot || a.timeSlot,
      is_available: a.is_available ?? a.isAvailable ?? true,
    }));
    
    const results = await batchSetTimeAvailability({
      user_id: userId,
      user_role: userRole,
      name,
      availabilities: normalizedAvailabilities,
    });
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('批量设置时间可用性失败:', error);
    return NextResponse.json(
      { error: '批量设置时间可用性失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/availability
 * 删除用户所有时间可用性
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少userId参数' },
        { status: 400 }
      );
    }
    
    await deleteUserTimeAvailabilities(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除时间可用性失败:', error);
    return NextResponse.json(
      { error: '删除时间可用性失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

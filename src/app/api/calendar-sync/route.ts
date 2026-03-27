/**
 * 导师日历同步 API
 * 
 * POST /api/calendar-sync - 同步导师日历
 * GET /api/calendar-sync/status - 获取同步状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, teachers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { teacherCalendarSyncService } from '@/lib/teacher-calendar-sync';

/**
 * POST - 同步导师日历
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取 teacherId（优先从用户关联获取，否则尝试从教师表查找）
    let teacherId = user.teacherId;
    
    if (!teacherId && (user.role === '全职导师' || user.role === '兼职导师')) {
      // 尝试通过用户名匹配导师
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.name, user.name),
      });
      if (teacher) {
        teacherId = teacher.id;
        // 更新用户的 teacherId 关联
        await db.update(users)
          .set({ teacherId: teacher.id })
          .where(eq(users.id, userId));
      }
    }
    
    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: '当前用户未关联导师信息', message: '请先在导师管理中关联用户' },
        { status: 403 }
      );
    }
    
    // 解析请求参数
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;
    
    // 执行同步
    const result = await teacherCalendarSyncService.syncTeacherCalendar(
      teacherId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CalendarSync API] 同步失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '日历同步失败',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取同步状态
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取 teacherId
    let teacherId = user.teacherId;
    
    if (!teacherId && (user.role === '全职导师' || user.role === '兼职导师')) {
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.name, user.name),
      });
      if (teacher) {
        teacherId = teacher.id;
      }
    }
    
    if (!teacherId) {
      return NextResponse.json({
        success: true,
        data: {
          lastSyncedAt: null,
          totalCourses: 0,
          syncedCourses: 0,
          message: '未关联导师信息',
        },
      });
    }
    
    // 获取同步状态
    const status = await teacherCalendarSyncService.getSyncStatus(teacherId);
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[CalendarSync API] 获取状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}

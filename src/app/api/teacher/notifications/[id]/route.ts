import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * PATCH /api/teacher/notifications/[id]
 * 标记单条通知为已读
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [notification] = await db
      .update(notifications)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    if (!notification) {
      return NextResponse.json(
        { success: false, error: '通知不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
      message: '已标记为已读',
    });
  } catch (error) {
    console.error('标记通知失败:', error);
    return NextResponse.json(
      { success: false, error: '标记通知失败' },
      { status: 500 }
    );
  }
}

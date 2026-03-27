import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courseSelectionItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PUT /api/selection-forms/[id]/items/[itemId]
 * 更新选课单明细状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    
    if (body.status) {
      updateData.status = body.status;
    }
    if (body.plannedHours !== undefined) {
      updateData.plannedHours = body.plannedHours;
    }
    if (body.scheduledHours !== undefined) {
      updateData.scheduledHours = body.scheduledHours;
    }
    if (body.completedHours !== undefined) {
      updateData.completedHours = body.completedHours;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.currentPhase !== undefined) {
      updateData.currentPhase = body.currentPhase;
    }
    
    await db.update(courseSelectionItems)
      .set(updateData)
      .where(eq(courseSelectionItems.id, itemId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新选课单明细失败:', error);
    return NextResponse.json(
      { error: '更新选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/selection-forms/[id]/items/[itemId]
 * 删除选课单明细
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    
    await db.delete(courseSelectionItems)
      .where(eq(courseSelectionItems.id, itemId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除选课单明细失败:', error);
    return NextResponse.json(
      { error: '删除选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

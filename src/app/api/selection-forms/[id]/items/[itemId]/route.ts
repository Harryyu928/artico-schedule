import { NextRequest, NextResponse } from 'next/server';
import { deleteSelectionItem } from '@/lib/course-selection-service';

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
    
    await deleteSelectionItem(itemId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除选课单明细失败:', error);
    return NextResponse.json(
      { error: '删除选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

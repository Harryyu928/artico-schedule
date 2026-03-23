import { NextRequest, NextResponse } from 'next/server';
import { getSelectionFormById } from '@/lib/course-selection-service';

/**
 * GET /api/selection-forms/[id]
 * 获取选课单详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const form = await getSelectionFormById(id);
    
    if (!form) {
      return NextResponse.json(
        { error: '选课单不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ form });
  } catch (error) {
    console.error('获取选课单详情失败:', error);
    return NextResponse.json(
      { error: '获取选课单详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

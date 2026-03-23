import { NextRequest, NextResponse } from 'next/server';
import {
  getSelectionItems,
  addSelectionItem,
} from '@/lib/course-selection-service';
import type { AddSelectionItemRequest } from '@/types';

/**
 * GET /api/selection-forms/[id]/items
 * 获取选课单明细列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const items = await getSelectionItems(id);
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('获取选课单明细失败:', error);
    return NextResponse.json(
      { error: '获取选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/selection-forms/[id]/items
 * 添加课程到选课单
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AddSelectionItemRequest = await request.json();
    
    // 确保form_id正确
    body.form_id = id;
    
    const item = await addSelectionItem(body);
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('添加课程失败:', error);
    return NextResponse.json(
      { error: '添加课程失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

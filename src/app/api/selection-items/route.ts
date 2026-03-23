import { NextRequest, NextResponse } from 'next/server';
import {
  addSelectionItem,
  getSelectionItems,
  updateSelectionItem,
  deleteSelectionItem,
  updateSelectionProgress,
} from '@/lib/course-selection-service';
import type { AddSelectionItemRequest, UpdateSelectionProgressRequest } from '@/types';
import type { NewCourseSelectionItem } from '@/db/schema';

/**
 * GET /api/selection-items
 * 获取选课单明细列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: '缺少formId参数' },
        { status: 400 }
      );
    }

    const items = await getSelectionItems(formId);
    
    return NextResponse.json(items);
  } catch (error) {
    console.error('获取选课单明细失败:', error);
    return NextResponse.json(
      { error: '获取选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/selection-items
 * 添加选课单明细
 */
export async function POST(request: NextRequest) {
  try {
    const body: AddSelectionItemRequest = await request.json();
    
    const item = await addSelectionItem(body);
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('添加选课单明细失败:', error);
    return NextResponse.json(
      { error: '添加选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/selection-items
 * 更新选课单明细进度
 */
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateSelectionProgressRequest = await request.json();
    
    const item = await updateSelectionProgress(body);
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('更新选课单明细进度失败:', error);
    return NextResponse.json(
      { error: '更新选课单明细进度失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/selection-items
 * 删除选课单明细
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少id参数' },
        { status: 400 }
      );
    }
    
    await deleteSelectionItem(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除选课单明细失败:', error);
    return NextResponse.json(
      { error: '删除选课单明细失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

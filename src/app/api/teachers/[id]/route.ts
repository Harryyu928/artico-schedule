import { NextRequest, NextResponse } from 'next/server';
import {
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} from '@/lib/db-service';
import type { NewTeacher } from '@/db/schema';

/**
 * GET /api/teachers/[id]
 * 获取导师详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacher = await getTeacherById(id);
    
    if (!teacher) {
      return NextResponse.json(
        { error: '导师不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(teacher);
  } catch (error) {
    console.error('获取导师详情失败:', error);
    return NextResponse.json(
      { error: '获取导师详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/teachers/[id]
 * 更新导师信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<NewTeacher> = await request.json();
    
    const teacher = await updateTeacher(id, body);
    
    return NextResponse.json(teacher);
  } catch (error) {
    console.error('更新导师信息失败:', error);
    return NextResponse.json(
      { error: '更新导师信息失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teachers/[id]
 * 删除导师
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTeacher(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除导师失败:', error);
    return NextResponse.json(
      { error: '删除导师失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

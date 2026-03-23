import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentById,
  updateStudent,
  deleteStudent,
} from '@/lib/db-service';
import type { NewStudent } from '@/db/schema';

/**
 * GET /api/students/[id]
 * 获取学生详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await getStudentById(id);
    
    if (!student) {
      return NextResponse.json(
        { error: '学生不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(student);
  } catch (error) {
    console.error('获取学生详情失败:', error);
    return NextResponse.json(
      { error: '获取学生详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/students/[id]
 * 更新学生信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<NewStudent> = await request.json();
    
    const student = await updateStudent(id, body);
    
    return NextResponse.json(student);
  } catch (error) {
    console.error('更新学生信息失败:', error);
    return NextResponse.json(
      { error: '更新学生信息失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/students/[id]
 * 删除学生
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteStudent(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除学生失败:', error);
    return NextResponse.json(
      { error: '删除学生失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

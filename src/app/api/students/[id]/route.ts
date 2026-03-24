import { NextRequest, NextResponse } from 'next/server';
import { getStudentById } from '@/lib/db-service';

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
    
    return NextResponse.json({ student });
  } catch (error) {
    console.error('获取学生详情失败:', error);
    return NextResponse.json(
      { error: '获取学生详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  createTeacher,
  getTeachers,
} from '@/lib/db-service';
import type { CreateTeacherRequest } from '@/types';

/**
 * GET /api/teachers
 * 获取导师列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const teachers = await getTeachers({ courseId, limit, offset });
    
    return NextResponse.json(teachers);
  } catch (error) {
    console.error('获取导师列表失败:', error);
    return NextResponse.json(
      { error: '获取导师列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teachers
 * 创建导师
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTeacherRequest = await request.json();
    
    const teacher = await createTeacher(body);
    
    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    console.error('创建导师失败:', error);
    return NextResponse.json(
      { error: '创建导师失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

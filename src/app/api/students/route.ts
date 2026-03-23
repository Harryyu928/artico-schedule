import { NextRequest, NextResponse } from 'next/server';
import {
  createStudent,
  getStudents,
} from '@/lib/db-service';
import type { CreateStudentRequest } from '@/types';

/**
 * GET /api/students
 * 获取学生列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const major = searchParams.get('major') || undefined;
    const stage = searchParams.get('stage') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const students = await getStudents({ major, stage, limit, offset });
    
    return NextResponse.json(students);
  } catch (error) {
    console.error('获取学生列表失败:', error);
    return NextResponse.json(
      { error: '获取学生列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students
 * 创建学生
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateStudentRequest = await request.json();
    
    const student = await createStudent(body);
    
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('创建学生失败:', error);
    return NextResponse.json(
      { error: '创建学生失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

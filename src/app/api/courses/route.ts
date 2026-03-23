import { NextRequest, NextResponse } from 'next/server';
import {
  createCourse,
  getCourses,
} from '@/lib/db-service';
import type { CreateCourseRequest } from '@/types';

/**
 * GET /api/courses
 * 获取课程列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const courses = await getCourses({ type, category, limit, offset });
    
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('获取课程列表失败:', error);
    return NextResponse.json(
      { error: '获取课程列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses
 * 创建课程
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCourseRequest = await request.json();
    
    const course = await createCourse(body);
    
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('创建课程失败:', error);
    return NextResponse.json(
      { error: '创建课程失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

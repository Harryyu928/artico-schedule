import { NextRequest, NextResponse } from 'next/server';
import {
  createStudentCourse,
  getStudentCourses,
} from '@/lib/db-service';
import type { StudentSelectCourseRequest } from '@/types';

/**
 * GET /api/student-courses
 * 获取学生选课列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const studentCourses = await getStudentCourses({ studentId, courseId, status, limit, offset });
    
    return NextResponse.json(studentCourses);
  } catch (error) {
    console.error('获取学生选课列表失败:', error);
    return NextResponse.json(
      { error: '获取学生选课列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-courses
 * 学生选课
 */
export async function POST(request: NextRequest) {
  try {
    const body: StudentSelectCourseRequest = await request.json();
    
    const studentCourse = await createStudentCourse(body);
    
    return NextResponse.json(studentCourse, { status: 201 });
  } catch (error) {
    console.error('学生选课失败:', error);
    return NextResponse.json(
      { error: '学生选课失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

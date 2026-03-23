import { NextRequest, NextResponse } from 'next/server';
import {
  createApplicationSchool,
  getApplicationSchools,
  updateApplicationSchool,
  deleteApplicationSchool,
} from '@/lib/course-selection-service';
import type { CreateApplicationSchoolRequest } from '@/types';
import type { NewApplicationSchool } from '@/db/schema';

/**
 * GET /api/application-schools
 * 获取学生申请院校列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: '缺少studentId参数' },
        { status: 400 }
      );
    }

    const schools = await getApplicationSchools(studentId);
    
    return NextResponse.json(schools);
  } catch (error) {
    console.error('获取申请院校列表失败:', error);
    return NextResponse.json(
      { error: '获取申请院校列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/application-schools
 * 添加申请院校
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateApplicationSchoolRequest = await request.json();
    
    const school = await createApplicationSchool(body);
    
    return NextResponse.json(school, { status: 201 });
  } catch (error) {
    console.error('添加申请院校失败:', error);
    return NextResponse.json(
      { error: '添加申请院校失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/application-schools
 * 更新申请院校信息
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少id参数' },
        { status: 400 }
      );
    }

    const school = await updateApplicationSchool(id, data as Partial<NewApplicationSchool>);
    
    return NextResponse.json(school);
  } catch (error) {
    console.error('更新申请院校信息失败:', error);
    return NextResponse.json(
      { error: '更新申请院校信息失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/application-schools
 * 删除申请院校
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
    
    await deleteApplicationSchool(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除申请院校失败:', error);
    return NextResponse.json(
      { error: '删除申请院校失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

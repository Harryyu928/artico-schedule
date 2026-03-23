import { NextRequest, NextResponse } from 'next/server';
import {
  createClassRecord,
  getClassRecords,
  updateClassRecord,
  deleteClassRecord,
} from '@/lib/course-selection-service';
import type { CreateClassRecordRequest } from '@/types';
import type { NewClassRecord } from '@/db/schema';

/**
 * GET /api/class-records
 * 获取上课记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId') || undefined;
    const teacherId = searchParams.get('teacherId') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const selectionItemId = searchParams.get('selectionItemId') || undefined;

    const records = await getClassRecords({
      studentId,
      teacherId,
      courseId,
      selectionItemId,
    });
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('获取上课记录列表失败:', error);
    return NextResponse.json(
      { error: '获取上课记录列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/class-records
 * 创建上课记录
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateClassRecordRequest = await request.json();
    
    const record = await createClassRecord(body);
    
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('创建上课记录失败:', error);
    return NextResponse.json(
      { error: '创建上课记录失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/class-records
 * 更新上课记录
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

    const record = await updateClassRecord(id, data as Partial<NewClassRecord>);
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('更新上课记录失败:', error);
    return NextResponse.json(
      { error: '更新上课记录失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/class-records
 * 删除上课记录
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
    
    await deleteClassRecord(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除上课记录失败:', error);
    return NextResponse.json(
      { error: '删除上课记录失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

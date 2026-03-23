import { NextRequest, NextResponse } from 'next/server';
import {
  createSelectionForm,
  getSelectionForms,
} from '@/lib/course-selection-service';
import type { CreateSelectionFormRequest } from '@/types';

/**
 * GET /api/selection-forms
 * 获取选课单列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id') || undefined;
    const status = searchParams.get('status') || undefined;

    const forms = await getSelectionForms({ studentId, status });
    
    return NextResponse.json({ forms });
  } catch (error) {
    console.error('获取选课单列表失败:', error);
    
    // 返回空数组作为降级方案
    return NextResponse.json({ forms: [] });
  }
}

/**
 * POST /api/selection-forms
 * 创建选课单
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSelectionFormRequest = await request.json();
    
    const form = await createSelectionForm(body);
    
    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    console.error('创建选课单失败:', error);
    return NextResponse.json(
      { error: '创建选课单失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

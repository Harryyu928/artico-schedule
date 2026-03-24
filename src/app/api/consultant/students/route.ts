/**
 * 顾问的签约学生 API
 * 
 * GET /api/consultant/students - 获取顾问签约的学生列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { students, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - 获取顾问签约的学生列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get('consultantId');
    
    if (!consultantId) {
      return NextResponse.json(
        { success: false, error: '顾问ID为必填项' },
        { status: 400 }
      );
    }
    
    // 验证顾问存在
    const consultant = await db.query.users.findFirst({
      where: eq(users.id, consultantId),
    });
    
    if (!consultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }
    
    // 获取该顾问签约的学生
    const studentsList = await db.query.students.findMany({
      where: eq(students.consultantId, consultantId),
    });
    
    return NextResponse.json({
      success: true,
      data: studentsList,
      total: studentsList.length,
    });
  } catch (error) {
    console.error('获取顾问签约学生失败:', error);
    return NextResponse.json(
      { success: false, error: '获取顾问签约学生失败' },
      { status: 500 }
    );
  }
}

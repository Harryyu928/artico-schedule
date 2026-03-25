/**
 * 导师课酬统计 API
 * GET /api/settlements/salary-summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teacherSalarySummary, teachers, courseSettlements } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getTeacherSalarySummary, getTeacherPendingSettlements } from '@/lib/settlement-service';

/**
 * 获取导师课酬统计
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const period = searchParams.get('period');
    const action = searchParams.get('action') || 'summary';

    // 获取待结课列表
    if (action === 'pending' && teacherId) {
      const pendingRecords = await getTeacherPendingSettlements(teacherId);
      
      return NextResponse.json({
        success: true,
        data: {
          pendingRecords,
          total: pendingRecords.length,
        },
      });
    }

    // 获取课酬汇总
    if (teacherId) {
      const summary = await getTeacherSalarySummary(teacherId, period || undefined);
      
      // 获取待结算金额
      const pendingAmount = await db.select({
        total: sql<number>`coalesce(sum(final_amount), 0)`,
      })
        .from(courseSettlements)
        .where(and(
          eq(courseSettlements.teacherId, teacherId),
          eq(courseSettlements.status, 'submitted')
        ));

      return NextResponse.json({
        success: true,
        data: {
          summary,
          pendingAmount: Number(pendingAmount[0]?.total) || 0,
        },
      });
    }

    // 获取所有导师的课酬汇总
    const allTeachers = await db.select().from(teachers);
    
    const summaries = await Promise.all(
      allTeachers.map(async (teacher) => {
        const summary = await getTeacherSalarySummary(teacher.id, period || undefined);
        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherType: teacher.teacherType,
          ...summary,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('获取课酬统计失败:', error);
    return NextResponse.json(
      { 
        error: '获取失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

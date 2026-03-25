/**
 * 工作流效率报表 API
 * GET /api/workflows/analytics/report
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEfficiencyReport, 
  getWorkflowTrends,
  type TimeRange 
} from '@/lib/workflow-analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'month';
    const includeTrends = searchParams.get('trends') === 'true';
    const trendDays = parseInt(searchParams.get('trendDays') || '30', 10);

    // 生成效率报表
    const report = await generateEfficiencyReport(timeRange);

    // 可选：包含趋势数据
    if (includeTrends) {
      const trends = await getWorkflowTrends(trendDays);
      return NextResponse.json({
        success: true,
        data: {
          ...report,
          trends,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('获取工作流效率报表失败:', error);
    return NextResponse.json(
      { 
        error: '获取报表失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

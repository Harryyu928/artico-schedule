/**
 * 导师推荐 API
 * GET /api/teachers/recommend?courseId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  recommendTeachers, 
  getTeacherAvailableSlots,
  analyzeTeacherWorkload,
  type RecommendationConfig 
} from '@/lib/teacher-recommendation';

/**
 * 获取导师推荐
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const preferFullTime = searchParams.get('preferFullTime') === 'true';
    const analyze = searchParams.get('analyze') === 'true';

    // 如果是工作负载分析请求
    if (analyze) {
      const workloadAnalysis = await analyzeTeacherWorkload();
      return NextResponse.json({
        success: true,
        data: workloadAnalysis,
      });
    }

    // 必须提供课程ID
    if (!courseId) {
      return NextResponse.json(
        { error: '缺少 courseId 参数' },
        { status: 400 }
      );
    }

    // 推荐配置
    const config: RecommendationConfig = {
      preferFullTime,
      maxWorkloadThreshold: 18, // 推荐工作负载不超过18节的导师
    };

    // 获取推荐
    const recommendations = await recommendTeachers(courseId, config);

    // 为每个推荐导师获取可用时间详情
    const recommendationsWithAvailability = await Promise.all(
      recommendations.map(async (rec) => {
        const availableSlots = await getTeacherAvailableSlots(rec.teacherId);
        const freeSlotsCount = availableSlots.filter(s => !s.isBooked).length;
        
        return {
          ...rec,
          availabilitySlots: freeSlotsCount,
          availableSlots: availableSlots.slice(0, 10), // 只返回前10个
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        courseId,
        recommendations: recommendationsWithAvailability,
        total: recommendationsWithAvailability.length,
        config: {
          preferFullTime,
        },
      },
    });
  } catch (error) {
    console.error('获取导师推荐失败:', error);
    return NextResponse.json(
      { 
        error: '获取推荐失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

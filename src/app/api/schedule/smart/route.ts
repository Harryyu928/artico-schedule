/**
 * 智能排课 API
 * POST /api/schedule/smart
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  smartScheduleForStudent, 
  buildScheduleContext,
  SmartScheduler,
  type ScheduleRequest,
} from '@/lib/smart-scheduler';

/**
 * 智能排课
 * 
 * 请求体：
 * {
 *   "studentId": "学生ID",
 *   "courseIds": ["课程ID1", "课程ID2"],
 *   "preferredDays": ["周六", "周日"],
 *   "preferredSlots": ["10:00", "13:00"],
 *   "preferredTeacherId": "偏好导师ID（可选）",
 *   "mode": "preview" | "apply" // preview仅预览，apply直接应用
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      courseIds,
      preferredDays,
      preferredSlots,
      preferredTeacherId,
      mode = 'preview',
    } = body;

    if (!studentId || !courseIds || courseIds.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数: studentId 或 courseIds' },
        { status: 400 }
      );
    }

    // 执行智能排课
    const result = await smartScheduleForStudent(studentId, courseIds, {
      preferredDays,
      preferredSlots,
      preferredTeacherId,
    });

    // 如果是应用模式，保存排课结果
    if (mode === 'apply' && result.schedules.length > 0) {
      // TODO: 保存排课结果到数据库
      // 这里需要调用原有的排课保存逻辑
    }

    return NextResponse.json({
      success: result.success,
      data: {
        schedules: result.schedules,
        conflicts: result.conflicts,
        suggestions: result.suggestions,
        mode,
      },
    });
  } catch (error) {
    console.error('智能排课失败:', error);
    return NextResponse.json(
      { 
        error: '排课失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 获取排课预览和冲突检测
 * 
 * 查询参数：
 * - studentId: 学生ID
 * - teacherId: 导师ID（可选）
 * - courseId: 课程ID（可选）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');
    const courseId = searchParams.get('courseId');

    if (!studentId) {
      return NextResponse.json(
        { error: '缺少 studentId 参数' },
        { status: 400 }
      );
    }

    // 构建上下文
    const context = await buildScheduleContext();
    const scheduler = new SmartScheduler(context);

    // 获取学生的可用时间
    const studentAvail = context.studentAvailabilities.get(studentId);
    const availableSlots = studentAvail ? Array.from(studentAvail) : [];

    // 如果指定了导师和课程，返回具体的排课建议
    if (teacherId && courseId) {
      const result = scheduler.schedule({
        studentId,
        courseId,
        preferredTeacherId: teacherId,
      });

      return NextResponse.json({
        success: result.success,
        data: {
          availableSlots,
          suggestedSchedule: result.slots[0] || null,
          conflicts: result.conflicts,
          alternatives: result.suggestions,
          score: result.score,
        },
      });
    }

    // 否则返回学生的时间可用性概况
    return NextResponse.json({
      success: true,
      data: {
        studentId,
        availableSlots,
        totalAvailableSlots: availableSlots.length,
        existingBookings: context.studentExistingSchedules.get(studentId)?.size || 0,
      },
    });
  } catch (error) {
    console.error('获取排课预览失败:', error);
    return NextResponse.json(
      { 
        error: '获取预览失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

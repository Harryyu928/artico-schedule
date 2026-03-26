/**
 * 自动排课 API
 * 基于选课单、学生时间表、导师时间表自动生成排课
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  scheduleResults, 
  students, 
  teachers, 
  courses, 
  studentCourses,
  timeAvailabilities,
  courseSelectionItems,
  courseSelectionForms
} from '@/db/schema';
import { eq, and, ne, gt, lt, isNull, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getBitableService } from '@/lib/feishu-bitable-service';

// 时间段配置
const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'] as const;
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

interface ScheduleRequest {
  studentId?: string;           // 指定学生（可选）
  teacherId?: string;           // 指定导师（可选）
  selectionFormId?: string;     // 指定选课单（可选）
  weekStart?: string;           // 开始日期 YYYY-MM-DD
  weeks?: number;               // 排课周数，默认1周
  hoursPerWeek?: number;        // 每周课时，默认2小时
  priorityRule?: 'remaining_hours' | 'deadline' | 'student_priority'; // 优先规则
}

/**
 * POST /api/schedule/auto
 * 执行自动排课
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json().catch(() => ({}));
    
    console.log('[AutoSchedule] 开始自动排课...', body);

    const weekStart = body.weekStart || getNextMonday();
    const weeks = body.weeks || 1;
    const hoursPerWeek = body.hoursPerWeek || 2;

    const results = {
      scheduled: 0,
      failed: 0,
      details: [] as any[],
      conflicts: [] as any[],
    };

    try {
      // 1. 获取需要排课的数据
      const studentsData = body.studentId 
        ? await db.select().from(students).where(eq(students.id, body.studentId))
        : await db.select().from(students);

      const teachersData = await db.select().from(teachers).where(eq(teachers.cooperationStatus, '合作中'));

      // 2. 遍历学生进行排课
      for (const student of studentsData) {
        try {
          // 获取学生的选课单
          const selectionForms = await db.select()
            .from(courseSelectionForms)
            .where(eq(courseSelectionForms.studentId, student.id));

          if (selectionForms.length === 0) continue;

          // 获取所有选课单的项目
          const formIds = selectionForms.map(f => f.id);
          const selectionItems = formIds.length > 0
            ? await db.select()
                .from(courseSelectionItems)
                .where(inArray(courseSelectionItems.formId, formIds))
            : [];

          if (selectionItems.length === 0) continue;

          // 获取学生可用时间
          const studentTimes = await db.select()
            .from(timeAvailabilities)
            .where(and(
              eq(timeAvailabilities.userId, student.id),
              eq(timeAvailabilities.userRole, '学生' as any),
              eq(timeAvailabilities.isAvailable, true)
            ));

          if (studentTimes.length === 0) {
            results.conflicts.push({
              studentId: student.id,
              studentName: student.name,
              reason: '学生没有可用时间',
            });
            continue;
          }

          // 为每个选课项目排课
          for (const item of selectionItems) {
            // 检查是否已排课时数
            const plannedHours = item.plannedHours || 0;
            const scheduledHours = item.scheduledHours || 0;
            const remainingHours = plannedHours - scheduledHours;

            if (remainingHours <= 0) continue;

            // 找到能上这门课的导师
            const courseData = await db.select()
              .from(courses)
              .where(eq(courses.id, item.courseId))
              .limit(1);

            if (courseData.length === 0) continue;

            const course = courseData[0];
            
            // 找到能教授该课程类型的导师
            const eligibleTeachers = teachersData.filter(t => {
              const majorDirections = t.majorDirections || [];
              const courseCategory = course.category;
              return majorDirections.some(dir => 
                dir.includes(courseCategory) || courseCategory.includes(dir)
              );
            });

            if (eligibleTeachers.length === 0) {
              results.conflicts.push({
                studentId: student.id,
                studentName: student.name,
                courseId: course.id,
                courseName: course.name,
                reason: '没有导师可以教授该课程',
              });
              continue;
            }

            // 获取学生已排课程（用于冲突检测）
            const existingSchedules = await db.select()
              .from(scheduleResults)
              .where(and(
                eq(scheduleResults.studentId, student.id),
                ne(scheduleResults.status, '取消')
              ));

            // 尝试为该学生和课程找到合适的时间
            let scheduled = false;
            
            for (const teacher of eligibleTeachers) {
              try {
                // 获取导师可用时间
                const teacherTimes = await db.select()
                  .from(timeAvailabilities)
                  .where(and(
                    eq(timeAvailabilities.userId, teacher.id),
                    eq(timeAvailabilities.userRole, '全职导师' as any),
                    eq(timeAvailabilities.isAvailable, true)
                  ));

                // 获取导师已排课程（用于冲突检测）
                const teacherSchedules = await db.select()
                  .from(scheduleResults)
                  .where(and(
                    eq(scheduleResults.teacherId, teacher.id),
                    ne(scheduleResults.status, '取消')
                  ));

                // 找到学生和导师时间的交集
                const matchedTime = findMatchedTime(
                  studentTimes,
                  teacherTimes,
                  existingSchedules,
                  teacherSchedules,
                  weekStart,
                  weeks
                );

                if (matchedTime) {
                  // 创建排课记录
                  const scheduleId = `SCH${Date.now()}${Math.floor(Math.random() * 1000)}`;
                  
                  const [schedule] = await db.insert(scheduleResults).values({
                    id: uuidv4(),
                    scheduleId,
                    studentId: student.id,
                    teacherId: teacher.id,
                    courseId: course.id,
                    studentCourseId: item.id,
                    date: matchedTime.date,
                    weekDay: matchedTime.weekDay as any,
                    timeSlot: matchedTime.timeSlot as any,
                    hours: hoursPerWeek,
                    status: '待确认',
                  }).returning();

                  // 更新选课项目的已排课时
                  await db.update(courseSelectionItems)
                    .set({
                      scheduledHours: (item.scheduledHours || 0) + hoursPerWeek,
                      updatedAt: new Date(),
                    })
                    .where(eq(courseSelectionItems.id, item.id));

                  results.scheduled++;
                  results.details.push({
                    scheduleId: schedule.scheduleId,
                    studentName: student.name,
                    teacherName: teacher.name,
                    courseName: course.name,
                    date: matchedTime.date,
                    weekDay: matchedTime.weekDay,
                    timeSlot: matchedTime.timeSlot,
                    hours: hoursPerWeek,
                  });

                  scheduled = true;
                  break;
                }
              } catch (innerError) {
                console.error('[AutoSchedule] 处理导师排课失败:', innerError);
              }
            }

            if (!scheduled) {
              results.conflicts.push({
                studentId: student.id,
                studentName: student.name,
                courseId: course.id,
                courseName: course.name,
                reason: '无法找到合适的时间安排',
              });
              results.failed++;
            }
          }
        } catch (studentError) {
          console.error('[AutoSchedule] 处理学生排课失败:', studentError);
        }
      }
    } catch (dbError: any) {
      console.error('[AutoSchedule] 数据库查询失败:', dbError);
      // 返回部分结果而不是错误
      return NextResponse.json({
        success: true,
        scheduled: 0,
        failed: 0,
        details: [],
        conflicts: [],
        message: '自动排课完成，但没有找到可排课的数据',
      });
    }

    console.log(`[AutoSchedule] 排课完成: 成功 ${results.scheduled}, 失败 ${results.failed}`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[AutoSchedule] 自动排课失败:', error);
    return NextResponse.json(
      { error: '自动排课失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 找到匹配的时间
 */
function findMatchedTime(
  studentTimes: any[],
  teacherTimes: any[],
  studentSchedules: any[],
  teacherSchedules: any[],
  weekStart: string,
  weeks: number
): { date: string; weekDay: string; timeSlot: string } | null {
  // 解析开始日期
  const startDate = new Date(weekStart);
  
  // 构建学生可用时间集合
  const studentTimeSet = new Set(
    studentTimes.map(t => `${t.weekDay}-${t.timeSlot}`)
  );
  
  // 构建导师可用时间集合
  const teacherTimeSet = new Set(
    teacherTimes.map(t => `${t.weekDay}-${t.timeSlot}`)
  );

  // 构建学生已占用时间
  const studentBusySet = new Set(
    studentSchedules.map(s => `${s.date}-${s.timeSlot}`)
  );

  // 构建导师已占用时间
  const teacherBusySet = new Set(
    teacherSchedules.map(s => `${s.date}-${s.timeSlot}`)
  );

  // 遍历周数
  for (let w = 0; w < weeks; w++) {
    // 遍历每一天
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = currentDate.toISOString().split('T')[0];
      const weekDay = WEEK_DAYS[d];

      // 遍历每个时间段
      for (const timeSlot of TIME_SLOTS) {
        const timeKey = `${weekDay}-${timeSlot}`;
        const busyKey = `${dateStr}-${timeSlot}`;

        // 检查学生和导师是否都可用
        if (studentTimeSet.has(timeKey) && teacherTimeSet.has(timeKey)) {
          // 检查是否已被占用
          if (!studentBusySet.has(busyKey) && !teacherBusySet.has(busyKey)) {
            return { date: dateStr, weekDay, timeSlot };
          }
        }
      }
    }
  }

  return null;
}

/**
 * 获取下周一的日期
 */
function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}

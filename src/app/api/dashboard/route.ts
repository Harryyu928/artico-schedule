/**
 * 运营仪表盘 API
 * 
 * 提供多维度数据分析，从运营角度出发
 * GET /api/dashboard - 获取仪表盘数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, students, teachers, courses, scheduleResults, studentCourses, courseSelectionForms, classRecords } from '@/db/schema';
import { eq, and, gte, lte, sql, count, desc, asc, inArray, not, isNull } from 'drizzle-orm';
import type { UserRole } from '@/types/permissions';

// GET - 获取仪表盘数据
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    const role = user.role as UserRole;
    
    // 根据角色返回不同的仪表盘数据
    switch (role) {
      case '管理员':
        return await getAdminDashboard(user);
      case '规划顾问':
        return await getConsultantDashboard(user);
      case '全职导师':
      case '兼职导师':
        return await getTeacherDashboard(user);
      case '学生':
        return await getStudentDashboard(user);
      default:
        return NextResponse.json(
          { success: false, error: '未知角色' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取仪表盘数据失败' },
      { status: 500 }
    );
  }
}

// ==================== 管理员仪表盘（运营视角）====================

async function getAdminDashboard(user: typeof users.$inferSelect) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // ========== 1. 核心业务指标 ==========
  // 使用独立的 try-catch 来处理可能不存在的表
  let studentCount = 0, teacherCount = 0, courseCount = 0, scheduleCount = 0, classRecordCount = 0;
  
  try {
    const [studentCountResult] = await db.select({ count: count() }).from(students);
    studentCount = studentCountResult.count;
  } catch (e) { console.log('students table not available'); }
  
  try {
    const [teacherCountResult] = await db.select({ count: count() }).from(teachers);
    teacherCount = teacherCountResult.count;
  } catch (e) { console.log('teachers table not available'); }
  
  try {
    const [courseCountResult] = await db.select({ count: count() }).from(courses);
    courseCount = courseCountResult.count;
  } catch (e) { console.log('courses table not available'); }
  
  try {
    const [scheduleCountResult] = await db.select({ count: count() }).from(scheduleResults);
    scheduleCount = scheduleCountResult.count;
  } catch (e) { console.log('scheduleResults table not available'); }
  
  try {
    const [classRecordCountResult] = await db.select({ count: count() }).from(classRecords);
    classRecordCount = classRecordCountResult.count;
  } catch (e) { console.log('classRecords table not available'); }
  
  // 本周/本月新增学生
  let newStudentsThisWeek = 0, newStudentsThisMonth = 0;
  
  try {
    const newStudentsThisWeekResult = await db.select({ count: count() })
      .from(students)
      .where(gte(students.createdAt, weekAgo));
    newStudentsThisWeek = newStudentsThisWeekResult[0].count;
    
    const newStudentsThisMonthResult = await db.select({ count: count() })
      .from(students)
      .where(gte(students.createdAt, monthAgo));
    newStudentsThisMonth = newStudentsThisMonthResult[0].count;
  } catch (e) { /* ignore */ }
  
  // 今日排课数
  let todaySchedules = 0;
  try {
    const todaySchedulesResult = await db.select({ count: count() })
      .from(scheduleResults)
      .where(gte(scheduleResults.createdAt, today));
    todaySchedules = todaySchedulesResult[0].count;
  } catch (e) { /* ignore */ }

  // ========== 2. 学生多维度分析 ==========
  const allStudents = await db.select().from(students);
  
  // 年级/阶段分布
  const stageDistribution = allStudents.reduce((acc, s) => {
    acc[s.currentStage] = (acc[s.currentStage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 专业方向分布
  const majorDistribution = allStudents.reduce((acc, s) => {
    acc[s.major] = (acc[s.major] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 申请国家分布
  const countryDistribution = allStudents.reduce((acc, s) => {
    acc[s.applicationCountry] = (acc[s.applicationCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 低课时预警（剩余课时<10）
  const lowHourStudents = allStudents.filter(s => (s.totalHours - s.consumedHours) < 10);
  
  // 课时耗尽学生（剩余课时=0）
  const exhaustedStudents = allStudents.filter(s => s.totalHours <= s.consumedHours);

  // ========== 3. 导师分析 ==========
  const allTeachers = await db.select().from(teachers);
  
  // 全职/兼职分布
  const teacherTypeDistribution = allTeachers.reduce((acc, t) => {
    acc[t.teacherType] = (acc[t.teacherType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 导师课时利用率
  const teacherUtilization = allTeachers.map(t => ({
    id: t.id,
    name: t.name,
    type: t.teacherType,
    currentHours: t.currentHours,
    maxHours: t.maxWeeklyHours,
    utilization: t.maxWeeklyHours > 0 ? Math.round((t.currentHours / t.maxWeeklyHours) * 100) : 0,
  }));
  
  // 高负荷导师（利用率>80%）
  const highLoadTeachers = teacherUtilization.filter(t => t.utilization > 80);
  
  // 低负荷导师（利用率<30%）
  const lowLoadTeachers = teacherUtilization.filter(t => t.utilization < 30);

  // ========== 4. 课程分析 ==========
  // 热门课程排行（按排课数量）
  let topCourses: Array<{ id: string; name: string; category: string; scheduleCount: number }> = [];
  
  try {
    const courseStats = await db
      .select({
        courseId: scheduleResults.courseId,
        count: count(),
      })
      .from(scheduleResults)
      .groupBy(scheduleResults.courseId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    
    // 获取课程名称
    const courseIds = courseStats.map(cs => cs.courseId);
    const courseInfo = courseIds.length > 0 
      ? await db.select().from(courses).where(inArray(courses.id, courseIds))
      : [];
    
    const courseMap = new Map(courseInfo.map(c => [c.id, c]));
    topCourses = courseStats.map(cs => {
      const course = courseMap.get(cs.courseId);
      return course ? {
        id: course.id,
        name: course.name,
        category: course.category,
        scheduleCount: cs.count,
      } : null;
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  } catch (e) { /* ignore */ }

  // ========== 5. 排课分析 ==========
  let timeSlotDistribution: Array<{ timeSlot: string; count: number }> = [];
  let weekDayDistribution: Array<{ weekDay: string; count: number }> = [];
  let scheduleStatusDistribution: Array<{ status: string; count: number }> = [];
  
  try {
    // 时段分布
    timeSlotDistribution = await db
      .select({
        timeSlot: scheduleResults.timeSlot,
        count: count(),
      })
      .from(scheduleResults)
      .groupBy(scheduleResults.timeSlot);
    
    // 周几分布
    weekDayDistribution = await db
      .select({
        weekDay: scheduleResults.weekDay,
        count: count(),
      })
      .from(scheduleResults)
      .groupBy(scheduleResults.weekDay);
    
    // 排课状态分布
    scheduleStatusDistribution = await db
      .select({
        status: scheduleResults.status,
        count: count(),
      })
      .from(scheduleResults)
      .groupBy(scheduleResults.status);
  } catch (e) { /* ignore */ }

  // ========== 6. 财务概览 ==========
  const totalHours = allStudents.reduce((sum, s) => sum + s.totalHours, 0);
  const consumedHours = allStudents.reduce((sum, s) => sum + s.consumedHours, 0);
  const remainingHours = totalHours - consumedHours;

  // ========== 7. 预警指标 ==========
  // 待处理选课单
  let pendingFormsCount = 0;
  try {
    const pendingFormsResult = await db.select({ count: count() })
      .from(courseSelectionForms)
      .where(eq(courseSelectionForms.status, '已确认'));
    pendingFormsCount = pendingFormsResult[0]?.count || 0;
  } catch (e) { /* ignore */ }
  
  // 待填上课记录
  let pendingRecordsCount = 0;
  let inactiveStudents: typeof allStudents = [];
  
  try {
    const pendingRecordsResult = await db.select({ count: count() })
      .from(classRecords)
      .where(eq(classRecords.attendanceStatus, '已排课'));
    pendingRecordsCount = pendingRecordsResult[0]?.count || 0;
    
    // 长时间未上课学生（超过14天没有上课记录）
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentClassStudentIds = await db
      .selectDistinct({ studentId: classRecords.studentId })
      .from(classRecords)
      .where(gte(classRecords.createdAt, twoWeeksAgo));
    
    const recentStudentIdSet = new Set(recentClassStudentIds.map(r => r.studentId));
    inactiveStudents = allStudents.filter(s => !recentStudentIdSet.has(s.id));
  } catch (e) { /* ignore */ }

  // ========== 8. 趋势数据（近30天）==========
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // 学生增长趋势
  let studentGrowth: Array<{ date: string; count: number }> = [];
  let scheduleGrowth: Array<{ date: string; count: number }> = [];
  
  try {
    studentGrowth = await db
      .select({
        date: sql<string>`DATE(${students.createdAt})`.as('date'),
        count: count(),
      })
      .from(students)
      .where(gte(students.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${students.createdAt})`)
      .orderBy(asc(sql`DATE(${students.createdAt})`));
  } catch (e) { /* ignore */ }
  
  try {
    // 排课趋势
    scheduleGrowth = await db
      .select({
        date: sql<string>`DATE(${scheduleResults.createdAt})`.as('date'),
        count: count(),
      })
      .from(scheduleResults)
      .where(gte(scheduleResults.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${scheduleResults.createdAt})`)
      .orderBy(asc(sql`DATE(${scheduleResults.createdAt})`));
  } catch (e) { /* ignore */ }

  // ========== 9. 最近活动 ==========
  let recentSchedules: typeof scheduleResults.$inferSelect[] = [];
  let recentStudentsList: typeof students.$inferSelect[] = [];
  
  try {
    recentSchedules = await db.query.scheduleResults.findMany({
      orderBy: desc(scheduleResults.createdAt),
      limit: 5,
    });
  } catch (e) { /* ignore */ }
  
  try {
    recentStudentsList = await db.query.students.findMany({
      orderBy: desc(students.createdAt),
      limit: 5,
    });
  } catch (e) { /* ignore */ }

  return NextResponse.json({
    success: true,
    data: {
      role: '管理员',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      
      // 核心指标
      overview: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalCourses: courseCount,
        totalSchedules: scheduleCount,
        totalClassRecords: classRecordCount,
        newStudentsThisWeek,
        newStudentsThisMonth,
        todaySchedules,
      },
      
      // 学生分析
      studentAnalytics: {
        stageDistribution,
        majorDistribution,
        countryDistribution,
        lowHourCount: lowHourStudents.length,
        exhaustedCount: exhaustedStudents.length,
        lowHourStudents: lowHourStudents.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
          remaining: s.totalHours - s.consumedHours,
        })),
        exhaustedStudents: exhaustedStudents.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
        })),
      },
      
      // 导师分析
      teacherAnalytics: {
        typeDistribution: teacherTypeDistribution,
        highLoadCount: highLoadTeachers.length,
        lowLoadCount: lowLoadTeachers.length,
        highLoadTeachers: highLoadTeachers.slice(0, 5),
        lowLoadTeachers: lowLoadTeachers.slice(0, 5),
        averageUtilization: teacherUtilization.length > 0
          ? Math.round(teacherUtilization.reduce((sum, t) => sum + t.utilization, 0) / teacherUtilization.length)
          : 0,
      },
      
      // 课程分析
      courseAnalytics: {
        topCourses: topCourses.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          category: c.category,
          scheduleCount: (c as any).scheduleCount,
        })),
      },
      
      // 排课分析
      scheduleAnalytics: {
        timeSlotDistribution: Object.fromEntries(
          timeSlotDistribution.map(t => [t.timeSlot, t.count])
        ),
        weekDayDistribution: Object.fromEntries(
          weekDayDistribution.map(w => [w.weekDay, w.count])
        ),
        statusDistribution: Object.fromEntries(
          scheduleStatusDistribution.map(s => [s.status, s.count])
        ),
      },
      
      // 财务概览
      financial: {
        totalHours,
        consumedHours,
        remainingHours,
        utilizationRate: totalHours > 0 ? Math.round((consumedHours / totalHours) * 100) : 0,
      },
      
      // 预警指标
      alerts: {
        pendingForms: pendingFormsCount,
        pendingRecords: pendingRecordsCount,
        lowHourStudents: lowHourStudents.length,
        exhaustedStudents: exhaustedStudents.length,
        inactiveStudents: inactiveStudents.length,
      },
      
      // 趋势数据
      trends: {
        studentGrowth: studentGrowth.map(s => ({
          date: s.date,
          count: s.count,
        })),
        scheduleGrowth: scheduleGrowth.map(s => ({
          date: s.date,
          count: s.count,
        })),
      },
      
      // 最近活动
      recentActivities: [
        ...recentStudentsList.map(s => ({
          type: 'student',
          message: `新学生"${s.name}"完成入学`,
          time: formatTimeAgo(s.createdAt),
        })),
        ...recentSchedules.slice(0, 3).map(sc => ({
          type: 'schedule',
          message: `排课创建成功`,
          time: formatTimeAgo(sc.createdAt),
        })),
      ].slice(0, 8),
      
      quickActions: [
        { label: '学生管理', href: '/students', icon: 'Users' },
        { label: '导师管理', href: '/teachers', icon: 'UserCheck' },
        { label: '课程管理', href: '/courses', icon: 'BookOpen' },
        { label: '选课指导课', href: '/consultations', icon: 'Calendar' },
        { label: '选课单管理', href: '/selection-forms', icon: 'FileText' },
        { label: '排课管理', href: '/schedules', icon: 'Calendar' },
        { label: '时间表管理', href: '/time-table/manage', icon: 'Clock' },
        { label: '数据导入', href: '/import', icon: 'Upload' },
      ],
    },
  });
}

// ==================== 规划顾问仪表盘 ====================

async function getConsultantDashboard(user: typeof users.$inferSelect) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 周一
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // 获取签约学生
  const myStudents = await db.query.students.findMany({
    where: eq(students.consultantId, user.id),
  });
  
  // 学生阶段分布
  const stageDistribution = myStudents.reduce((acc, s) => {
    acc[s.currentStage] = (acc[s.currentStage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 低课时学生
  const lowHourStudents = myStudents.filter(s => (s.totalHours - s.consumedHours) < 10);
  
  // 待处理选课单
  const studentIds = myStudents.map(s => s.id);
  let pendingForms: Array<{ id: string; formId: string; studentId: string; status: string; createdAt: Date }> = [];
  try {
    pendingForms = studentIds.length > 0 
      ? await db.query.courseSelectionForms.findMany({
          where: and(
            inArray(courseSelectionForms.studentId, studentIds),
            eq(courseSelectionForms.status, '已确认')
          ),
          limit: 10,
        }) as typeof pendingForms
      : [];
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 本周排课情况
  let weekSchedules: Array<{ id: string; studentId: string; date: string; timeSlot: string; status: string }> = [];
  try {
    weekSchedules = studentIds.length > 0
      ? await db.query.scheduleResults.findMany({
          where: and(
            inArray(scheduleResults.studentId, studentIds),
            gte(scheduleResults.date, weekStart.toISOString().split('T')[0])
          ),
        }) as typeof weekSchedules
      : [];
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 今日课程
  const todaySchedules = weekSchedules.filter(s => s.date === today.toISOString().split('T')[0]);
  
  // 本周上课记录
  let weekClassRecords: Array<{ id: string; studentId: string; createdAt: Date }> = [];
  try {
    weekClassRecords = studentIds.length > 0
      ? await db.query.classRecords.findMany({
          where: and(
            inArray(classRecords.studentId, studentIds),
            gte(classRecords.createdAt, weekStart)
          ),
        })
      : [];
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 长时间未上课学生
  let inactiveStudents: Array<typeof students.$inferSelect> = [];
  try {
    const recentClassStudentIds = studentIds.length > 0
      ? await db.selectDistinct({ studentId: classRecords.studentId })
          .from(classRecords)
          .where(and(
            inArray(classRecords.studentId, studentIds),
            gte(classRecords.createdAt, twoWeeksAgo)
          ))
      : [];
    
    const recentStudentIdSet = new Set(recentClassStudentIds.map(r => r.studentId));
    inactiveStudents = myStudents.filter(s => !recentStudentIdSet.has(s.id));
  } catch (e) {
    // 表不存在时，将所有学生标记为活跃
    inactiveStudents = [];
  }
  
  // 学生上课情况统计
  const studentClassStats = await Promise.all(
    myStudents.slice(0, 20).map(async (student) => {
      try {
        const weekRecords = await db.select({ count: count() })
          .from(classRecords)
          .where(and(
            eq(classRecords.studentId, student.id),
            gte(classRecords.createdAt, weekStart)
          ));
        
        const monthRecords = await db.select({ count: count() })
          .from(classRecords)
          .where(and(
            eq(classRecords.studentId, student.id),
            gte(classRecords.createdAt, monthStart)
          ));
        
        const lastRecord = await db.query.classRecords.findFirst({
          where: eq(classRecords.studentId, student.id),
          orderBy: desc(classRecords.createdAt),
        });
        
        return {
          studentId: student.id,
          studentName: student.name,
          weekRecords: weekRecords[0]?.count || 0,
          monthRecords: monthRecords[0]?.count || 0,
          lastClassDate: lastRecord?.classDate || null,
        };
      } catch (e) {
        return {
          studentId: student.id,
          studentName: student.name,
          weekRecords: 0,
          monthRecords: 0,
          lastClassDate: null,
        };
      }
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      role: '规划顾问',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      
      overview: {
        myStudents: myStudents.length,
        pendingForms: pendingForms.length,
        todaySchedules: todaySchedules.length,
        weekSchedules: weekSchedules.length,
        lowHourCount: lowHourStudents.length,
        inactiveCount: inactiveStudents.length,
        weekClassRecords: weekClassRecords.length,
      },
      
      studentAnalytics: {
        stageDistribution,
        lowHourStudents: lowHourStudents.slice(0, 10).map(s => ({
          id: s.id,
          name: s.name,
          remaining: s.totalHours - s.consumedHours,
          major: s.major,
          stage: s.currentStage,
        })),
      },
      
      pendingFormsList: pendingForms.slice(0, 10).map(f => ({
        id: f.id,
        formId: f.formId,
        status: f.status,
        studentId: f.studentId,
        createdAt: f.createdAt?.toISOString(),
      })),
      
      todaySchedule: todaySchedules.slice(0, 10).map(s => ({
        id: s.id,
        time: s.timeSlot,
        status: s.status,
        studentId: s.studentId,
      })),
      
      studentClassRecords: studentClassStats,
      
      urgentTasks: [
        ...(inactiveStudents.length > 0 ? [{
          type: 'warning',
          message: `${inactiveStudents.length}位学生超过14天未上课，请关注`,
          priority: 'high' as const,
          action: '/students?filter=inactive',
        }] : []),
        ...(lowHourStudents.length > 0 ? [{
          type: 'warning',
          message: `${lowHourStudents.length}位学生课时不足，请及时跟进续费`,
          priority: 'high' as const,
          action: '/students?filter=lowHours',
        }] : []),
        ...(pendingForms.length > 0 ? [{
          type: 'form',
          message: `${pendingForms.length}份选课单待处理`,
          priority: 'medium' as const,
          action: '/selection-forms?status=pending',
        }] : []),
      ],
      
      quickActions: [
        { label: '我的学生', href: '/students?consultantId=' + user.id, icon: 'Users' },
        { label: '选课指导课', href: '/consultations', icon: 'Calendar' },
        { label: '选课单管理', href: '/selection-forms', icon: 'FileText' },
        { label: '时间表管理', href: '/time-table/manage', icon: 'Clock' },
        { label: '排课管理', href: '/schedules', icon: 'Calendar' },
      ],
    },
  });
}

// ==================== 导师仪表盘 ====================

async function getTeacherDashboard(user: typeof users.$inferSelect) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // 获取导师信息
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, user.teacherId || ''),
  });
  
  if (!teacher) {
    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        user: { id: user.id, name: user.name },
        overview: { todayCourses: 0, weekHours: 0, maxWeekHours: 20, totalStudents: 0, pendingRecords: 0 },
        todayCourses: [],
        weekSchedule: [],
        studentProgress: [],
        pendingRecords: [],
        quickActions: [],
      },
    });
  }
  
  // 本周课程
  let weekSchedules: Array<{ id: string; studentId: string; teacherId: string; courseId: string; date: string; weekDay: string; timeSlot: string; status: string; hours: number }> = [];
  try {
    weekSchedules = await db.query.scheduleResults.findMany({
      where: and(
        eq(scheduleResults.teacherId, teacher.id),
        gte(scheduleResults.date, weekStart.toISOString().split('T')[0])
      ),
    }) as typeof weekSchedules;
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 今日课程
  const todaySchedules = weekSchedules.filter(s => s.date === today.toISOString().split('T')[0]);
  
  // 统计本周课时
  const weekHours = weekSchedules.reduce((sum, s) => sum + s.hours, 0);
  
  // 待填上课记录（详情）
  let pendingRecordsList: Array<{ id: string; studentId: string; teacherId: string; courseId: string; classDate: string; attendanceStatus: string }> = [];
  try {
    pendingRecordsList = await db.query.classRecords.findMany({
      where: and(
        eq(classRecords.teacherId, teacher.id),
        eq(classRecords.attendanceStatus, '已排课')
      ),
      limit: 10,
      orderBy: desc(classRecords.classDate),
    }) as typeof pendingRecordsList;
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 最近上课记录
  let recentRecords: Array<{ id: string; studentId: string; teacherId: string; courseId: string; classDate: string; attendanceStatus: string; contentSummary?: string; createdAt: Date }> = [];
  try {
    recentRecords = await db.query.classRecords.findMany({
      where: and(
        eq(classRecords.teacherId, teacher.id),
        eq(classRecords.attendanceStatus, '已完成')
      ),
      limit: 5,
      orderBy: desc(classRecords.createdAt),
    }) as typeof recentRecords;
  } catch (e) { /* 表不存在时忽略 */ }
  
  // 我的学生（去重）
  const uniqueStudentIds = [...new Set(weekSchedules.map(s => s.studentId))];
  
  // 获取学生信息
  const myStudentsList = uniqueStudentIds.length > 0
    ? await db.query.students.findMany({
        where: inArray(students.id, uniqueStudentIds),
      })
    : [];
  
  const studentMap = new Map(myStudentsList.map(s => [s.id, s]));
  
  // 获取课程信息
  const courseIds = [...new Set(weekSchedules.map(s => s.courseId))];
  const courseList = courseIds.length > 0
    ? await db.query.courses.findMany({
        where: inArray(courses.id, courseIds),
      })
    : [];
  
  const courseMap = new Map(courseList.map(c => [c.id, c]));
  
  // 学生进度
  const studentProgress = myStudentsList.map(s => ({
    id: s.id,
    name: s.name,
    progress: s.totalHours > 0 ? Math.round((s.consumedHours / s.totalHours) * 100) : 0,
    remaining: s.totalHours - s.consumedHours,
    totalHours: s.totalHours,
    consumedHours: s.consumedHours,
    major: s.major,
    stage: s.currentStage,
  }));
  
  // 本月课程统计
  let monthSchedules: Array<{ id: string; hours: number }> = [];
  try {
    monthSchedules = await db.query.scheduleResults.findMany({
      where: and(
        eq(scheduleResults.teacherId, teacher.id),
        gte(scheduleResults.createdAt, monthStart)
      ),
    }) as typeof monthSchedules;
  } catch (e) { /* 表不存在时忽略 */ }

  return NextResponse.json({
    success: true,
    data: {
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        teacherType: teacher.teacherType,
      },
      
      overview: {
        todayCourses: todaySchedules.length,
        weekCourses: weekSchedules.length,
        weekHours,
        maxWeekHours: teacher.maxWeeklyHours,
        hourPercentage: teacher.maxWeeklyHours > 0 ? Math.round((weekHours / teacher.maxWeeklyHours) * 100) : 0,
        totalStudents: uniqueStudentIds.length,
        pendingRecords: pendingRecordsList.length,
        monthCourses: monthSchedules.length,
        monthHours: monthSchedules.reduce((sum, s) => sum + s.hours, 0),
      },
      
      todayCourses: todaySchedules.map(s => ({
        id: s.id,
        time: s.timeSlot,
        status: s.status,
        hours: s.hours,
        studentId: s.studentId,
        studentName: studentMap.get(s.studentId)?.name,
        courseId: s.courseId,
        courseName: courseMap.get(s.courseId)?.name,
      })),
      
      weekSchedule: weekSchedules.map(s => ({
        id: s.id,
        date: s.date,
        weekDay: s.weekDay,
        time: s.timeSlot,
        status: s.status,
        studentId: s.studentId,
        studentName: studentMap.get(s.studentId)?.name,
        courseId: s.courseId,
        courseName: courseMap.get(s.courseId)?.name,
      })),
      
      studentProgress,
      
      pendingRecords: pendingRecordsList.map(r => ({
        id: r.id,
        date: r.classDate,
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId)?.name,
        courseId: r.courseId,
        courseName: courseMap.get(r.courseId)?.name,
      })),
      
      recentClassRecords: recentRecords.map(r => ({
        id: r.id,
        date: r.classDate,
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId)?.name,
        courseId: r.courseId,
        courseName: courseMap.get(r.courseId)?.name,
        contentSummary: r.contentSummary?.slice(0, 50),
      })),
      
      quickActions: [
        { label: '我的时间表', href: '/time-table/teacher', icon: 'Clock' },
        { label: '我的学生', href: '/teacher/students', icon: 'Users' },
        { label: '课程表', href: '/teacher/schedule', icon: 'Calendar' },
        { label: '上课记录', href: '/teacher/records', icon: 'FileText' },
      ],
    },
  });
}

// ==================== 学生仪表盘 ====================

async function getStudentDashboard(user: typeof users.$inferSelect) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 获取学生信息
  const student = await db.query.students.findFirst({
    where: eq(students.id, user.studentId || ''),
  });
  
  if (!student) {
    return NextResponse.json({
      success: true,
      data: {
        role: '学生',
        user: { id: user.id, name: user.name },
        stats: { todayCourses: 0, totalHours: 0, consumedHours: 0, remainingHours: 0, progressPercentage: 0 },
        quickActions: [],
      },
    });
  }
  
  // 今日课程
  const todaySchedules = await db.query.scheduleResults.findMany({
    where: and(
      eq(scheduleResults.studentId, student.id),
      eq(scheduleResults.date, today.toISOString().split('T')[0] as any)
    ),
  });
  
  // 本周课程
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekSchedules = await db.query.scheduleResults.findMany({
    where: and(
      eq(scheduleResults.studentId, student.id),
      gte(scheduleResults.date, weekStart.toISOString().split('T')[0])
    ),
  });
  
  // 选课单
  const selectionForms = await db.query.courseSelectionForms.findMany({
    where: eq(courseSelectionForms.studentId, student.id),
  });
  
  // 上课记录
  const classRecordsList = await db.query.classRecords.findMany({
    where: eq(classRecords.studentId, student.id),
    orderBy: desc(classRecords.createdAt),
    limit: 5,
  });

  return NextResponse.json({
    success: true,
    data: {
      role: '学生',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: student.studentId,
        major: student.major,
        applicationCountry: student.applicationCountry,
        currentStage: student.currentStage,
      },
      
      overview: {
        todayCourses: todaySchedules.length,
        weekCourses: weekSchedules.length,
        totalHours: student.totalHours,
        consumedHours: student.consumedHours,
        remainingHours: student.totalHours - student.consumedHours,
        progressPercentage: student.totalHours > 0 ? Math.round((student.consumedHours / student.totalHours) * 100) : 0,
        selectionForms: selectionForms.length,
      },
      
      todayCourses: todaySchedules.map(s => ({
        id: s.id,
        time: s.timeSlot,
        status: s.status,
        hours: s.hours,
      })),
      
      weekSchedule: weekSchedules.map(s => ({
        id: s.id,
        date: s.date,
        weekDay: s.weekDay,
        time: s.timeSlot,
        status: s.status,
      })),
      
      recentClassRecords: classRecordsList.map(r => ({
        id: r.id,
        date: r.classDate,
        status: r.attendanceStatus,
      })),
      
      quickActions: [
        { label: '我的时间表', href: '/time-table/student', icon: 'Clock' },
        { label: '我的课程', href: '/student/courses', icon: 'BookOpen' },
        { label: '课程表', href: '/student/schedule', icon: 'Calendar' },
        { label: '上课记录', href: '/student/records', icon: 'FileText' },
      ],
    },
  });
}

// 辅助函数：格式化时间差
function formatTimeAgo(date: Date | null): string {
  if (!date) return '未知';
  
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${Math.floor(days / 7)}周前`;
}

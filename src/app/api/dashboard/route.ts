/**
 * 仪表盘 API
 * 
 * 根据用户角色返回不同的统计数据
 * GET /api/dashboard - 获取仪表盘数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, students, teachers, courses, scheduleResults, studentCourses, timeAvailabilities, courseSelectionForms, classRecords } from '@/db/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
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

// 管理员仪表盘数据
async function getAdminDashboard(user: typeof users.$inferSelect) {
  // 获取统计数据
  const [studentCount] = await db.select({ count: count() }).from(students);
  const [teacherCount] = await db.select({ count: count() }).from(teachers);
  const [courseCount] = await db.select({ count: count() }).from(courses);
  const [scheduleCount] = await db.select({ count: count() }).from(scheduleResults);
  const [pendingSelectionCount] = await db.select({ count: count() })
    .from(courseSelectionForms)
    .where(eq(courseSelectionForms.status, '已确认'));
  
  // 本周新增学生
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [newStudentsThisWeek] = await db.select({ count: count() })
    .from(students)
    .where(gte(students.createdAt, weekAgo));
  
  // 今日排课数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todaySchedules] = await db.select({ count: count() })
    .from(scheduleResults)
    .where(gte(scheduleResults.createdAt, today));
  
  return NextResponse.json({
    success: true,
    data: {
      role: '管理员',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      stats: {
        totalStudents: studentCount.count,
        totalTeachers: teacherCount.count,
        totalCourses: courseCount.count,
        totalSchedules: scheduleCount.count,
        pendingSelections: pendingSelectionCount.count,
        newStudentsThisWeek: newStudentsThisWeek.count,
        todaySchedules: todaySchedules.count,
      },
      quickActions: [
        { label: '学生管理', href: '/students', icon: 'Users' },
        { label: '导师管理', href: '/teachers', icon: 'UserCheck' },
        { label: '课程管理', href: '/courses', icon: 'BookOpen' },
        { label: '排课管理', href: '/schedules', icon: 'Calendar' },
        { label: '工作流管理', href: '/workflows', icon: 'Workflow' },
        { label: '系统设置', href: '/settings', icon: 'Settings' },
      ],
      recentActivities: [
        { type: 'student', message: '新学生"张三"完成入学', time: '10分钟前' },
        { type: 'schedule', message: '自动排课完成，共生成15条排课记录', time: '1小时前' },
        { type: 'course', message: '新课程"F-GD 游戏设计基础"已添加', time: '2小时前' },
      ],
    },
  });
}

// 规划顾问仪表盘数据
async function getConsultantDashboard(user: typeof users.$inferSelect) {
  // 获取签约学生数
  const [myStudentsCount] = await db.select({ count: count() })
    .from(students)
    .where(eq(students.consultantId, user.id));
  
  // 获取待处理的选课单数
  const [pendingFormsCount] = await db.select({ count: count() })
    .from(courseSelectionForms)
    .where(and(
      eq(courseSelectionForms.status, '已确认'),
      sql`student_id IN (SELECT id FROM ${students} WHERE consultant_id = ${user.id})`
    ));
  
  // 获取今日预约（时间预留）
  const [todayReservationsCount] = await db.select({ count: count() })
    .from(timeAvailabilities)
    .where(eq(timeAvailabilities.consultantId, user.id));
  
  // 获取待填时间表的学生数（示例）
  const studentsWithoutTime = myStudentsCount.count; // 简化逻辑
  
  return NextResponse.json({
    success: true,
    data: {
      role: '规划顾问',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      stats: {
        myStudents: myStudentsCount.count,
        pendingForms: pendingFormsCount.count,
        todayReservations: todayReservationsCount.count,
        studentsWithoutTime: Math.floor(studentsWithoutTime * 0.3), // 30%待填
      },
      quickActions: [
        { label: '我的学生', href: '/students?consultantId=' + user.id, icon: 'Users' },
        { label: '选课单管理', href: '/selection-forms', icon: 'FileText' },
        { label: '时间预留', href: '/availability?userId=' + user.id, icon: 'Clock' },
        { label: '排课管理', href: '/schedules', icon: 'Calendar' },
      ],
      todaySchedule: [
        { time: '10:00', student: '张三', purpose: '填写时间表', status: 'pending' },
        { time: '14:00', student: '李四', purpose: '预约上课', status: 'confirmed' },
        { time: '16:00', student: '王五', purpose: '选课指导', status: 'pending' },
      ],
      urgentTasks: [
        { type: 'form', message: '3份选课单待审批', priority: 'high' },
        { type: 'time', message: '5位学生尚未填写时间表', priority: 'medium' },
      ],
    },
  });
}

// 导师仪表盘数据
async function getTeacherDashboard(user: typeof users.$inferSelect) {
  // 获取导师信息
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, user.teacherId || ''),
  });
  
  const currentHours = teacher?.currentHours || 0;
  const maxWeeklyHours = teacher?.maxWeeklyHours || 20;
  
  // 获取今日课程数（简化）
  const todayCoursesCount = 3; // 示例数据
  
  // 获取待填上课记录数
  const [pendingRecordsCount] = await db.select({ count: count() })
    .from(classRecords)
    .where(eq(classRecords.teacherId, teacher?.id || ''));
  
  // 获取学生数
  const [studentsCount] = await db.select({ count: count() })
    .from(scheduleResults)
    .where(eq(scheduleResults.teacherId, teacher?.id || ''));
  
  return NextResponse.json({
    success: true,
    data: {
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        teacherType: teacher?.teacherType,
      },
      stats: {
        todayCourses: todayCoursesCount,
        weekHours: currentHours,
        maxWeekHours: maxWeeklyHours,
        hourPercentage: Math.round((currentHours / maxWeeklyHours) * 100),
        totalStudents: studentsCount.count,
        pendingRecords: pendingRecordsCount.count,
      },
      quickActions: [
        { label: '我的时间表', href: '/time-table/teacher', icon: 'Clock' },
        { label: '我的学生', href: '/teacher/students', icon: 'Users' },
        { label: '课程表', href: '/teacher/schedule', icon: 'Calendar' },
        { label: '上课记录', href: '/teacher/records', icon: 'FileText' },
        { label: '统计分析', href: '/teacher/analytics', icon: 'TrendingUp' },
      ],
      todayCourses: [
        { time: '10:00-12:00', student: '张三', course: 'F-GD 游戏设计基础', status: 'pending' },
        { time: '14:00-16:00', student: '李四', course: 'P-GA 游戏策划进阶', status: 'confirmed' },
        { time: '18:00-20:00', student: '王五', course: 'F-AN 游戏动画基础', status: 'pending' },
      ],
      studentProgress: [
        { name: '张三', progress: 65 },
        { name: '李四', progress: 80 },
        { name: '王五', progress: 40 },
      ],
    },
  });
}

// 学生仪表盘数据
async function getStudentDashboard(user: typeof users.$inferSelect) {
  // 获取学生信息
  const student = await db.query.students.findFirst({
    where: eq(students.id, user.studentId || ''),
  });
  
  const totalHours = student?.totalHours || 0;
  const usedHours = student?.usedHours || 0;
  
  // 获取今日课程
  const todayCoursesCount = 2; // 示例
  
  // 获取选课单数
  const [formsCount] = await db.select({ count: count() })
    .from(courseSelectionForms)
    .where(eq(courseSelectionForms.studentId, student?.id || ''));
  
  return NextResponse.json({
    success: true,
    data: {
      role: '学生',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: student?.studentId,
        major: student?.major,
        applicationCountry: student?.applicationCountry,
        currentStage: student?.currentStage,
      },
      stats: {
        todayCourses: todayCoursesCount,
        totalHours: totalHours,
        usedHours: usedHours,
        remainingHours: totalHours - usedHours,
        progressPercentage: totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0,
        selectionForms: formsCount.count,
      },
      quickActions: [
        { label: '我的时间表', href: '/time-table/student', icon: 'Clock' },
        { label: '我的课程', href: '/student/courses', icon: 'BookOpen' },
        { label: '课程表', href: '/student/schedule', icon: 'Calendar' },
        { label: '上课记录', href: '/student/records', icon: 'FileText' },
        { label: '申请进度', href: '/student/applications', icon: 'TrendingUp' },
      ],
      todayCourses: [
        { time: '10:00-12:00', course: 'F-GD 游戏设计基础', teacher: '王老师', status: 'confirmed' },
        { time: '14:00-16:00', course: 'P-GA 游戏策划进阶', teacher: '李老师', status: 'pending' },
      ],
      upcomingDeadlines: [
        { type: 'homework', message: '游戏设计作业截止', date: '明天' },
        { type: 'application', message: 'RISD 申请截止', date: '7天后' },
      ],
    },
  });
}

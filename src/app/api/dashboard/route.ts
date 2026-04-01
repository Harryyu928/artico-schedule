/**
 * 仪表盘 API - 简化版（开发模式，跳过认证）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, teachers, courses, scheduleResults, classRecords } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import type { UserRole } from '@/types/permissions';

// GET - 获取仪表盘数据
export async function GET(request: NextRequest) {
  try {
    // 从 URL 参数获取角色（开发模式）
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') || '管理员') as UserRole;
    
    // 根据角色返回不同的仪表盘数据
    switch (role) {
      case '管理员':
        return await getAdminDashboard();
      case '规划顾问':
        return await getConsultantDashboard();
      case '全职导师':
      case '兼职导师':
        return await getTeacherDashboard();
      case '学生':
        return await getStudentDashboard();
      default:
        return NextResponse.json({
          success: true,
          data: getDefaultData(role),
        });
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取仪表盘数据失败: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// 默认数据（数据库查询失败时使用）
function getDefaultData(role: UserRole) {
  return {
    role,
    user: {
      id: 'default',
      name: role === '管理员' ? '张主管' : '用户',
      email: 'admin@artico.com',
    },
    stats: {
      students: 0,
      teachers: 0,
      courses: 0,
      schedules: 0,
    },
    quickActions: [
      { label: '学生管理', href: '/students', icon: 'Users' },
      { label: '导师管理', href: '/teachers', icon: 'GraduationCap' },
    ],
  };
}

// 管理员仪表盘
async function getAdminDashboard() {
  let studentCount = 0;
  let teacherCount = 0;
  let courseCount = 0;
  let scheduleCount = 0;
  let classRecordCount = 0;
  
  try {
    // 尝试查询各表数量
    const studentResult = await db.select({ count: count() }).from(students);
    studentCount = studentResult[0]?.count || 0;
  } catch (e) {
    console.log('students table not ready');
  }
  
  try {
    const teacherResult = await db.select({ count: count() }).from(teachers);
    teacherCount = teacherResult[0]?.count || 0;
  } catch (e) {
    console.log('teachers table not ready');
  }
  
  try {
    const courseResult = await db.select({ count: count() }).from(courses);
    courseCount = courseResult[0]?.count || 0;
  } catch (e) {
    console.log('courses table not ready');
  }
  
  try {
    const scheduleResult = await db.select({ count: count() }).from(scheduleResults);
    scheduleCount = scheduleResult[0]?.count || 0;
  } catch (e) {
    console.log('schedule_results table not ready');
  }
  
  try {
    const classRecordResult = await db.select({ count: count() }).from(classRecords);
    classRecordCount = classRecordResult[0]?.count || 0;
  } catch (e) {
    console.log('class_records table not ready');
  }
  
  return NextResponse.json({
    success: true,
    data: {
      role: '管理员',
      user: {
        id: 'admin',
        name: '张主管',
        email: 'admin@artico.com',
      },
      stats: {
        students: studentCount,
        teachers: teacherCount,
        courses: courseCount,
        schedules: scheduleCount,
        classRecords: classRecordCount,
      },
      quickActions: [
        { label: '学生管理', href: '/students', icon: 'Users' },
        { label: '导师管理', href: '/teachers', icon: 'GraduationCap' },
        { label: '课程管理', href: '/courses', icon: 'BookOpen' },
        { label: '排课管理', href: '/schedule', icon: 'Calendar' },
      ],
    },
  });
}

// 规划顾问仪表盘
async function getConsultantDashboard() {
  return NextResponse.json({
    success: true,
    data: {
      role: '规划顾问',
      user: {
        id: 'consultant',
        name: '李顾问',
        email: 'consultant@artico.com',
      },
      stats: {},
      quickActions: [],
    },
  });
}

// 导师仪表盘
async function getTeacherDashboard() {
  return NextResponse.json({
    success: true,
    data: {
      role: '全职导师',
      user: {
        id: 'teacher',
        name: '王导师',
        email: 'teacher@artico.com',
      },
      stats: {},
      quickActions: [],
    },
  });
}

// 学生仪表盘
async function getStudentDashboard() {
  return NextResponse.json({
    success: true,
    data: {
      role: '学生',
      user: {
        id: 'student',
        name: '孙同学',
        email: 'student@artico.com',
      },
      stats: {},
      quickActions: [],
    },
  });
}

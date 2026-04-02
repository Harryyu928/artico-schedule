/**
 * 仪表盘 API - 简化版（开发模式）
 * 即使数据库连接失败也能返回默认数据
 */

import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types/permissions';

// GET - 获取仪表盘数据
export async function GET(request: NextRequest) {
  try {
    // 从 URL 参数获取角色（开发模式）
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') || '管理员') as UserRole;
    
    // 尝试获取真实数据，失败则返回默认数据
    const data = await getDashboardData(role);
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    // 即使出错也返回默认数据，不让页面崩溃
    return NextResponse.json({
      success: true,
      data: getDefaultData('管理员'),
    });
  }
}

// 获取仪表盘数据
async function getDashboardData(role: UserRole) {
  // 默认数据
  const defaultData = getDefaultData(role);
  
  // 尝试从数据库获取真实数据
  try {
    const { db } = await import('@/db');
    const { students, teachers, courses, scheduleResults, classRecords } = await import('@/db/schema');
    const { count } = await import('drizzle-orm');
    
    // 并行查询各表数量
    const [studentResult, teacherResult, courseResult, scheduleResult, classRecordResult] = await Promise.allSettled([
      db.select({ count: count() }).from(students),
      db.select({ count: count() }).from(teachers),
      db.select({ count: count() }).from(courses),
      db.select({ count: count() }).from(scheduleResults),
      db.select({ count: count() }).from(classRecords),
    ]);
    
    const getValue = (result: PromiseSettledResult<any[]>) => {
      if (result.status === 'fulfilled') {
        return result.value[0]?.count || 0;
      }
      return 0;
    };
    
    return {
      ...defaultData,
      stats: {
        students: getValue(studentResult),
        teachers: getValue(teacherResult),
        courses: getValue(courseResult),
        schedules: getValue(scheduleResult),
        classRecords: getValue(classRecordResult),
      },
    };
  } catch (error) {
    console.log('数据库查询失败，使用默认数据:', error);
    return defaultData;
  }
}

// 默认数据
function getDefaultData(role: UserRole) {
  const roleNames: Record<string, string> = {
    '管理员': '张主管',
    '规划顾问': '李顾问',
    '全职导师': '王导师',
    '兼职导师': '赵导师',
    '学生': '孙同学',
  };
  
  return {
    role,
    user: {
      id: 'default',
      name: roleNames[role] || '用户',
      email: 'admin@artico.com',
    },
    stats: {
      students: 0,
      teachers: 0,
      courses: 0,
      schedules: 0,
      classRecords: 0,
    },
    quickActions: [
      { label: '学生管理', href: '/students', icon: 'Users' },
      { label: '导师管理', href: '/teachers', icon: 'GraduationCap' },
      { label: '课程管理', href: '/courses', icon: 'BookOpen' },
      { label: '排课管理', href: '/schedule', icon: 'Calendar' },
    ],
    recentActivities: [
      { type: 'info', message: '系统已启动，欢迎使用', time: '刚刚' },
    ],
  };
}

/**
 * 时间表管理页面（管理员/规划顾问）
 * 
 * 查看所有学生/导师的时间表
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TimeTableManager } from './time-table-manager';

export default async function TimeTableManagePage() {
  // 获取当前登录用户
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;
  
  // 未登录重定向到首页
  if (!userId) {
    redirect('/');
  }
  
  // 非管理员/规划顾问重定向
  if (userRole !== '管理员' && userRole !== '规划顾问') {
    redirect('/time-table/student');
  }
  
  return <TimeTableManager />;
}

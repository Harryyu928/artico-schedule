'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Statistics {
  total_students: number;
  total_teachers: number;
  total_courses: number;
  scheduled_courses: number;
  pending_schedules: number;
  this_week_hours: number;
}

export default function DashboardContent() {
  const [stats, setStats] = useState<Statistics>({
    total_students: 0,
    total_teachers: 0,
    total_courses: 0,
    scheduled_courses: 0,
    pending_schedules: 0,
    this_week_hours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  async function fetchStatistics() {
    try {
      const response = await fetch('/api/statistics');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoSchedule() {
    if (!confirm('确定要执行自动排课吗？这将根据学生和导师的可用时间自动创建课程安排。')) {
      return;
    }

    setScheduling(true);
    try {
      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_rule: 'remaining_hours' }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`排课完成！\n成功：${result.scheduled_count} 节\n失败：${result.failed_count} 节`);
        fetchStatistics();
      } else {
        alert('排课失败，请稍后重试');
      }
    } catch (error) {
      console.error('自动排课失败:', error);
      alert('排课失败，请稍后重试');
    } finally {
      setScheduling(false);
    }
  }

  const statCards = [
    {
      name: '学生总数',
      value: stats.total_students,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      name: '导师总数',
      value: stats.total_teachers,
      icon: GraduationCap,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      name: '课程总数',
      value: stats.total_courses,
      icon: BookOpen,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      name: '已排课程',
      value: stats.scheduled_courses,
      icon: Calendar,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            仪表盘
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ARTDiCO 自动排课系统概览
          </p>
        </div>
        <Button
          onClick={handleAutoSchedule}
          disabled={scheduling}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {scheduling ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              排课中...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              一键排课
            </>
          )}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className={cn("text-2xl font-bold mt-1", stat.textColor)}>
                    {loading ? '-' : stat.value}
                  </p>
                </div>
                <div className={cn("p-3 rounded-full", stat.color)}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 待处理事项 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              待处理事项
            </CardTitle>
            <CardDescription>
              需要您关注和处理的事项
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    待确认课程安排
                  </span>
                </div>
                <Badge variant="secondary">{stats.pending_schedules}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    本周课时安排
                  </span>
                </div>
                <Badge variant="secondary">{stats.this_week_hours} 小时</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>
              当前系统运行状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  飞书集成
                </span>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  未连接
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  数据库连接
                </span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  正常
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  排课引擎
                </span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  就绪
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速入口 */}
      <Card>
        <CardHeader>
          <CardTitle>快速入口</CardTitle>
          <CardDescription>
            常用功能快速访问
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/students">
                <Users className="w-6 h-6" />
                <span className="text-xs">添加学生</span>
              </a>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/teachers">
                <GraduationCap className="w-6 h-6" />
                <span className="text-xs">添加导师</span>
              </a>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/courses">
                <BookOpen className="w-6 h-6" />
                <span className="text-xs">添加课程</span>
              </a>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/schedules">
                <Calendar className="w-6 h-6" />
                <span className="text-xs">查看排课</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 辅助函数
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

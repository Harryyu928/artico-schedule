'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles
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

  const statCards = [
    {
      name: '学生总数',
      value: stats.total_students,
      icon: Users,
      gradient: 'from-orange-500 to-amber-500',
      link: '/students',
      description: '在校学生数量',
    },
    {
      name: '导师总数',
      value: stats.total_teachers,
      icon: GraduationCap,
      gradient: 'from-amber-500 to-yellow-500',
      link: '/teachers',
      description: '在职导师数量',
    },
    {
      name: '课程总数',
      value: stats.total_courses,
      icon: BookOpen,
      gradient: 'from-orange-400 to-orange-600',
      link: '/courses',
      description: '课程库总数',
    },
    {
      name: '本周课时',
      value: stats.this_week_hours,
      icon: Clock,
      gradient: 'from-yellow-400 to-orange-500',
      link: '/schedules',
      description: '本周已排课时',
    },
  ];

  const quickActions = [
    {
      title: '学生管理',
      description: '添加或管理学生信息',
      icon: Users,
      link: '/students',
      color: 'text-orange-600',
    },
    {
      title: '课程管理',
      description: '管理课程库和课程信息',
      icon: BookOpen,
      link: '/courses',
      color: 'text-amber-600',
    },
    {
      title: '自动排课',
      description: '智能排课系统',
      icon: Sparkles,
      link: '/schedules',
      color: 'text-yellow-600',
    },
    {
      title: '时间设置',
      description: '设置可用时间段',
      icon: Clock,
      link: '/availability',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 欢迎横幅 */}
      <div className="gradient-orange rounded-2xl p-8 text-white shadow-orange-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              欢迎使用 ARTiCO 教务管理系统
            </h1>
            <p className="text-white/90 text-lg mb-6">
              智能化的教务管理解决方案，让排课更简单高效
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/students">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg font-semibold">
                  <Users className="mr-2 h-5 w-5" />
                  开始管理
                </Button>
              </Link>
              <Link href="/schedules">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-semibold">
                  <Calendar className="mr-2 h-5 w-5" />
                  查看排课
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-64 h-48 bg-white/10 rounded-xl backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{stats.this_week_hours}</div>
                <div className="text-white/80">本周课时</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.link}>
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">
                      {loading ? (
                        <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        stat.value
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{stat.name}</div>
                    <div className="text-xs text-gray-400">{stat.description}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">快捷操作</h2>
            <p className="text-gray-500 mt-1">常用功能快速入口</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.link}>
                <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                          {action.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 系统状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              系统概览
            </CardTitle>
            <CardDescription>当前系统运行状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">系统状态</span>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  运行正常
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">待确认排课</span>
                </div>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  {stats.pending_schedules} 节
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">已排课程</span>
                </div>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  {stats.scheduled_courses} 门
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              系统特性
            </CardTitle>
            <CardDescription>ARTiCO 教务管理系统的核心功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-1 rounded bg-orange-100">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">智能排课</div>
                  <div className="text-xs text-gray-500">基于学生和导师时间自动匹配排课</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-1 rounded bg-orange-100">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">选课单管理</div>
                  <div className="text-xs text-gray-500">完整的选课单创建和进度追踪</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-1 rounded bg-orange-100">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">多渠道通知</div>
                  <div className="text-xs text-gray-500">飞书、微信、邮件多渠道消息推送</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

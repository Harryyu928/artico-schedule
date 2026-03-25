/**
 * 规划顾问仪表盘组件
 * 
 * 展示顾问的学生管理数据：
 * - 签约学生统计
 * - 学生上课情况
 * - 选课单处理
 * - 时间预留管理
 * - 预警提醒
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  BookOpen,
  UserCheck,
  RefreshCw,
  ChevronRight,
  Bell,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type ConsultantDashboardData = {
  role: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  overview: {
    myStudents: number;
    pendingForms: number;
    todaySchedules: number;
    weekSchedules: number;
    lowHourCount: number;
    inactiveCount?: number;
    weekClassRecords?: number;
  };
  studentAnalytics: {
    stageDistribution: Record<string, number>;
    lowHourStudents: Array<{
      id: string;
      name: string;
      remaining: number;
      major?: string;
      stage?: string;
    }>;
  };
  pendingFormsList: Array<{
    id: string;
    formId: string;
    status: string;
    studentName?: string;
    createdAt?: string;
  }>;
  todaySchedule: Array<{
    id: string;
    time: string;
    status: string;
    studentName?: string;
    courseName?: string;
    type?: string;
  }>;
  studentClassRecords?: Array<{
    studentId: string;
    studentName: string;
    weekRecords: number;
    monthRecords: number;
    lastClassDate?: string;
  }>;
  urgentTasks: Array<{
    type: string;
    message: string;
    priority: string;
    action?: string;
  }>;
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fff7ed'];

export function ConsultantDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConsultantDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('获取数据失败');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || '加载数据失败'}</p>
          <Button onClick={fetchDashboardData} className="mt-4 bg-orange-500 hover:bg-orange-600">
            重试
          </Button>
        </div>
      </div>
    );
  }

  const { overview, studentAnalytics, pendingFormsList, todaySchedule, studentClassRecords, urgentTasks, quickActions } = data;

  // 阶段分布数据
  const stageData = Object.entries(studentAnalytics.stageDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">规划顾问工作台</h1>
            <p className="text-white/90">
              管理着 <span className="font-bold text-2xl">{overview.myStudents}</span> 位学生
              {overview.pendingForms > 0 && (
                <span className="ml-4 text-yellow-200">
                  · {overview.pendingForms} 份选课单待处理
                </span>
              )}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchDashboardData}
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="我的学生"
          value={overview.myStudents}
          icon={Users}
          color="orange"
          href="/students"
        />
        <MetricCard
          title="待处理选课单"
          value={overview.pendingForms}
          icon={FileText}
          color={overview.pendingForms > 0 ? 'red' : 'green'}
          href="/selection-forms?status=pending"
          alert={overview.pendingForms > 0}
        />
        <MetricCard
          title="今日预约"
          value={overview.todaySchedules}
          icon={Calendar}
          color="amber"
          href="/schedules?filter=today"
        />
        <MetricCard
          title="本周上课"
          value={overview.weekSchedules}
          icon={BookOpen}
          subtitle="学生排课"
          color="blue"
        />
        <MetricCard
          title="低课时预警"
          value={overview.lowHourCount}
          icon={AlertTriangle}
          color={overview.lowHourCount > 0 ? 'red' : 'green'}
          href="/students?filter=lowHours"
          alert={overview.lowHourCount > 0}
        />
      </div>

      {/* 紧急任务 */}
      {urgentTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Bell className="w-5 h-5" />
              待处理事项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.map((task, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    task.priority === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm">{task.message}</span>
                  </div>
                  {task.action && (
                    <Link href={task.action}>
                      <Button size="sm" variant="outline" className={
                        task.priority === 'high' 
                          ? 'border-red-300 text-red-600 hover:bg-red-50' 
                          : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                      }>
                        去处理 <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 今日日程 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              今日日程
            </span>
            <Badge variant="outline" className="border-orange-300 text-orange-600">
              {todaySchedule.length} 项
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaySchedule.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-lg border-2 ${
                    item.status === 'confirmed' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-orange-500">{item.time}</Badge>
                    <Badge variant="outline" className={
                      item.status === 'confirmed' 
                        ? 'border-green-300 text-green-600' 
                        : 'border-yellow-300 text-yellow-600'
                    }>
                      {item.status === 'confirmed' ? '已确认' : '待确认'}
                    </Badge>
                  </div>
                  <div className="font-medium">{item.studentName || '学生'}</div>
                  <div className="text-sm text-gray-500">
                    {item.type === 'reservation' ? '时间预留' : item.courseName || '课程'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>今日暂无日程安排</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 多维度分析 */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="students" className="py-3">
            <Users className="w-4 h-4 mr-2" />
            学生分析
          </TabsTrigger>
          <TabsTrigger value="forms" className="py-3">
            <FileText className="w-4 h-4 mr-2" />
            选课单
          </TabsTrigger>
          <TabsTrigger value="classes" className="py-3">
            <BookOpen className="w-4 h-4 mr-2" />
            上课情况
          </TabsTrigger>
        </TabsList>

        {/* 学生分析 */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 阶段分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  学生阶段分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stageData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 低课时学生 */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  低课时学生
                </CardTitle>
                <CardDescription>
                  剩余课时不足10小时，需跟进续费
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentAnalytics.lowHourStudents.length > 0 ? (
                  <div className="space-y-2">
                    {studentAnalytics.lowHourStudents.map((student) => (
                      <Link key={student.id} href={`/students/${student.id}`}>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-gray-500">
                              {student.major} · {student.stage}
                            </div>
                          </div>
                          <Badge className={student.remaining <= 0 ? 'bg-red-500' : 'bg-orange-500'}>
                            剩余 {student.remaining}h
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>暂无低课时预警</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 选课单 */}
        <TabsContent value="forms" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>待处理选课单</span>
                <Link href="/selection-forms">
                  <Button variant="outline" size="sm">
                    查看全部 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingFormsList.length > 0 ? (
                <div className="space-y-2">
                  {pendingFormsList.map((form) => (
                    <Link key={form.id} href={`/selection-forms/${form.id}`}>
                      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-white font-bold">
                            {form.formId?.slice(-2) || '表'}
                          </div>
                          <div>
                            <div className="font-medium">{form.studentName || '学生选课单'}</div>
                            <div className="text-sm text-gray-500">
                              {form.formId} · {form.createdAt || ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-yellow-300 text-yellow-600">
                            {form.status}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>暂无待处理选课单</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 上课情况 */}
        <TabsContent value="classes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{overview.weekSchedules}</div>
                  <div className="text-sm text-gray-500">本周排课</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{overview.weekClassRecords || 0}</div>
                  <div className="text-sm text-gray-500">本周已上课</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{overview.inactiveCount || 0}</div>
                  <div className="text-sm text-gray-500">超14天未上课</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 学生上课情况列表 */}
          <Card>
            <CardHeader>
              <CardTitle>学生上课情况</CardTitle>
              <CardDescription>
                您负责的学生近期的上课记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentClassRecords && studentClassRecords.length > 0 ? (
                <div className="space-y-3">
                  {studentClassRecords.map((student) => (
                    <div 
                      key={student.studentId} 
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        student.weekRecords === 0 && student.monthRecords === 0
                          ? 'bg-red-50 border border-red-200'
                          : student.weekRecords === 0
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-green-50 border border-green-200'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{student.studentName}</div>
                        <div className="text-sm text-gray-500">
                          上次上课: {student.lastClassDate || '暂无记录'}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">{student.weekRecords}</div>
                          <div className="text-xs text-gray-500">本周</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{student.monthRecords}</div>
                          <div className="text-xs text-gray-500">本月</div>
                        </div>
                        <Link href={`/students/${student.studentId}`}>
                          <Button size="sm" variant="outline">
                            详情
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">暂无学生上课数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="outline" className="w-full h-14 flex-col gap-1 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50">
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 指标卡片组件
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  color = 'orange',
  href,
  alert,
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  color?: string;
  href?: string;
  alert?: boolean;
}) {
  const bgColors: Record<string, string> = {
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  };

  const content = (
    <>
      <div className={`w-10 h-10 rounded-lg ${bgColors[color]} flex items-center justify-center mb-2 ${alert ? 'animate-pulse' : ''}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card className="group hover:shadow-lg transition-all cursor-pointer h-full">
          <CardContent className="p-4">
            {content}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}

export default ConsultantDashboard;

/**
 * 运营仪表盘组件
 * 
 * 从运营角度出发，提供多维度数据分析
 */

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
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  DollarSign,
  UserCheck,
  UserX,
  RefreshCw,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

type AdminDashboardData = {
  role: string;
  user: { id: string; name: string; email?: string };
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalCourses: number;
    totalSchedules: number;
    totalClassRecords: number;
    newStudentsThisWeek: number;
    newStudentsThisMonth: number;
    todaySchedules: number;
  };
  studentAnalytics: {
    stageDistribution: Record<string, number>;
    majorDistribution: Record<string, number>;
    countryDistribution: Record<string, number>;
    lowHourCount: number;
    exhaustedCount: number;
    lowHourStudents: Array<{ id: string; name: string; remaining: number }>;
    exhaustedStudents: Array<{ id: string; name: string }>;
  };
  teacherAnalytics: {
    typeDistribution: Record<string, number>;
    highLoadCount: number;
    lowLoadCount: number;
    highLoadTeachers: Array<{
      id: string;
      name: string;
      type: string;
      currentHours: number;
      maxHours: number;
      utilization: number;
    }>;
    lowLoadTeachers: Array<{
      id: string;
      name: string;
      type: string;
      currentHours: number;
      maxHours: number;
      utilization: number;
    }>;
    averageUtilization: number;
  };
  courseAnalytics: {
    topCourses: Array<{ id: string; name: string; category: string; scheduleCount: number }>;
  };
  scheduleAnalytics: {
    timeSlotDistribution: Record<string, number>;
    weekDayDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
  };
  financial: {
    totalHours: number;
    usedHours: number;
    remainingHours: number;
    utilizationRate: number;
  };
  alerts: {
    pendingForms: number;
    pendingRecords: number;
    lowHourStudents: number;
    exhaustedStudents: number;
    inactiveStudents: number;
  };
  trends: {
    studentGrowth: Array<{ date: string; count: number }>;
    scheduleGrowth: Array<{ date: string; count: number }>;
  };
  recentActivities: Array<{ type: string; message: string; time: string }>;
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fff7ed', '#ea580c', '#c2410c'];
const STATUS_COLORS: Record<string, string> = {
  '已确认': '#22c55e',
  '待确认': '#f59e0b',
  '已完成': '#3b82f6',
  '取消': '#ef4444',
};

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardData | null>(null);
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

  // 转换数据格式用于图表
  const stageData = Object.entries(data.studentAnalytics.stageDistribution).map(([name, value]) => ({ name, value }));
  const majorData = Object.entries(data.studentAnalytics.majorDistribution).map(([name, value]) => ({ name, value }));
  const countryData = Object.entries(data.studentAnalytics.countryDistribution).map(([name, value]) => ({ name, value }));
  const timeSlotData = Object.entries(data.scheduleAnalytics.timeSlotDistribution).map(([name, value]) => ({ name, value }));
  const weekDayData = Object.entries(data.scheduleAnalytics.weekDayDistribution).map(([name, value]) => ({ name, value }));
  const teacherTypeData = Object.entries(data.teacherAnalytics.typeDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">运营数据看板</h1>
            <p className="text-white/90 text-sm sm:text-base">全局概览 · 多维分析 · 智能预警</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchDashboardData}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">刷新数据</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        <MetricCard
          title="学生总数"
          value={data.overview.totalStudents}
          icon={Users}
          trend={data.overview.newStudentsThisWeek > 0 ? `+${data.overview.newStudentsThisWeek}/周` : undefined}
          href="/students"
          color="orange"
        />
        <MetricCard
          title="导师总数"
          value={data.overview.totalTeachers}
          icon={GraduationCap}
          href="/teachers"
          color="amber"
        />
        <MetricCard
          title="课程总数"
          value={data.overview.totalCourses}
          icon={BookOpen}
          href="/courses"
          color="yellow"
        />
        <MetricCard
          title="总排课数"
          value={data.overview.totalSchedules}
          icon={Calendar}
          href="/schedules"
          color="red"
        />
        <MetricCard
          title="本周新增"
          value={data.overview.newStudentsThisWeek}
          icon={TrendingUp}
          trend="学生"
          href="/students"
          color="green"
        />
        <MetricCard
          title="本月新增"
          value={data.overview.newStudentsThisMonth}
          icon={Activity}
          trend="学生"
          href="/students"
          color="blue"
        />
        <MetricCard
          title="今日排课"
          value={data.overview.todaySchedules}
          icon={Clock}
          href="/schedules"
          color="purple"
        />
        <MetricCard
          title="上课记录"
          value={data.overview.totalClassRecords}
          icon={FileText}
          href="/records"
          color="pink"
        />
      </div>

      {/* 预警指标 */}
      {(data.alerts.pendingForms > 0 || data.alerts.lowHourStudents > 0 || data.alerts.exhaustedStudents > 0) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              预警提示
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {data.alerts.exhaustedStudents > 0 && (
                <Link href="/students?filter=exhausted">
                  <Badge className="bg-red-500 hover:bg-red-600 text-white px-3 py-1">
                    <UserX className="w-3 h-3 mr-1" />
                    {data.alerts.exhaustedStudents} 位学生课时耗尽
                  </Badge>
                </Link>
              )}
              {data.alerts.lowHourStudents > 0 && (
                <Link href="/students?filter=lowHours">
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {data.alerts.lowHourStudents} 位学生课时不足
                  </Badge>
                </Link>
              )}
              {data.alerts.pendingForms > 0 && (
                <Link href="/selection-forms?status=pending">
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1">
                    <FileText className="w-3 h-3 mr-1" />
                    {data.alerts.pendingForms} 份选课单待处理
                  </Badge>
                </Link>
              )}
              {data.alerts.pendingRecords > 0 && (
                <Link href="/records?status=pending">
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1">
                    <FileText className="w-3 h-3 mr-1" />
                    {data.alerts.pendingRecords} 条上课记录待填写
                  </Badge>
                </Link>
              )}
              {data.alerts.inactiveStudents > 0 && (
                <Link href="/students?filter=inactive">
                  <Badge className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {data.alerts.inactiveStudents} 位学生超过14天未上课
                  </Badge>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              学生增长趋势（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f97316' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 3 }}
                    name="新增学生"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              排课趋势（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.scheduleGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f97316' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#fb923c" 
                    strokeWidth={2}
                    dot={{ fill: '#fb923c', r: 3 }}
                    name="新增排课"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 多维度分析 */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="students" className="py-3">
            <Users className="w-4 h-4 mr-2" />
            学生分析
          </TabsTrigger>
          <TabsTrigger value="teachers" className="py-3">
            <GraduationCap className="w-4 h-4 mr-2" />
            导师分析
          </TabsTrigger>
          <TabsTrigger value="courses" className="py-3">
            <BookOpen className="w-4 h-4 mr-2" />
            课程分析
          </TabsTrigger>
          <TabsTrigger value="financial" className="py-3">
            <DollarSign className="w-4 h-4 mr-2" />
            财务概览
          </TabsTrigger>
        </TabsList>

        {/* 学生分析 */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 阶段分布 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">学习阶段分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={stageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stageData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {stageData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 专业分布 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">专业方向分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={majorData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 申请国家分布 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">申请国家分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={countryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {countryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 课时预警学生 */}
          {(data.studentAnalytics.lowHourStudents.length > 0 || data.studentAnalytics.exhaustedStudents.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    低课时学生（剩余&lt;10课时）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.studentAnalytics.lowHourStudents.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                        <Link href={`/students/${s.id}`} className="font-medium hover:text-orange-600">
                          {s.name}
                        </Link>
                        <Badge variant="outline" className="border-orange-300 text-orange-600">
                          剩余 {s.remaining} 课时
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-500" />
                    课时耗尽学生
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.studentAnalytics.exhaustedStudents.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <Link href={`/students/${s.id}`} className="font-medium hover:text-red-600">
                          {s.name}
                        </Link>
                        <Badge className="bg-red-500">需续费</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 导师分析 */}
        <TabsContent value="teachers" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 类型分布 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">导师类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={teacherTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {teacherTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 高负荷导师 */}
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-500" />
                  高负荷导师（&gt;80%）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.teacherAnalytics.highLoadTeachers.length > 0 ? (
                    data.teacherAnalytics.highLoadTeachers.map(t => (
                      <div key={t.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.name}</span>
                          <span className="text-red-600">{t.utilization}%</span>
                        </div>
                        <Progress value={t.utilization} className="h-2 bg-red-100 [&>div]:bg-red-500" />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无高负荷导师</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 低负荷导师 */}
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  低负荷导师（&lt;30%）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.teacherAnalytics.lowLoadTeachers.length > 0 ? (
                    data.teacherAnalytics.lowLoadTeachers.map(t => (
                      <div key={t.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.name}</span>
                          <span className="text-green-600">{t.utilization}%</span>
                        </div>
                        <Progress value={t.utilization} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无低负荷导师</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 平均利用率 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">导师课时利用率概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600">
                    {data.teacherAnalytics.averageUtilization}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">平均利用率</div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {data.teacherAnalytics.highLoadCount}
                    </div>
                    <div className="text-xs text-gray-500">高负荷</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {data.teacherAnalytics.lowLoadCount}
                    </div>
                    <div className="text-xs text-gray-500">低负荷</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 课程分析 */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 热门课程 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  热门课程排行
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.courseAnalytics.topCourses.length > 0 ? (
                    data.courseAnalytics.topCourses.map((course, index) => (
                      <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{course.name}</div>
                          <div className="text-xs text-gray-500">{course.category}</div>
                        </div>
                        <Badge variant="outline" className="border-orange-300 text-orange-600">
                          {course.scheduleCount} 次排课
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无课程数据</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 时段分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  排课时段分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSlotData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 周几分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                排课周分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#fb923c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 财务概览 */}
        <TabsContent value="financial" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">总课时</div>
                    <div className="text-2xl font-bold text-orange-600">{data.financial.totalHours}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">已消耗课时</div>
                    <div className="text-2xl font-bold text-blue-600">{data.financial.usedHours}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">剩余课时</div>
                    <div className="text-2xl font-bold text-green-600">{data.financial.remainingHours}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">消耗率</div>
                    <div className="text-2xl font-bold text-purple-600">{data.financial.utilizationRate}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 课时消耗进度 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-500" />
                课时消耗概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">课时消耗进度</span>
                    <span className="text-sm text-gray-500">
                      {data.financial.usedHours} / {data.financial.totalHours} 课时
                    </span>
                  </div>
                  <Progress 
                    value={data.financial.utilizationRate} 
                    className="h-4"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {data.overview.totalStudents}
                    </div>
                    <div className="text-xs text-gray-500">在学学生</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(data.financial.usedHours / Math.max(data.overview.totalStudents, 1))}
                    </div>
                    <div className="text-xs text-gray-500">人均消耗课时</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(data.financial.remainingHours / Math.max(data.overview.totalStudents, 1))}
                    </div>
                    <div className="text-xs text-gray-500">人均剩余课时</div>
                  </div>
                </div>
              </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {data.quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="outline" className="w-full h-16 flex-col gap-1 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50">
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
  trend, 
  href,
  color = 'orange'
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  href?: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: 'from-orange-500 to-amber-500',
    amber: 'from-amber-500 to-yellow-500',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-orange-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };

  const content = (
    <>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-1.5 sm:mb-2`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{title}</div>
      {trend && (
        <Badge variant="outline" className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs border-orange-300 text-orange-600">
          {trend}
        </Badge>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card className="group hover:shadow-lg transition-all cursor-pointer h-full">
          <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
            {content}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
        {content}
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;

/**
 * 导师仪表盘组件
 * 
 * 展示导师的个人上课数据：
 * - 课程安排统计
 * - 学生进度跟踪
 * - 待填上课记录
 * - 课时利用率分析
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Calendar,
  Clock,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  BookOpen,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Play,
  CalendarSync,
  ExternalLink,
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
  LineChart,
  Line,
} from 'recharts';
import { QuickActions, QuickAction } from './quick-actions';

type TeacherDashboardData = {
  role: string;
  user: {
    id: string;
    name: string;
    email?: string;
    teacherType?: string;
  };
  overview: {
    todayCourses: number;
    weekCourses: number;
    weekHours: number;
    maxWeekHours: number;
    hourPercentage: number;
    totalStudents: number;
    pendingRecords: number;
    monthCourses?: number;
    monthHours?: number;
  };
  todayCourses: Array<{
    id: string;
    time: string;
    status: string;
    hours: number;
    studentName?: string;
    courseName?: string;
  }>;
  weekSchedule: Array<{
    id: string;
    date: string;
    weekDay: string;
    time: string;
    status: string;
    studentName?: string;
    courseName?: string;
  }>;
  studentProgress: Array<{
    id: string;
    name: string;
    progress: number;
    remaining: number;
    totalHours: number;
    usedHours: number;
    major?: string;
    stage?: string;
  }>;
  pendingRecords: Array<{
    id: string;
    date: string;
    studentName?: string;
    courseName?: string;
  }>;
  recentClassRecords?: Array<{
    id: string;
    date: string;
    studentName?: string;
    courseName?: string;
    contentSummary?: string;
  }>;
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

const WEEK_DAY_MAP: Record<string, number> = {
  '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0,
};

const TIME_SLOT_ORDER = ['10:00', '13:00', '15:00', '18:00', '20:00'];

export function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncedAt: string | null;
    totalCourses: number;
    syncedCourses: number;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSyncStatus();
  }, []);

  async function fetchSyncStatus() {
    try {
      const response = await fetch('/api/calendar-sync', {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSyncStatus(result.data);
        }
      }
    } catch (err) {
      console.error('获取同步状态失败:', err);
    }
  }

  async function syncCalendar() {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      
      if (result.success) {
        // 显示成功提示
        alert(`日历同步成功！\n同步课程: ${result.data?.coursesSynced || 0} 节`);
        fetchSyncStatus();
      } else {
        alert(`同步失败: ${result.message || result.error}`);
      }
    } catch (err) {
      console.error('日历同步失败:', err);
      alert('日历同步失败，请稍后重试');
    } finally {
      setSyncing(false);
    }
  }

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 先同步后端 cookie（确保当前角色正确）
      const currentRole = localStorage.getItem('user_role');
      if (currentRole) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', role: currentRole }),
          credentials: 'include',
        });
      }
      
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

  const { overview, todayCourses, weekSchedule, studentProgress, pendingRecords, quickActions } = data;

  // 按时段统计
  const timeSlotStats = TIME_SLOT_ORDER.map(slot => ({
    name: slot,
    count: weekSchedule.filter(s => s.time === slot).length,
  }));

  // 按周几统计
  const weekDayStats = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => ({
    name: day,
    count: weekSchedule.filter(s => s.weekDay === day).length,
  }));

  // 今日课程按时间排序
  const sortedTodayCourses = [...todayCourses].sort((a, b) => 
    TIME_SLOT_ORDER.indexOf(a.time) - TIME_SLOT_ORDER.indexOf(b.time)
  );

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">导师工作台</h1>
            <p className="text-white/90 text-sm sm:text-base">
              今日有 <span className="font-bold text-xl sm:text-2xl">{overview.todayCourses}</span> 节课程
              {overview.pendingRecords > 0 && (
                <span className="ml-2 sm:ml-4 text-yellow-200">
                  · {overview.pendingRecords} 条记录待填写
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={syncCalendar}
              disabled={syncing}
              className="text-white hover:bg-white/10"
              title="同步到飞书日历"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
              ) : (
                <CalendarSync className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{syncing ? '同步中...' : '同步日历'}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchDashboardData}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">刷新</span>
            </Button>
          </div>
        </div>
        {/* 同步状态提示 */}
        {syncStatus && syncStatus.lastSyncedAt && (
          <div className="mt-3 text-sm text-white/70 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            上次同步: {new Date(syncStatus.lastSyncedAt).toLocaleString('zh-CN')}
            <span className="text-white/50">
              ({syncStatus.syncedCourses}/{syncStatus.totalCourses} 课程已同步)
            </span>
          </div>
        )}
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="今日课程"
          value={overview.todayCourses}
          icon={Calendar}
          color="orange"
          href="/schedules?filter=today"
        />
        <MetricCard
          title="本周课程"
          value={overview.weekCourses}
          icon={BookOpen}
          subtitle={`${overview.weekHours}课时`}
          color="amber"
          href="/schedules?filter=week"
        />
        <MetricCard
          title="课时利用"
          value={`${overview.hourPercentage}%`}
          icon={BarChart3}
          subtitle={`${overview.weekHours}/${overview.maxWeekHours}h`}
          color={overview.hourPercentage > 80 ? 'red' : overview.hourPercentage > 50 ? 'yellow' : 'green'}
          progress={overview.hourPercentage}
        />
        <MetricCard
          title="待填记录"
          value={overview.pendingRecords}
          icon={FileText}
          color={overview.pendingRecords > 0 ? 'red' : 'green'}
          href="/records?status=pending"
          alert={overview.pendingRecords > 0}
        />
      </div>

      {/* 预警提示 */}
      {overview.pendingRecords > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">
                  有 <strong>{overview.pendingRecords}</strong> 条上课记录待填写，请及时完成
                </span>
              </div>
              <Link href="/records?status=pending">
                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
                  去填写 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 今日课程详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5 text-orange-500" />
              今日课程安排
            </span>
            <Badge variant="outline" className="border-orange-300 text-orange-600">
              {overview.todayCourses} 节
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTodayCourses.length > 0 ? (
            <div className="space-y-3">
              {sortedTodayCourses.map((course) => (
                <div 
                  key={course.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    course.status === '已确认' 
                      ? 'bg-orange-50 border-orange-200' 
                      : course.status === '已完成'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      course.status === '已完成' ? 'bg-green-500' : 'bg-orange-500'
                    } text-white`}>
                      <div className="text-center">
                        <div className="text-lg font-bold">{course.time}</div>
                        <div className="text-xs opacity-80">{course.hours}h</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{course.studentName || '学生'}</div>
                      <div className="text-sm text-gray-500">{course.courseName || '课程'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      course.status === '已确认' ? 'bg-green-100 text-green-700' :
                      course.status === '已完成' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {course.status}
                    </Badge>
                    <Link href={`/records/${course.id}`}>
                      <Button size="sm" variant="outline">
                        详情
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>今日暂无课程安排</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 多维度分析 */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="students" className="py-3">
            <Users className="w-4 h-4 mr-2" />
            我的学生
          </TabsTrigger>
          <TabsTrigger value="schedule" className="py-3">
            <Calendar className="w-4 h-4 mr-2" />
            本周排课
          </TabsTrigger>
          <TabsTrigger value="records" className="py-3">
            <FileText className="w-4 h-4 mr-2" />
            上课记录
          </TabsTrigger>
        </TabsList>

        {/* 我的学生 */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 学生进度列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  学生学习进度
                </CardTitle>
                <CardDescription>
                  共 {studentProgress.length} 位学生
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentProgress.length > 0 ? (
                    studentProgress.map((student) => (
                      <div key={student.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{student.name}</span>
                            {student.major && (
                              <span className="text-xs text-gray-500 ml-2">{student.major}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${student.remaining < 10 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                              剩余 {student.remaining}h
                            </span>
                            <span className="text-sm text-gray-400">
                              {student.progress}%
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={student.progress} 
                          className={`h-2 ${student.progress >= 80 ? '[&>div]:bg-green-500' : student.progress >= 50 ? '[&>div]:bg-orange-500' : '[&>div]:bg-yellow-500'}`}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无学生数据</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 课时预警学生 */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  课时预警
                </CardTitle>
                <CardDescription>
                  剩余课时不足10小时的学生
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentProgress.filter(s => s.remaining < 10).length > 0 ? (
                  <div className="space-y-3">
                    {studentProgress.filter(s => s.remaining < 10).map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          {student.stage && (
                            <div className="text-xs text-gray-500">{student.stage}</div>
                          )}
                        </div>
                        <Badge className={student.remaining <= 0 ? 'bg-red-500' : 'bg-orange-500'}>
                          剩余 {student.remaining}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>暂无课时预警</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 本周排课 */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 时段分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  时段分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSlotStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="课程数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 周分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  周分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekDayStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#fb923c" radius={[4, 4, 0, 0]} name="课程数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 本周课程列表 */}
          <Card>
            <CardHeader>
              <CardTitle>本周课程详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {weekSchedule.length > 0 ? (
                  weekSchedule.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className={`p-3 rounded-lg border ${
                        schedule.status === '已确认' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{schedule.weekDay}</Badge>
                        <span className="text-xs text-gray-500">{schedule.date}</span>
                      </div>
                      <div className="text-sm font-medium">{schedule.studentName || '学生'}</div>
                      <div className="text-xs text-gray-500">{schedule.time} · {schedule.courseName || '课程'}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 col-span-full">暂无课程安排</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 上课记录 */}
        <TabsContent value="records" className="space-y-4 mt-4">
          {/* 待填记录 */}
          {pendingRecords.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  待填写的上课记录 ({pendingRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">{record.studentName || '学生'}</div>
                        <div className="text-sm text-gray-500">{record.date} · {record.courseName || '课程'}</div>
                      </div>
                      <Link href={`/records/${record.id}`}>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                          填写记录
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 最近上课记录 */}
          <Card>
            <CardHeader>
              <CardTitle>最近上课记录</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentClassRecords && data.recentClassRecords.length > 0 ? (
                <div className="space-y-3">
                  {data.recentClassRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{record.studentName || '学生'}</div>
                        <div className="text-sm text-gray-500">{record.date}</div>
                        {record.contentSummary && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-1">{record.contentSummary}</div>
                        )}
                      </div>
                      <Link href={`/records/${record.id}`}>
                        <Button size="sm" variant="outline">查看</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">暂无上课记录</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 快捷操作 */}
      <QuickActions 
        actions={quickActions as QuickAction[]}
        columns={4}
        title="快捷操作"
      />
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
  progress,
  href,
  alert,
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  color?: string;
  progress?: number;
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
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${bgColors[color]} flex items-center justify-center ${alert ? 'animate-pulse' : ''}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        {progress !== undefined && (
          <span className="text-xs text-gray-500">{progress}%</span>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      {progress !== undefined && (
        <Progress value={progress} className="mt-1.5 sm:mt-2 h-1.5" />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card className="group hover:shadow-lg transition-all cursor-pointer h-full">
          <CardContent className="p-3 sm:p-4">
            {content}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-3 sm:p-4">
        {content}
      </CardContent>
    </Card>
  );
}

export default TeacherDashboard;

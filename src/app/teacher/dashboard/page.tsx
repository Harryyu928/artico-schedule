'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Users, 
  Clock, 
  FileText,
  TrendingUp,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { NotificationBell } from '@/components/teacher/notification-bell';

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  teacherType: string;
  maxWeeklyHours: number;
}

interface TodaySchedule {
  id: string;
  scheduleId: string;
  date: Date;
  timeSlot: string;
  hours: number;
  status: string;
  hasRecord: boolean;
  student: {
    id: string;
    studentId: string;
    name: string;
  } | null;
  course: {
    id: string;
    courseId: string;
    name: string;
    category: string;
  } | null;
}

interface WeekSchedule {
  day: string;
  date: string;
  courses: TodaySchedule[];
}

interface RecentStudent {
  id: string;
  studentId: string;
  name: string;
  major: string | null;
  currentStage: string | null;
  consumedHours: number;
  totalHours: number;
  progressPercentage: number;
}

interface User {
  id: string;
  name: string;
  role: string;
  teacher: Teacher | null;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    todayCourses: 0,
    weekHours: 0,
    maxWeekHours: 0,
    totalStudents: 0,
    pendingRecords: 0,
  });
  const [todaySchedules, setTodaySchedules] = useState<TodaySchedule[]>([]);
  const [weekSchedules, setWeekSchedules] = useState<WeekSchedule[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (data.user.role !== '导师') {
        toast({
          title: '权限不足',
          description: '只有导师可以访问此页面',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }

      setUser(data.user);
      
      // 获取仪表盘数据
      if (data.user.teacher?.id) {
        await fetchDashboardData(data.user.teacher.id);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async (teacherId: string) => {
    try {
      const response = await fetch(`/api/teacher/dashboard?teacherId=${teacherId}`);
      const result = await response.json();
      
      if (result.success) {
        setStats({
          todayCourses: result.data.stats.todayCourses,
          weekHours: result.data.stats.weekHours,
          maxWeekHours: result.data.stats.maxWeekHours,
          totalStudents: result.data.stats.totalStudents,
          pendingRecords: result.data.stats.pendingRecords,
        });
        setTodaySchedules(result.data.todaySchedules || []);
        setWeekSchedules(result.data.weekSchedules || []);
        setRecentStudents(result.data.recentStudents || []);
      }

      // 获取未读通知数量
      const notificationResponse = await fetch(`/api/teacher/notifications?teacherId=${teacherId}`);
      const notificationResult = await notificationResponse.json();
      if (notificationResult.success) {
        setUnreadNotifications(notificationResult.data.unreadCount);
      }
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast({
        title: '已登出',
        description: '期待您的下次使用',
      });
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const getTimeSlotLabel = (slot: string) => {
    const slots: Record<string, string> = {
      '10:00': '10:00-12:00',
      '13:00': '13:00-15:00',
      '15:00': '15:00-17:00',
      '18:00': '18:00-20:00',
      '20:00': '20:00-22:00',
    };
    return slots[slot] || slot;
  };

  const getStatusBadge = (schedule: TodaySchedule) => {
    if (schedule.hasRecord) {
      return (
        <Badge className="bg-green-500 text-white text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          已记录
        </Badge>
      );
    }
    
    switch (schedule.status) {
      case '待确认':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
            待确认
          </Badge>
        );
      case '已确认':
        return (
          <Badge className="bg-orange-500 text-white text-xs">
            待上课
          </Badge>
        );
      case '已完成':
        return (
          <Badge variant="outline" className="text-red-500 border-red-300 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            待记录
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {schedule.status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.teacher) {
    return null;
  }

  const hourPercentage = stats.maxWeekHours > 0 ? (stats.weekHours / stats.maxWeekHours) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  导师工作台
                </h1>
                <p className="text-xs text-muted-foreground">ARTiCO 教务管理系统</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user.teacher && (
                <NotificationBell 
                  teacherId={user.teacher.id}
                  unreadCount={unreadNotifications}
                  onRefresh={() => fetchDashboardData(user.teacher!.id)}
                />
              )}
              
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.teacher.teacherType}导师
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-orange-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎横幅 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 text-white mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">
              欢迎回来，{user.name}！
            </h2>
            <p className="text-orange-100">
              今天有 <span className="font-bold text-white">{stats.todayCourses}</span> 节课程等待您上课
            </p>
            {stats.pendingRecords > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{stats.pendingRecords} 条上课记录待填写</span>
              </div>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    今日课程
                  </p>
                  <div className="text-3xl font-bold text-orange-600 mt-2">
                    {stats.todayCourses}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">节课待上课</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    本周课时
                  </p>
                  <div className="text-3xl font-bold mt-2">
                    <span className={hourPercentage > 80 ? 'text-red-600' : 'text-amber-600'}>
                      {stats.weekHours}
                    </span>
                    <span className="text-lg text-gray-400">/{stats.maxWeekHours}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        hourPercentage > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                      }`}
                      style={{ width: `${Math.min(hourPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    我的学生
                  </p>
                  <div className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.totalStudents}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">位学生</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    待填记录
                  </p>
                  <div className="text-3xl font-bold text-red-600 mt-2">
                    {stats.pendingRecords}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">条上课记录待填写</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 今日课程和学生进度 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 今日课程 */}
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  今日课程
                </span>
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => router.push('/teacher/schedule')}>
                  查看全部
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>今天没有课程安排</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((schedule, index) => (
                    <div 
                      key={schedule.id || index}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                        schedule.hasRecord
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                          : schedule.status === '已完成'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <Badge className="bg-orange-500 text-white">{getTimeSlotLabel(schedule.timeSlot)}</Badge>
                        </div>
                        <div>
                          <p className="font-medium">{schedule.student?.name || '未知学生'}</p>
                          <p className="text-sm text-muted-foreground">{schedule.course?.name || '未知课程'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(schedule)}
                        {schedule.status === '已完成' && !schedule.hasRecord && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                            onClick={() => router.push(`/teacher/records/new?scheduleId=${schedule.scheduleId}`)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 学生进度 */}
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  学生进度概览
                </span>
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => router.push('/teacher/students')}>
                  查看全部
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无学生数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{student.name}</span>
                          <span className="text-sm text-muted-foreground">{student.progressPercentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              student.progressPercentage >= 80 ? 'bg-green-500' :
                              student.progressPercentage >= 50 ? 'bg-amber-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${student.progressPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          已完成 {student.consumedHours} / {student.totalHours} 课时
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 本周课程预览 */}
        <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                本周课程
              </span>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => router.push('/teacher/schedule')}>
                查看完整课表
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekSchedules.map((day, index) => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const isToday = day.date === today;
                
                return (
                  <div 
                    key={index} 
                    className={`p-2 rounded-lg text-center ${
                      isToday 
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${isToday ? 'text-white' : 'text-muted-foreground'}`}>
                      {day.day}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? 'text-white' : ''}`}>
                      {day.courses.length}
                    </p>
                    <p className={`text-xs ${isToday ? 'text-orange-100' : 'text-muted-foreground'}`}>
                      节课
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 导航按钮 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 bg-white/80 backdrop-blur-sm"
            onClick={() => router.push('/teacher/students')}
          >
            <Users className="w-6 h-6 text-orange-500" />
            <span>我的学生</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 bg-white/80 backdrop-blur-sm"
            onClick={() => router.push('/teacher/schedule')}
          >
            <Calendar className="w-6 h-6 text-orange-500" />
            <span>课程表</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 bg-white/80 backdrop-blur-sm"
            onClick={() => router.push('/teacher/records')}
          >
            <FileText className="w-6 h-6 text-orange-500" />
            <span>上课记录</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 bg-white/80 backdrop-blur-sm"
            onClick={() => router.push('/teacher/analytics')}
          >
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <span>统计分析</span>
          </Button>
        </div>
      </main>
    </div>
  );
}

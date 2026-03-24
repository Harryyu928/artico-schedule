/**
 * 角色仪表盘组件
 * 
 * 根据用户角色显示不同的仪表盘内容：
 * - 管理员：全局概览
 * - 规划顾问：签约学生、待处理事项
 * - 全职导师：课程、学生进度
 * - 兼职导师：简化版课程信息
 * - 学生：个人学习进度
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Settings,
  Workflow,
  Loader2,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type UserRole = '管理员' | '规划顾问' | '全职导师' | '兼职导师' | '学生';

interface DashboardData {
  role: UserRole;
  user: {
    id: string;
    name: string;
    email?: string;
    studentId?: string;
    major?: string;
    applicationCountry?: string;
    currentStage?: string;
    teacherType?: string;
  };
  stats: Record<string, number>;
  quickActions: Array<{
    label: string;
    href: string;
    icon: string;
  }>;
  recentActivities?: Array<{
    type: string;
    message: string;
    time: string;
  }>;
  todaySchedule?: Array<{
    time: string;
    student: string;
    purpose: string;
    status: string;
  }>;
  urgentTasks?: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
  todayCourses?: Array<{
    time: string;
    student?: string;
    course: string;
    teacher?: string;
    status: string;
  }>;
  studentProgress?: Array<{
    name: string;
    progress: number;
  }>;
  upcomingDeadlines?: Array<{
    type: string;
    message: string;
    date: string;
  }>;
}

// 根据图标名称返回图标组件
function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Users,
    UserCheck,
    BookOpen,
    Calendar,
    Clock,
    Settings,
    Workflow,
    FileText,
    TrendingUp,
  };
  return icons[iconName] || Users;
}

export default function RoleDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        if (response.status === 401) {
          // 未登录，显示默认仪表盘
          setLoading(false);
          return;
        }
        throw new Error('获取数据失败');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      window.location.reload();
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  // 如果没有登录或没有数据，显示默认仪表盘
  if (!loading && !data) {
    return <DefaultDashboard />;
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  // 根据角色渲染不同的仪表盘
  const renderDashboard = () => {
    switch (data?.role) {
      case '管理员':
        return <AdminDashboardContent data={data} />;
      case '规划顾问':
        return <ConsultantDashboardContent data={data} />;
      case '全职导师':
      case '兼职导师':
        return <TeacherDashboardContent data={data} />;
      case '学生':
        return <StudentDashboardContent data={data} />;
      default:
        return <DefaultDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户信息栏 */}
      {data && (
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">{data.user.name?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{data.user.name}</h2>
              <p className="text-sm text-white/80">{data.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30">
              {data.role}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      )}
      
      {renderDashboard()}
    </div>
  );
}

// 管理员仪表盘
function AdminDashboardContent({ data }: { data: DashboardData }) {
  const stats = data.stats;
  
  const statCards = [
    { name: '学生总数', value: Number(stats.totalStudents ?? 0), icon: Users, color: 'from-orange-500 to-amber-500', link: '/students' },
    { name: '导师总数', value: Number(stats.totalTeachers ?? 0), icon: GraduationCap, color: 'from-amber-500 to-yellow-500', link: '/teachers' },
    { name: '课程总数', value: Number(stats.totalCourses ?? 0), icon: BookOpen, color: 'from-orange-400 to-orange-600', link: '/courses' },
    { name: '本周新增学生', value: Number(stats.newStudentsThisWeek ?? 0), icon: TrendingUp, color: 'from-yellow-400 to-orange-500', link: '/students' },
    { name: '今日排课', value: Number(stats.todaySchedules ?? 0), icon: Calendar, color: 'from-orange-500 to-red-500', link: '/schedules' },
    { name: '待处理选课单', value: Number(stats.pendingSelections ?? 0), icon: FileText, color: 'from-amber-400 to-orange-500', link: '/selection-forms' },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">管理员工作台</h1>
        <p className="text-white/90">全局概览 · 系统管理 · 数据统计</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.link}>
              <Card className="group hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.name}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {data.quickActions.map((action) => {
          const Icon = getIcon(action.icon);
          return (
            <Link key={action.label} href={action.href}>
              <Card className="group hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 最近活动 */}
      {data.recentActivities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.recentActivities as Array<{type: string; message: string; time: string}>).map((activity, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'student' ? 'bg-orange-500' :
                    activity.type === 'schedule' ? 'bg-amber-500' : 'bg-yellow-500'
                  }`} />
                  <span className="flex-1 text-sm">{activity.message}</span>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 规划顾问仪表盘
function ConsultantDashboardContent({ data }: { data: DashboardData }) {
  const stats = data.stats;

  const statCards = [
    { name: '我的学生', value: stats.myStudents, icon: Users, color: 'from-orange-500 to-amber-500' },
    { name: '待处理选课单', value: stats.pendingForms, icon: FileText, color: 'from-red-400 to-red-500' },
    { name: '今日预约', value: stats.todayReservations, icon: Calendar, color: 'from-amber-500 to-yellow-500' },
    { name: '待填时间表', value: stats.studentsWithoutTime, icon: Clock, color: 'from-orange-400 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">规划顾问工作台</h1>
        <p className="text-white/90">学生管理 · 选课指导 · 预约安排</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.name}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日日程 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              今日日程
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.todaySchedule ? (data.todaySchedule as Array<{
                time: string;
                student: string;
                purpose: string;
                status: string;
              }>).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-orange-300 text-orange-600">
                      {item.time}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.student}</p>
                      <p className="text-sm text-gray-500">{item.purpose}</p>
                    </div>
                  </div>
                  <Badge className={item.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                    {item.status === 'confirmed' ? '已确认' : '待确认'}
                  </Badge>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">今日暂无日程安排</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 待办事项 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              待办事项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.urgentTasks ? (data.urgentTasks as Array<{
                type: string;
                message: string;
                priority: string;
              }>).map((task, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                  task.priority === 'high' ? 'bg-red-50' : 'bg-yellow-50'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="flex-1 text-sm">{task.message}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">暂无待办事项</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.quickActions.map((action) => {
          const Icon = getIcon(action.icon);
          return (
            <Link key={action.label} href={action.href}>
              <Card className="group hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// 导师仪表盘
function TeacherDashboardContent({ data }: { data: DashboardData }) {
  const stats = data.stats as {
    todayCourses: number;
    weekHours: number;
    maxWeekHours: number;
    hourPercentage: number;
    totalStudents: number;
    pendingRecords: number;
  };

  const hourPercentage = stats?.hourPercentage || 0;

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">导师工作台</h1>
        <p className="text-white/90">
          今日有 {stats?.todayCourses || 0} 节课程等待上课
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              今日课程
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.todayCourses || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              本周课时
            </div>
            <div className="text-3xl font-bold">
              <span className={hourPercentage > 80 ? 'text-red-600' : 'text-orange-600'}>
                {stats?.weekHours || 0}
              </span>
              <span className="text-lg text-gray-400">/{stats?.maxWeekHours || 20}</span>
            </div>
            <Progress value={hourPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Users className="w-4 h-4 text-orange-500" />
              我的学生
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.totalStudents || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <FileText className="w-4 h-4 text-orange-500" />
              待填记录
            </div>
            <div className="text-3xl font-bold text-red-600">{stats?.pendingRecords || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日课程 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              今日课程
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.todayCourses ? (data.todayCourses as Array<{
                time: string;
                student: string;
                course: string;
                status: string;
              }>).map((course, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{course.student}</p>
                    <p className="text-sm text-gray-500">{course.course}</p>
                  </div>
                  <Badge className="bg-orange-500">{course.time}</Badge>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">今日暂无课程</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 学生进度 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              学生进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.studentProgress ? (data.studentProgress as Array<{
                name: string;
                progress: number;
              }>).map((student, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{student.name}</span>
                    <span className="text-gray-500">{student.progress}%</span>
                  </div>
                  <Progress value={student.progress} className="h-2" />
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">暂无学生数据</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.quickActions.map((action) => {
          const Icon = getIcon(action.icon);
          return (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300">
                <Icon className="w-5 h-5 text-orange-500" />
                <span>{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// 学生仪表盘
function StudentDashboardContent({ data }: { data: DashboardData }) {
  const stats = data.stats as {
    todayCourses: number;
    totalHours: number;
    usedHours: number;
    remainingHours: number;
    progressPercentage: number;
    selectionForms: number;
  };
  const user = data.user as {
    name: string;
    studentId?: string;
    major?: string;
    currentStage?: string;
  };

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">学生中心</h1>
        <p className="text-white/90">
          {user.major} · {user.currentStage}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              今日课程
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.todayCourses || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              剩余课时
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.remainingHours || 0}</div>
            <p className="text-xs text-gray-400 mt-1">共 {stats?.totalHours || 0} 课时</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              学习进度
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.progressPercentage || 0}%</div>
            <Progress value={stats?.progressPercentage || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <FileText className="w-4 h-4 text-orange-500" />
              选课单
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats?.selectionForms || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日课程 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              今日课程
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.todayCourses ? (data.todayCourses as Array<{
                time: string;
                course: string;
                teacher: string;
                status: string;
              }>).map((course, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{course.course}</p>
                    <p className="text-sm text-gray-500">{course.teacher}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-500">{course.time}</Badge>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">今日暂无课程</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 重要日期 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              重要日期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingDeadlines ? (data.upcomingDeadlines as Array<{
                type: string;
                message: string;
                date: string;
              }>).map((deadline, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    deadline.type === 'homework' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="flex-1 text-sm">{deadline.message}</span>
                  <Badge variant="outline">{deadline.date}</Badge>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">暂无重要日期</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.quickActions.map((action) => {
          const Icon = getIcon(action.icon);
          return (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300">
                <Icon className="w-5 h-5 text-orange-500" />
                <span>{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// 默认仪表盘（未登录或未知角色）
function DefaultDashboard() {
  const [switching, setSwitching] = useState<string | null>(null);

  const handleRoleSwitch = async (role: UserRole) => {
    setSwitching(role);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', role }),
      });
      window.location.reload();
    } catch (err) {
      console.error('切换角色失败:', err);
      setSwitching(null);
    }
  };

  const roles: Array<{ role: UserRole; label: string; desc: string; color: string }> = [
    { role: '管理员', label: '管理员', desc: '全局管理、系统设置', color: 'bg-red-500' },
    { role: '规划顾问', label: '规划顾问', desc: '学生管理、选课指导', color: 'bg-blue-500' },
    { role: '全职导师', label: '全职导师', desc: '课程安排、学生进度', color: 'bg-green-500' },
    { role: '兼职导师', label: '兼职导师', desc: '简化版课程管理', color: 'bg-purple-500' },
    { role: '学生', label: '学生', desc: '个人学习进度', color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">
          欢迎使用 ARTiCO 教务管理系统
        </h1>
        <p className="text-white/90 text-lg mb-6">
          智能化的教务管理解决方案，让排课更简单高效
        </p>
      </div>

      {/* 角色切换 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">🔐 快速切换角色测试</CardTitle>
          <CardDescription>
            点击下方按钮切换不同角色，体验各角色的仪表盘
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {roles.map(({ role, label, desc, color }) => (
              <Button
                key={role}
                variant="outline"
                className={`h-auto py-4 flex-col gap-1 border-2 hover:border-orange-300 ${switching === role ? 'opacity-50' : ''}`}
                onClick={() => handleRoleSwitch(role)}
                disabled={switching !== null}
              >
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
                {switching === role && (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 系统特性 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">智能排课</h3>
          <p className="text-gray-500">基于学生和导师时间自动匹配排课</p>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">选课单管理</h3>
          <p className="text-gray-500">完整的选课单创建和进度追踪</p>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">多角色权限</h3>
          <p className="text-gray-500">管理员、顾问、导师、学生分级权限</p>
        </Card>
      </div>

      {/* 功能入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/import">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="font-medium">数据导入</div>
                <div className="text-sm text-muted-foreground">批量导入学生/导师/课程</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/time-table/student">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">学生时间表</div>
                <div className="text-sm text-muted-foreground">填写可用时间</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/time-table/teacher">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="font-medium">导师时间表</div>
                <div className="text-sm text-muted-foreground">管理授课时间</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/students">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium">学生管理</div>
                <div className="text-sm text-muted-foreground">查看学生列表</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/teachers">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="font-medium">导师管理</div>
                <div className="text-sm text-muted-foreground">查看导师列表</div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

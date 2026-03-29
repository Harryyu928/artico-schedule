/**
 * 角色仪表盘组件
 * 
 * 根据用户角色显示不同的仪表盘内容：
 * - 管理员：运营数据看板（多维度分析）
 * - 规划顾问：签约学生、待处理事项
 * - 全职导师：课程、学生进度
 * - 兼职导师：简化版课程信息
 * - 学生：个人学习进度
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
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
  LogOut,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AdminDashboard from './admin-dashboard';
import TeacherDashboard from './teacher-dashboard';
import ConsultantDashboard from './consultant-dashboard';
import RoleSelector from './role-selector';
import { useUser, usePermissions } from '@/hooks/use-permissions';

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
  const { user, switchRole, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 使用前端角色作为主要判断依据
  const currentRole = user?.role as UserRole | undefined;

  useEffect(() => {
    // 只有当用户角色确定后才获取数据
    if (currentRole) {
      fetchDashboardData();
    } else if (!userLoading) {
      setLoading(false);
    }
  }, [currentRole, userLoading]);

  async function fetchDashboardData(retryCount = 0) {
    try {
      // 先同步后端 cookie
      const authResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', role: currentRole }),
        credentials: 'include',
      });
      
      // 如果登录失败，重试一次
      if (!authResponse.ok && retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchDashboardData(retryCount + 1);
      }
      
      // 然后获取仪表盘数据
      const response = await fetch('/api/dashboard', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          // 未登录，但前端有角色，继续显示对应仪表盘
          setLoading(false);
          return;
        }
        // 尝试重试一次
        if (retryCount < 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchDashboardData(retryCount + 1);
        }
        throw new Error('获取数据失败');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
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
      // 清除前端状态
      switchRole('管理员');
      window.location.reload();
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  // 如果用户还在加载中
  if (userLoading || loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // 如果没有前端用户角色，显示默认仪表盘
  if (!currentRole) {
    return <DefaultDashboard />;
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

  // 根据前端角色渲染不同的仪表盘（不依赖 API 返回的角色）
  const renderDashboard = () => {
    switch (currentRole) {
      case '管理员':
        // 管理员使用独立的运营仪表盘组件
        return <AdminDashboard />;
      case '规划顾问':
        // 规划顾问使用独立的仪表盘组件
        return <ConsultantDashboard />;
      case '全职导师':
      case '兼职导师':
        // 导师使用独立的仪表盘组件
        return <TeacherDashboard />;
      case '学生':
        return data ? <StudentDashboardContent data={data} /> : <DefaultDashboard />;
      default:
        return <DefaultDashboard />;
    }
  };

  // 管理员、规划顾问、导师仪表盘有自己的用户信息栏
  if (currentRole === '管理员' || currentRole === '规划顾问' || currentRole === '全职导师' || currentRole === '兼职导师') {
    return renderDashboard();
  }

  return (
    <div className="space-y-6">
      {/* 用户信息栏 */}
      {user && (
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">{user.name?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <p className="text-sm text-white/80">{currentRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30">
              {currentRole}
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
  return <RoleSelector />;
}

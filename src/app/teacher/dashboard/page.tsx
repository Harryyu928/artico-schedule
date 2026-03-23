'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  Clock, 
  FileText,
  TrendingUp,
  LogOut,
  Loader2,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  teacherType: string;
  currentHours: number;
  maxWeeklyHours: number;
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
      
      // 获取统计数据
      if (data.user.teacher) {
        setStats({
          todayCourses: 3, // 模拟数据
          weekHours: data.user.teacher.currentHours,
          maxWeekHours: data.user.teacher.maxWeeklyHours,
          totalStudents: 15, // 模拟数据
          pendingRecords: 5, // 模拟数据
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user || !user.teacher) {
    return null;
  }

  const hourPercentage = (stats.weekHours / stats.maxWeekHours) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 gradient-orange rounded-xl flex items-center justify-center shadow-orange">
                <span className="text-white font-bold">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">导师工作台</h1>
                <p className="text-xs text-muted-foreground">ARTiCO 教务管理系统</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.teacher.teacherType}导师
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎横幅 */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            欢迎回来，{user.name}！
          </h2>
          <p className="text-orange-100">
            今天有 {stats.todayCourses} 节课程等待您上课
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-orange-100 hover:border-orange-300 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                今日课程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.todayCourses}
              </div>
              <p className="text-xs text-muted-foreground mt-1">节课待上课</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 hover:border-orange-300 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                本周课时
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                <span className={hourPercentage > 80 ? 'text-red-600' : 'text-orange-600'}>
                  {stats.weekHours}
                </span>
                <span className="text-lg text-gray-400">/{stats.maxWeekHours}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    hourPercentage > 80 ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(hourPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 hover:border-orange-300 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                我的学生
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.totalStudents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">位学生</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 hover:border-orange-300 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                待填记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.pendingRecords}
              </div>
              <p className="text-xs text-muted-foreground mt-1">条上课记录待填写</p>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 今日课程 */}
          <Card className="border-2 border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  今日课程
                </span>
                <Button variant="outline" size="sm" onClick={() => router.push('/teacher/schedule')}>
                  查看全部
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="font-medium">张三</p>
                    <p className="text-sm text-muted-foreground">F-GD 游戏设计基础</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-500">10:00-12:00</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div>
                    <p className="font-medium">李四</p>
                    <p className="text-sm text-muted-foreground">P-GA 游戏策划进阶</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-amber-500">14:00-16:00</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <p className="font-medium">王五</p>
                    <p className="text-sm text-muted-foreground">F-AN 游戏动画基础</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-yellow-600">18:00-20:00</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 学生进度 */}
          <Card className="border-2 border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  学生进度概览
                </span>
                <Button variant="outline" size="sm" onClick={() => router.push('/teacher/students')}>
                  查看全部
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">张三</span>
                      <span className="text-sm text-muted-foreground">65%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">李四</span>
                      <span className="text-sm text-muted-foreground">80%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">王五</span>
                      <span className="text-sm text-muted-foreground">40%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 导航按钮 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50"
            onClick={() => router.push('/teacher/students')}
          >
            <Users className="w-6 h-6 text-orange-500" />
            <span>我的学生</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50"
            onClick={() => router.push('/teacher/schedule')}
          >
            <Calendar className="w-6 h-6 text-orange-500" />
            <span>课程表</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50"
            onClick={() => router.push('/teacher/records')}
          >
            <FileText className="w-6 h-6 text-orange-500" />
            <span>上课记录</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50"
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

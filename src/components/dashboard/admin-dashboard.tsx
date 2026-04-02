/**
 * 运营仪表盘组件 - 简化版
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-permissions';

type DashboardData = {
  role: string;
  user: { id: string; name: string; email?: string };
  stats: {
    students: number;
    teachers: number;
    courses: number;
    schedules: number;
    classRecords: number;
  };
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

export default function AdminDashboard() {
  const { user, switchRole, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading) {
      fetchDashboardData();
    }
  }, [userLoading]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      // 使用默认数据
      setData({
        role: '管理员',
        user: { id: 'default', name: '张主管', email: 'admin@artico.com' },
        stats: { students: 0, teachers: 0, courses: 0, schedules: 0, classRecords: 0 },
        quickActions: [
          { label: '学生管理', href: '/students', icon: 'Users' },
          { label: '导师管理', href: '/teachers', icon: 'GraduationCap' },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  // 用户加载中
  if (userLoading || loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // 有错误且没有数据
  if (error && !data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4 bg-orange-500 hover:bg-orange-600">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">运营数据看板</h1>
            <p className="text-white/90">欢迎回来，{user?.name || data?.user?.name || '管理员'}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchDashboardData}
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="学生总数"
          value={data?.stats?.students || 0}
          icon={Users}
          href="/students"
        />
        <MetricCard
          title="导师总数"
          value={data?.stats?.teachers || 0}
          icon={GraduationCap}
          href="/teachers"
        />
        <MetricCard
          title="课程总数"
          value={data?.stats?.courses || 0}
          icon={BookOpen}
          href="/courses"
        />
        <MetricCard
          title="排课总数"
          value={data?.stats?.schedules || 0}
          icon={Calendar}
          href="/teacher/schedule"
        />
        <MetricCard
          title="上课记录"
          value={data?.stats?.classRecords || 0}
          icon={TrendingUp}
          href="/teacher/records"
        />
      </div>

      {/* 快捷操作 */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="font-semibold">快捷操作</h2>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/students" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors">
            <Users className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <span className="text-sm font-medium">学生管理</span>
          </Link>
          <Link href="/teachers" className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-center transition-colors">
            <GraduationCap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <span className="text-sm font-medium">导师管理</span>
          </Link>
          <Link href="/courses" className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center transition-colors">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
            <span className="text-sm font-medium">课程管理</span>
          </Link>
          <Link href="/teacher/schedule" className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <span className="text-sm font-medium">排课管理</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}

// 指标卡片组件
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  href 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>; 
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

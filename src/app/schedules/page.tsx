'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Schedule {
  id: string;
  scheduleId: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  date: string;
  weekDay: string;
  timeSlot: string;
  hours: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // 获取排课列表
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedule');
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error('获取排课列表失败:', error);
      toast({
        title: '错误',
        description: '获取排课列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 自动排课
  const handleAutoSchedule = async () => {
    try {
      toast({
        title: '自动排课',
        description: '正在执行自动排课...',
      });

      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('自动排课失败');

      const result = await response.json();
      
      toast({
        title: '成功',
        description: `自动排课完成，共安排 ${result.scheduled || 0} 节课程`,
      });

      fetchSchedules();
    } catch (error) {
      console.error('自动排课失败:', error);
      toast({
        title: '错误',
        description: '自动排课失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 更新排课状态
  const handleUpdateStatus = async (scheduleId: string, status: string) => {
    try {
      const response = await fetch(`/api/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '成功',
        description: '状态已更新',
      });

      fetchSchedules();
    } catch (error) {
      console.error('更新失败:', error);
      toast({
        title: '错误',
        description: '更新失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '待确认':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case '已确认':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case '已完成':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case '取消':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '待确认':
        return 'warning';
      case '已确认':
        return 'default';
      case '已完成':
        return 'success';
      case '取消':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // 过滤排课
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.scheduleId.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计数据
  const stats = {
    total: schedules.length,
    pending: schedules.filter(s => s.status === '待确认').length,
    confirmed: schedules.filter(s => s.status === '已确认').length,
    completed: schedules.filter(s => s.status === '已完成').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">排课管理</h1>
          <p className="text-gray-500 mt-1">管理课程安排和排课计划</p>
        </div>
        
        <Button onClick={handleAutoSchedule}>
          <Calendar className="mr-2 h-4 w-4" />
          自动排课
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总排课数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待确认</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已确认</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>排课列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索排课..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="待确认">待确认</SelectItem>
                  <SelectItem value="已确认">已确认</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="取消">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无排课数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排课编号</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>导师</TableHead>
                  <TableHead>课程</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.scheduleId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {schedule.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {schedule.timeSlot}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {schedule.studentId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {schedule.teacherId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        {schedule.courseId}
                      </div>
                    </TableCell>
                    <TableCell>{schedule.hours}小时</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(schedule.status)}
                        <Badge variant={getStatusColor(schedule.status) as any}>
                          {schedule.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {schedule.status === '待确认' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(schedule.id, '已确认')}
                          >
                            确认
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(schedule.id, '取消')}
                          >
                            取消
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

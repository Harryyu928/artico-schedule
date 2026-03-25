'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  Eye,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { exportToCSV, scheduleExportColumns } from '@/lib/export-utils';

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

interface Schedule {
  id: string;
  scheduleId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  date: string;
  weekDay: string;
  timeSlot: string;
  hours: number;
  status: string;
  notes?: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Teacher {
  id: string;
  name: string;
  teacherId: string;
}

interface Course {
  id: string;
  name: string;
  courseId: string;
}

type SortField = 'scheduleId' | 'date' | 'studentName' | 'teacherName' | 'courseName' | 'hours' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeekStart, setCurrentWeekStart] = useState(getCurrentWeekStart());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const { toast } = useToast();
  const { confirm, confirmDialogProps } = useConfirmDialog();

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 新排课表单
  const [newSchedule, setNewSchedule] = useState({
    studentId: '',
    teacherId: '',
    courseId: '',
    date: '',
    weekDay: '周一',
    timeSlot: '10:00',
    hours: 2,
    notes: '',
  });

  // 获取当前周一的日期
  function getCurrentWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().split('T')[0];
  }

  // 获取排课列表
  useEffect(() => {
    fetchSchedules();
    fetchStudents();
    fetchTeachers();
    fetchCourses();
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

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('获取学生列表失败:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('获取导师列表失败:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  // 自动排课
  const handleAutoSchedule = async () => {
    confirm(
      '确认自动排课',
      '系统将根据学生和导师的时间表自动匹配排课，是否继续？',
      async () => {
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
      },
      'default'
    );
  };

  // 创建排课
  const handleCreateSchedule = async () => {
    try {
      if (!newSchedule.studentId || !newSchedule.teacherId || !newSchedule.courseId || !newSchedule.date) {
        toast({
          title: '提示',
          description: '请填写完整的排课信息',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) throw new Error('创建失败');

      toast({
        title: '成功',
        description: '排课已创建',
      });

      setCreateDialogOpen(false);
      setNewSchedule({
        studentId: '',
        teacherId: '',
        courseId: '',
        date: '',
        weekDay: '周一',
        timeSlot: '10:00',
        hours: 2,
        notes: '',
      });

      fetchSchedules();
    } catch (error) {
      console.error('创建排课失败:', error);
      toast({
        title: '错误',
        description: '创建排课失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 更新排课状态
  const handleUpdateStatus = async (schedule: Schedule, status: string) => {
    try {
      const response = await fetch(`/api/schedule/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '成功',
        description: '状态已更新',
      });

      setDetailDialogOpen(false);
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

  // 删除排课
  const handleDeleteSchedule = (schedule: Schedule) => {
    confirm(
      '确认删除',
      `确定要删除 ${schedule.date} 的排课「${schedule.courseName}」吗？此操作无法撤销。`,
      async () => {
        try {
          const response = await fetch(`/api/schedule/${schedule.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('删除失败');

          toast({
            title: '成功',
            description: '排课已删除',
          });

          setDetailDialogOpen(false);
          fetchSchedules();
        } catch (error) {
          console.error('删除失败:', error);
          toast({
            title: '错误',
            description: '删除失败，请重试',
            variant: 'destructive',
          });
        }
      },
      'destructive'
    );
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
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      case '已确认':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case '已完成':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case '取消':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // 获取排序图标
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-orange-500" />
      : <ArrowDown className="h-4 w-4 text-orange-500" />;
  };

  // 过滤和排序排课
  const filteredAndSortedSchedules = useMemo(() => {
    let result = schedules.filter(schedule => {
      const matchesSearch = 
        schedule.studentName?.includes(searchTerm) ||
        schedule.teacherName?.includes(searchTerm) ||
        schedule.courseName?.includes(searchTerm) ||
        schedule.scheduleId?.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'scheduleId':
        case 'studentName':
        case 'teacherName':
        case 'courseName':
        case 'status':
          comparison = (a[sortField] || '').localeCompare(b[sortField] || '', 'zh-CN');
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'hours':
          comparison = (a[sortField] || 0) - (b[sortField] || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [schedules, searchTerm, statusFilter, sortField, sortOrder]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedSchedules.length / pageSize);
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedSchedules.slice(start, start + pageSize);
  }, [filteredAndSortedSchedules, currentPage, pageSize]);

  // 获取周日期范围
  const getWeekDateRange = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
  };

  // 获取某天某时段的排课
  const getScheduleByDayTime = (day: string, time: string) => {
    return schedules.filter(s => s.weekDay === day && s.timeSlot === time);
  };

  // 导出数据
  const handleExport = () => {
    if (filteredAndSortedSchedules.length === 0) {
      toast({
        title: '提示',
        description: '没有可导出的数据',
        variant: 'default',
      });
      return;
    }

    // 准备导出数据
    const exportData = filteredAndSortedSchedules.map(schedule => ({
      ...schedule,
      createdAt: new Date(schedule.createdAt).toLocaleDateString('zh-CN'),
    }));

    exportToCSV(exportData, scheduleExportColumns, '排课列表');
    
    toast({
      title: '导出成功',
      description: `已导出 ${exportData.length} 条排课数据`,
    });
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: schedules.length,
    pending: schedules.filter(s => s.status === '待确认').length,
    confirmed: schedules.filter(s => s.status === '已确认').length,
    completed: schedules.filter(s => s.status === '已完成').length,
  }), [schedules]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">排课管理</h1>
          <p className="text-gray-500 mt-1">管理课程安排和排课计划</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={loading || schedules.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                手动排课
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>创建排课</DialogTitle>
                <DialogDescription>
                  手动为学生创建排课安排
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="student" className="text-right">学生</Label>
                  <Select
                    value={newSchedule.studentId}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, studentId: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择学生" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.studentId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher" className="text-right">导师</Label>
                  <Select
                    value={newSchedule.teacherId}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, teacherId: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择导师" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course" className="text-right">课程</Label>
                  <Select
                    value={newSchedule.courseId}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, courseId: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择课程" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">日期</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      const dayOfWeek = date.getDay();
                      const weekDayMap: Record<number, string> = {
                        0: '周日', 1: '周一', 2: '周二', 3: '周三',
                        4: '周四', 5: '周五', 6: '周六'
                      };
                      setNewSchedule({ 
                        ...newSchedule, 
                        date: e.target.value,
                        weekDay: weekDayMap[dayOfWeek]
                      });
                    }}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeSlot" className="text-right">时间段</Label>
                  <Select
                    value={newSchedule.timeSlot}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, timeSlot: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hours" className="text-right">课时</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={4}
                    value={newSchedule.hours}
                    onChange={(e) => setNewSchedule({ ...newSchedule, hours: parseInt(e.target.value) || 2 })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">备注</Label>
                  <Input
                    id="notes"
                    value={newSchedule.notes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                    placeholder="可选备注信息"
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                <Button onClick={handleCreateSchedule}>创建排课</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleAutoSchedule}>
            <Sparkles className="mr-2 h-4 w-4" />
            自动排课
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500" />
              总排课数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              待确认
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              已确认
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              已完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 视图切换和搜索 */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-1" />
                列表
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                日历
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生/导师/课程..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}>
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
          {/* 列表视图 */}
          {viewMode === 'list' && (
            <>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : filteredAndSortedSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">暂无排课数据</p>
                  <Button onClick={handleAutoSchedule}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    自动排课
                  </Button>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('scheduleId')}
                          >
                            <div className="flex items-center gap-1">
                              排课编号 {getSortIcon('scheduleId')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('date')}
                          >
                            <div className="flex items-center gap-1">
                              日期 {getSortIcon('date')}
                            </div>
                          </TableHead>
                          <TableHead>时间</TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('studentName')}
                          >
                            <div className="flex items-center gap-1">
                              学生 {getSortIcon('studentName')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('teacherName')}
                          >
                            <div className="flex items-center gap-1">
                              导师 {getSortIcon('teacherName')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('courseName')}
                          >
                            <div className="flex items-center gap-1">
                              课程 {getSortIcon('courseName')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('hours')}
                          >
                            <div className="flex items-center gap-1">
                              时长 {getSortIcon('hours')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-1">
                              状态 {getSortIcon('status')}
                            </div>
                          </TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSchedules.map((schedule) => (
                          <TableRow key={schedule.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{schedule.scheduleId}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{schedule.date}</span>
                                <span className="text-gray-400">({schedule.weekDay})</span>
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
                                {schedule.studentName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                {schedule.teacherName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                                {schedule.courseName}
                              </div>
                            </TableCell>
                            <TableCell>{schedule.hours}小时</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(schedule.status)}
                                <Badge className={getStatusColor(schedule.status)}>
                                  {schedule.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedSchedule(schedule);
                                    setDetailDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {schedule.status === '待确认' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateStatus(schedule, '已确认')}
                                    >
                                      确认
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleUpdateStatus(schedule, '取消')}
                                    >
                                      取消
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 分页 */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>每页</span>
                      <Select value={String(pageSize)} onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map(size => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>条</span>
                      <span className="mx-4">|</span>
                      <span>
                        共 {filteredAndSortedSchedules.length} 条，第 {currentPage}/{totalPages} 页
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        首页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        末页
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* 日历视图 */}
          {viewMode === 'calendar' && (
            <div>
              {/* 周导航 */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={() => {
                  const start = new Date(currentWeekStart);
                  start.setDate(start.getDate() - 7);
                  setCurrentWeekStart(start.toISOString().split('T')[0]);
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">{getWeekDateRange()}</span>
                <Button variant="outline" size="sm" onClick={() => {
                  const start = new Date(currentWeekStart);
                  start.setDate(start.getDate() + 7);
                  setCurrentWeekStart(start.toISOString().split('T')[0]);
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* 日历网格 */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-gray-50 dark:bg-gray-800 w-20">时间</th>
                      {weekDays.map((day, index) => {
                        const date = new Date(currentWeekStart);
                        date.setDate(date.getDate() + index);
                        return (
                          <th key={day} className="p-2 border bg-gray-50 dark:bg-gray-800 text-center">
                            <div>{day}</div>
                            <div className="text-xs text-gray-400">{date.getMonth() + 1}/{date.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(time => (
                      <tr key={time}>
                        <td className="p-2 border bg-gray-50 dark:bg-gray-800 font-medium text-center">
                          {time}
                        </td>
                        {weekDays.map(day => {
                          const daySchedules = getScheduleByDayTime(day, time);
                          return (
                            <td key={`${day}-${time}`} className="p-1 border min-h-[80px] align-top">
                              {daySchedules.map(schedule => (
                                <div
                                  key={schedule.id}
                                  className={`p-2 rounded mb-1 cursor-pointer text-xs ${
                                    schedule.status === '已完成' ? 'bg-green-100 text-green-800' :
                                    schedule.status === '已确认' ? 'bg-blue-100 text-blue-800' :
                                    schedule.status === '取消' ? 'bg-red-100 text-red-800 line-through' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}
                                  onClick={() => {
                                    setSelectedSchedule(schedule);
                                    setDetailDialogOpen(true);
                                  }}
                                >
                                  <div className="font-medium truncate">{schedule.courseName}</div>
                                  <div className="truncate">{schedule.studentName}</div>
                                  <div className="truncate text-gray-500">{schedule.teacherName}</div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 排课详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>排课详情</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">排课编号</Label>
                  <div className="font-medium">{selectedSchedule.scheduleId}</div>
                </div>
                <div>
                  <Label className="text-gray-500">状态</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedSchedule.status)}
                    <Badge className={getStatusColor(selectedSchedule.status)}>
                      {selectedSchedule.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">学生</Label>
                  <div className="font-medium">{selectedSchedule.studentName}</div>
                </div>
                <div>
                  <Label className="text-gray-500">导师</Label>
                  <div className="font-medium">{selectedSchedule.teacherName}</div>
                </div>
                <div>
                  <Label className="text-gray-500">课程</Label>
                  <div className="font-medium">{selectedSchedule.courseName}</div>
                </div>
                <div>
                  <Label className="text-gray-500">课时</Label>
                  <div className="font-medium">{selectedSchedule.hours}小时</div>
                </div>
                <div>
                  <Label className="text-gray-500">日期</Label>
                  <div className="font-medium">{selectedSchedule.date} ({selectedSchedule.weekDay})</div>
                </div>
                <div>
                  <Label className="text-gray-500">时间</Label>
                  <div className="font-medium">{selectedSchedule.timeSlot}</div>
                </div>
              </div>
              {selectedSchedule.notes && (
                <div>
                  <Label className="text-gray-500">备注</Label>
                  <div className="p-2 bg-gray-50 rounded">{selectedSchedule.notes}</div>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4">
                {selectedSchedule.status === '待确认' && (
                  <>
                    <Button variant="outline" onClick={() => handleUpdateStatus(selectedSchedule, '已确认')}>
                      确认排课
                    </Button>
                    <Button variant="destructive" onClick={() => handleUpdateStatus(selectedSchedule, '取消')}>
                      取消排课
                    </Button>
                  </>
                )}
                {selectedSchedule.status === '已确认' && (
                  <Button onClick={() => handleUpdateStatus(selectedSchedule, '已完成')}>
                    标记完成
                  </Button>
                )}
                <Button variant="ghost" onClick={() => handleDeleteSchedule(selectedSchedule)}>
                  删除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 确认弹窗 */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

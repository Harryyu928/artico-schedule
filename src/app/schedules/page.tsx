'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  CalendarDays,
  Sun,
  Sunrise,
  CalendarRange
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
import { 
  PageContainer, 
  PageHeader, 
  StatCard, 
  AnimatedCard,
  LoadingSpinner,
  EmptyState,
  AnimatedTable
} from '@/components/ui/animated';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

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
type TimeFilter = 'all' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'thisMonth';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// 时间筛选选项配置
const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <CalendarRange className="w-4 h-4" /> },
  { value: 'today', label: '今日', icon: <Sun className="w-4 h-4" /> },
  { value: 'tomorrow', label: '明日', icon: <Sunrise className="w-4 h-4" /> },
  { value: 'thisWeek', label: '本周', icon: <CalendarDays className="w-4 h-4" /> },
  { value: 'nextWeek', label: '下周', icon: <Calendar className="w-4 h-4" /> },
  { value: 'thisMonth', label: '本月', icon: <CalendarRange className="w-4 h-4" /> },
];

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

  // 时间筛选状态
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // 当时间筛选改变时，同步日历视图的周
  useEffect(() => {
    if (viewMode === 'calendar') {
      if (timeFilter === 'thisWeek') {
        setCurrentWeekStart(getCurrentWeekStart());
      } else if (timeFilter === 'nextWeek') {
        const nextMonday = new Date();
        const dayOfWeek = nextMonday.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        nextMonday.setDate(nextMonday.getDate() + diffToMonday + 7);
        setCurrentWeekStart(nextMonday.toISOString().split('T')[0]);
      }
    }
  }, [timeFilter, viewMode]);

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

  // 根据时间筛选获取日期范围
  function getDateRange(filter: TimeFilter): { startDate?: string; endDate?: string } {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today) };
      
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return { startDate: formatDate(tomorrow), endDate: formatDate(tomorrow) };
      
      case 'thisWeek':
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { startDate: formatDate(weekStart), endDate: formatDate(weekEnd) };
      
      case 'nextWeek':
        const nextWeekStart = new Date(today);
        const nextDayOfWeek = today.getDay();
        const nextDiffToMonday = nextDayOfWeek === 0 ? -6 : 1 - nextDayOfWeek;
        nextWeekStart.setDate(today.getDate() + nextDiffToMonday + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        return { startDate: formatDate(nextWeekStart), endDate: formatDate(nextWeekEnd) };
      
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: formatDate(monthStart), endDate: formatDate(monthEnd) };
      
      case 'all':
      default:
        return {};
    }
  }

  // 获取排课列表
  useEffect(() => {
    fetchSchedules();
    fetchStudents();
    fetchTeachers();
    fetchCourses();
  }, [timeFilter]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      
      // 根据时间筛选获取日期范围
      const dateRange = getDateRange(timeFilter);
      const params = new URLSearchParams();
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      const url = `/api/schedule${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
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
            description: '正在执行自动排课，请稍候...',
          });

          const response = await fetch('/api/schedule/auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              weeks: 1,
              hoursPerWeek: 2,
              priorityRule: 'remaining_hours',
            }),
          });

          if (!response.ok) throw new Error('自动排课失败');

          const result = await response.json();
          
          toast({
            title: '自动排课完成',
            description: `成功安排 ${result.scheduled} 节课程${result.failed > 0 ? `，${result.failed} 节失败` : ''}`,
            variant: result.failed > 0 ? 'default' : 'default',
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
    <PageContainer>
      {/* 页面标题 */}
      <PageHeader
        title="排课管理"
        description="管理课程安排和排课计划"
        actions={
          <>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <Button variant="outline" onClick={handleExport} disabled={loading || schedules.length === 0} className="btn-secondary-animated">
                <Download className="mr-2 h-4 w-4" />
                导出数据
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="btn-secondary-animated">
                    <Plus className="mr-2 h-4 w-4" />
                    手动排课
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] modal-content">
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
                    <Button onClick={handleCreateSchedule} className="btn-primary-animated">创建排课</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Button onClick={handleAutoSchedule} className="btn-primary-animated">
                <Sparkles className="mr-2 h-4 w-4" />
                自动排课
              </Button>
            </motion.div>
          </>
        }
      />

      {/* 时间筛选快捷按钮 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground mr-2">时间筛选:</span>
              {TIME_FILTER_OPTIONS.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={timeFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTimeFilter(option.value);
                      setCurrentPage(1);
                    }}
                    className={`
                      ${timeFilter === option.value 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md' 
                        : 'border-orange-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'
                      }
                    `}
                  >
                    {option.icon}
                    <span className="ml-1">{option.label}</span>
                  </Button>
                </motion.div>
              ))}
              
              {/* 当前筛选范围提示 */}
              {timeFilter !== 'all' && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-muted-foreground ml-2 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full"
                >
                  {(() => {
                    const range = getDateRange(timeFilter);
                    if (range.startDate && range.endDate) {
                      return range.startDate === range.endDate 
                        ? `${range.startDate}`
                        : `${range.startDate} ~ ${range.endDate}`;
                    }
                    return '';
                  })()}
                </motion.span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="总排课数"
            value={stats.total}
            icon={<CalendarDays className="h-6 w-6" />}
            delay={0.1}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="待确认"
            value={stats.pending}
            icon={<AlertCircle className="h-6 w-6" />}
            delay={0.2}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="已确认"
            value={stats.confirmed}
            icon={<CheckCircle className="h-6 w-6" />}
            delay={0.3}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="已完成"
            value={stats.completed}
            icon={<CheckCircle className="h-6 w-6" />}
            delay={0.4}
          />
        </motion.div>
      </motion.div>

      {/* 视图切换和搜索 */}
      <AnimatedCard delay={0.3}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <List className="h-4 w-4 mr-1" />
                    列表
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className={viewMode === 'calendar' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    日历
                  </Button>
                </motion.div>
              </div>
              <div className="flex gap-2">
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索学生/导师/课程..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 w-64 input-animated"
                  />
                </motion.div>
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
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <LoadingSpinner size="lg" />
                    <p className="text-gray-500 mt-4">加载中...</p>
                  </motion.div>
                ) : filteredAndSortedSchedules.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-16 w-16" />}
                    title="暂无排课数据"
                    description="点击下方按钮执行自动排课"
                    action={
                      <Button onClick={handleAutoSchedule} className="btn-primary-animated">
                        <Sparkles className="mr-2 h-4 w-4" />
                        自动排课
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <AnimatedTable>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('scheduleId')}
                            >
                              <div className="flex items-center gap-1">
                                排课编号 {getSortIcon('scheduleId')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('date')}
                            >
                              <div className="flex items-center gap-1">
                                日期 {getSortIcon('date')}
                              </div>
                            </TableHead>
                            <TableHead>时间</TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('studentName')}
                            >
                              <div className="flex items-center gap-1">
                                学生 {getSortIcon('studentName')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('teacherName')}
                            >
                              <div className="flex items-center gap-1">
                                导师 {getSortIcon('teacherName')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('courseName')}
                            >
                              <div className="flex items-center gap-1">
                                课程 {getSortIcon('courseName')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => handleSort('hours')}
                            >
                              <div className="flex items-center gap-1">
                                时长 {getSortIcon('hours')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-orange-50 transition-colors"
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
                          <AnimatePresence mode="popLayout">
                            {paginatedSchedules.map((schedule, index) => (
                              <motion.tr
                                key={schedule.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                className="group border-b hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent transition-all"
                              >
                                <TableCell className="font-medium">
                                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                    {schedule.scheduleId}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>{schedule.date}</span>
                                    <span className="text-gray-400 text-xs">({schedule.weekDay})</span>
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
                                    <span className="group-hover:text-orange-600 transition-colors">{schedule.studentName}</span>
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
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedSchedule(schedule);
                                          setDetailDialogOpen(true);
                                        }}
                                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                    {schedule.status === '待确认' && (
                                      <>
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleUpdateStatus(schedule, '已确认')}
                                            className="text-xs"
                                          >
                                            确认
                                          </Button>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleUpdateStatus(schedule, '取消')}
                                            className="text-xs"
                                          >
                                            取消
                                          </Button>
                                        </motion.div>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </AnimatedTable>

                    {/* 分页 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-between mt-6"
                    >
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
                          共 <span className="font-medium text-orange-600">{filteredAndSortedSchedules.length}</span> 条，第 {currentPage}/{totalPages} 页
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="btn-secondary-animated"
                        >
                          首页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="btn-secondary-animated"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 py-2 bg-orange-50 rounded-lg text-sm font-medium text-orange-600">
                          {currentPage}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="btn-secondary-animated"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="btn-secondary-animated"
                        >
                          末页
                        </Button>
                      </div>
                    </motion.div>
                  </>
                )}
              </>
            )}

            {/* 日历视图 */}
            {viewMode === 'calendar' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* 周导航 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button variant="outline" size="sm" onClick={() => {
                        const start = new Date(currentWeekStart);
                        start.setDate(start.getDate() - 7);
                        setCurrentWeekStart(start.toISOString().split('T')[0]);
                        setTimeFilter('all'); // 切换周时重置时间筛选
                      }}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setCurrentWeekStart(getCurrentWeekStart());
                          setTimeFilter('thisWeek');
                        }}
                        className="text-orange-600 hover:bg-orange-50"
                      >
                        本周
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button variant="outline" size="sm" onClick={() => {
                        const start = new Date(currentWeekStart);
                        start.setDate(start.getDate() + 7);
                        setCurrentWeekStart(start.toISOString().split('T')[0]);
                        setTimeFilter('all'); // 切换周时重置时间筛选
                      }}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-orange-600">{getWeekDateRange()}</span>
                    {timeFilter !== 'all' && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        {TIME_FILTER_OPTIONS.find(o => o.value === timeFilter)?.label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 日历网格 */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="p-3 border bg-gradient-to-r from-orange-50 to-amber-50 w-20 font-medium">时间</th>
                        {weekDays.map((day, index) => {
                          const date = new Date(currentWeekStart);
                          date.setDate(date.getDate() + index);
                          const isWeekend = index >= 5;
                          return (
                            <th key={day} className={`p-3 border text-center ${isWeekend ? 'bg-gray-50' : 'bg-gradient-to-r from-orange-50 to-amber-50'}`}>
                              <div className="font-medium">{day}</div>
                              <div className="text-xs text-gray-400 mt-1">{date.getMonth() + 1}/{date.getDate()}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time, timeIndex) => (
                        <motion.tr
                          key={time}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: timeIndex * 0.05 }}
                        >
                          <td className="p-2 border bg-gray-50 font-medium text-center text-sm">
                            {time}
                          </td>
                          {weekDays.map((day, dayIndex) => {
                            const daySchedules = getScheduleByDayTime(day, time);
                            const isWeekend = dayIndex >= 5;
                            return (
                              <td key={`${day}-${time}`} className={`p-1 border min-h-[80px] align-top ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                <AnimatePresence>
                                  {daySchedules.map((schedule, idx) => (
                                    <motion.div
                                      key={schedule.id}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ delay: idx * 0.05 }}
                                      whileHover={{ scale: 1.02, y: -2 }}
                                      className={`p-2 rounded-lg mb-1 cursor-pointer text-xs shadow-sm transition-all ${
                                        schedule.status === '已完成' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' :
                                        schedule.status === '已确认' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200' :
                                        schedule.status === '取消' ? 'bg-gray-100 text-gray-400 line-through' :
                                        'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200'
                                      }`}
                                      onClick={() => {
                                        setSelectedSchedule(schedule);
                                        setDetailDialogOpen(true);
                                      }}
                                    >
                                      <div className="font-medium truncate">{schedule.courseName}</div>
                                      <div className="truncate mt-0.5">{schedule.studentName}</div>
                                      <div className="truncate text-gray-500 mt-0.5 text-xs">{schedule.teacherName}</div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* 排课详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="modal-content">
          <DialogHeader>
            <DialogTitle>排课详情</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">排课编号</Label>
                  <div className="font-medium text-orange-600">{selectedSchedule.scheduleId}</div>
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
                  <Button onClick={() => handleUpdateStatus(selectedSchedule, '已完成')} className="btn-primary-animated">
                    标记完成
                  </Button>
                )}
                <Button variant="ghost" onClick={() => handleDeleteSchedule(selectedSchedule)}>
                  删除
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* 确认弹窗 */}
      <ConfirmDialog {...confirmDialogProps} />
    </PageContainer>
  );
}

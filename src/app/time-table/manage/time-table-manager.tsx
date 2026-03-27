'use client';

/**
 * 时间表管理组件
 * 
 * 管理员/规划顾问查看所有学生/导师的时间表
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Users, 
  UserCheck, 
  Calendar, 
  Clock, 
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

// 时间段定义
const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'] as const;
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

type TimeSlot = typeof TIME_SLOTS[number];
type WeekDay = typeof WEEK_DAYS[number];

interface TimeTableSummary {
  id: string;
  name: string;
  role: string;
  status: '未填写' | '部分填写' | '已填写' | '已确认';
  availableSlots: number;
  scheduledSlots: number;
  totalHours: number;
  confirmedAt?: string;
}

interface TimeTableDetail {
  id: string;
  name: string;
  role: string;
  slots: Array<{
    weekDay: WeekDay;
    timeSlot: TimeSlot;
    isAvailable: boolean;
    status: 'available' | 'scheduled' | 'unavailable';
  }>;
}

export function TimeTableManager() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [students, setStudents] = useState<TimeTableSummary[]>([]);
  const [teachers, setTeachers] = useState<TimeTableSummary[]>([]);
  const [selectedItem, setSelectedItem] = useState<TimeTableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取学生列表
      const studentsRes = await fetch('/api/students');
      const studentsData = await studentsRes.json();
      
      // 获取导师列表
      const teachersRes = await fetch('/api/teachers');
      const teachersData = await teachersRes.json();
      
      // 获取时间表状态
      const [studentsWithStatus, teachersWithStatus] = await Promise.all([
        Promise.all((studentsData.students || []).map(async (s: any) => {
          try {
            const timeTableRes = await fetch(`/api/time-table/student/${s.id}`);
            const timeTableData = await timeTableRes.json();
            if (timeTableData.success && timeTableData.data) {
              return {
                id: s.id,
                name: s.name,
                role: '学生',
                status: timeTableData.data.status || '未填写',
                availableSlots: timeTableData.data.totalAvailable || 0,
                scheduledSlots: 0,
                totalHours: (timeTableData.data.totalAvailable || 0) * 2,
                confirmedAt: timeTableData.data.confirmedAt,
              };
            }
          } catch (e) {}
          return {
            id: s.id,
            name: s.name,
            role: '学生',
            status: '未填写' as const,
            availableSlots: 0,
            scheduledSlots: 0,
            totalHours: 0,
          };
        })),
        Promise.all((teachersData.teachers || []).map(async (t: any) => {
          try {
            const timeTableRes = await fetch(`/api/time-table/teacher/${t.id}`);
            const timeTableData = await timeTableRes.json();
            if (timeTableData.success && timeTableData.data) {
              const weeklyStats = timeTableData.data.weeklyStats || {};
              return {
                id: t.id,
                name: t.name,
                role: t.teacherType === '全职' ? '全职导师' : '兼职导师',
                status: weeklyStats.confirmedAt ? '已确认' : '已填写',
                availableSlots: weeklyStats.totalAvailable || 0,
                scheduledSlots: weeklyStats.scheduled || 0,
                totalHours: weeklyStats.remaining || 0,
                confirmedAt: weeklyStats.confirmedAt,
              };
            }
          } catch (e) {}
          return {
            id: t.id,
            name: t.name,
            role: t.teacherType === '全职' ? '全职导师' : '兼职导师',
            status: '未填写' as const,
            availableSlots: 0,
            scheduledSlots: 0,
            totalHours: 0,
          };
        })),
      ]);
      
      setStudents(studentsWithStatus);
      setTeachers(teachersWithStatus);
    } catch (error) {
      console.error('获取数据失败:', error);
      toast({
        title: '获取数据失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (id: string, role: string) => {
    setDetailLoading(true);
    setSelectedItem(null);
    
    try {
      const apiPath = role === '学生' 
        ? `/api/time-table/student/${id}`
        : `/api/time-table/teacher/${id}`;
      
      const res = await fetch(apiPath);
      const data = await res.json();
      
      if (data.success) {
        const slots = data.data.slots || data.data.weeklySchedule?.slots || data.data.defaultTemplate || [];
        setSelectedItem({
          id,
          name: data.data.studentName || data.data.teacherName || '未知',
          role,
          slots: slots.map((s: any) => ({
            weekDay: s.weekDay,
            timeSlot: s.timeSlot,
            isAvailable: s.isAvailable,
            status: s.status || (s.isAvailable ? 'available' : 'unavailable'),
          })),
        });
      }
    } catch (error) {
      console.error('获取详情失败:', error);
      toast({
        title: '获取详情失败',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filterByStatus = (items: TimeTableSummary[]) => {
    if (statusFilter === 'all') return items;
    if (statusFilter === 'confirmed') return items.filter(i => i.status === '已确认');
    if (statusFilter === 'unconfirmed') return items.filter(i => i.status !== '已确认');
    if (statusFilter === 'unfilled') return items.filter(i => i.status === '未填写');
    return items;
  };

  const filterBySearch = (items: TimeTableSummary[]) => {
    if (!searchTerm) return items;
    return items.filter(i => i.name.includes(searchTerm));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      '已确认': { className: 'bg-green-500 text-white', icon: <CheckCircle className="w-3 h-3" /> },
      '已填写': { className: 'bg-orange-500 text-white', icon: <CheckCircle className="w-3 h-3" /> },
      '部分填写': { className: 'bg-yellow-500 text-white', icon: <AlertCircle className="w-3 h-3" /> },
      '未填写': { className: 'bg-gray-300 text-gray-700', icon: <AlertCircle className="w-3 h-3" /> },
    };
    const v = variants[status] || variants['未填写'];
    return (
      <Badge className={cn('flex items-center gap-1', v.className)}>
        {v.icon}
        {status}
      </Badge>
    );
  };

  const getSlotColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-orange-500 text-white';
      case 'scheduled': return 'bg-blue-500 text-white';
      default: return 'bg-gray-100';
    }
  };

  // 统计
  const stats = {
    totalStudents: students.length,
    confirmedStudents: students.filter(s => s.status === '已确认').length,
    unfilledStudents: students.filter(s => s.status === '未填写').length,
    totalTeachers: teachers.length,
    confirmedTeachers: teachers.filter(t => t.status === '已确认').length,
    unfilledTeachers: teachers.filter(t => t.status === '未填写').length,
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📅 时间表管理</h1>
          <p className="text-muted-foreground mt-1">
            查看和管理所有学生、导师的时间表
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{stats.totalStudents}</div>
              <div className="text-sm text-muted-foreground">学生总数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.confirmedStudents}</div>
              <div className="text-sm text-muted-foreground">已确认</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.unfilledStudents}</div>
              <div className="text-sm text-muted-foreground">未填写</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.totalTeachers}</div>
              <div className="text-sm text-muted-foreground">导师总数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.confirmedTeachers}</div>
              <div className="text-sm text-muted-foreground">已确认</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.unfilledTeachers}</div>
              <div className="text-sm text-muted-foreground">未填写</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索姓名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="confirmed">已确认</SelectItem>
            <SelectItem value="unconfirmed">未确认</SelectItem>
            <SelectItem value="unfilled">未填写</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 主内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 列表 */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                学生 ({filterByStatus(filterBySearch(students)).length})
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                导师 ({filterByStatus(filterBySearch(teachers)).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>可用时段</TableHead>
                          <TableHead>可用课时</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByStatus(filterBySearch(students)).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterByStatus(filterBySearch(students)).map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{getStatusBadge(student.status)}</TableCell>
                              <TableCell>
                                <span className="text-orange-500 font-medium">{student.availableSlots}</span>
                                <span className="text-gray-400"> 个</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-orange-500 font-medium">{student.totalHours}</span>
                                <span className="text-gray-400"> h</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => viewDetail(student.id, '学生')}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  查看
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teachers">
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>可用/已排</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByStatus(filterBySearch(teachers)).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterByStatus(filterBySearch(teachers)).map((teacher) => (
                            <TableRow key={teacher.id}>
                              <TableCell className="font-medium">{teacher.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{teacher.role}</Badge>
                              </TableCell>
                              <TableCell>{getStatusBadge(teacher.status)}</TableCell>
                              <TableCell>
                                <span className="text-orange-500 font-medium">{teacher.availableSlots}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-blue-500 font-medium">{teacher.scheduledSlots}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => viewDetail(teacher.id, teacher.role)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  查看
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 详情面板 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                时间表详情
              </CardTitle>
              <CardDescription>
                {selectedItem ? `${selectedItem.name} 的时间表` : '点击查看按钮查看详情'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : selectedItem ? (
                <div className="space-y-4">
                  {/* 时间表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="p-1 border bg-gray-50 w-10 text-xs"></th>
                          {TIME_SLOTS.map(slot => (
                            <th key={slot} className="p-1 border bg-gray-50 text-center text-xs">
                              {slot}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {WEEK_DAYS.map(weekDay => (
                          <tr key={weekDay}>
                            <td className="p-1 border bg-gray-50 text-center text-xs font-medium">
                              {weekDay}
                            </td>
                            {TIME_SLOTS.map(timeSlot => {
                              const slot = selectedItem.slots.find(
                                s => s.weekDay === weekDay && s.timeSlot === timeSlot
                              );
                              const status = slot?.status || 'unavailable';
                              
                              return (
                                <td
                                  key={timeSlot}
                                  className={cn(
                                    'p-1 border text-center text-xs',
                                    getSlotColor(status),
                                  )}
                                >
                                  {status === 'available' ? '✓' : status === 'scheduled' ? '📚' : ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* 图例 */}
                  <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>可用</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>已排课</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                      <span>不可用</span>
                    </div>
                  </div>
                  
                  {/* 统计 */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-orange-500">
                        {selectedItem.slots.filter(s => s.status === 'available').length}
                      </div>
                      <div className="text-xs text-gray-500">可用时段</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold text-blue-500">
                        {selectedItem.slots.filter(s => s.status === 'scheduled').length}
                      </div>
                      <div className="text-xs text-gray-500">已排课</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mb-3 opacity-30" />
                  <p>选择用户查看时间表</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  MoreVertical,
  User,
  Settings,
  ExternalLink,
  Check,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Clock
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { exportToCSV, teacherExportColumns } from '@/lib/export-utils';

interface Course {
  id: string;
  courseId: string;
  name: string;
  type: string;
  category: string;
  duration: string;
  description?: string;
}

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  teachableCourses: string[];
  maxWeeklyHours: number;
  currentHours: number;
  teacherType?: string;
  createdAt: string;
  // 飞书多维表格对接新字段
  cooperationStatus?: string; // 合作性质
  employmentStatus?: string; // 就职状态
  majorDirections?: string[]; // 专业方向（多选）
  wechatId?: string;
  meetingLink?: string;
  idType?: string;
  idNumber?: string;
  bankName?: string;
  bankAccount?: string;
  contractExpiry?: string;
  projectCourseCount?: number;
  settledCount?: number;
  settlementRate?: number;
}

type SortField = 'teacherId' | 'name' | 'teacherType' | 'maxWeeklyHours' | 'currentHours' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();
  const { confirm, confirmDialogProps } = useConfirmDialog();

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 表单状态
  const [formData, setFormData] = useState({
    teacherId: '',
    name: '',
    teachableCourses: [] as string[],
    maxWeeklyHours: 20,
    teacherType: 'full_time',
  });

  // 获取导师和课程列表
  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  // 获取课程列表
  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('获取导师列表失败:', error);
      toast({
        title: '错误',
        description: '获取导师列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 基于课程数据动态计算
  const courseNameMap: Record<string, string> = courses.reduce((acc, course) => {
    acc[course.category] = `${course.category} ${course.name}`;
    return acc;
  }, {} as Record<string, string>);

  const foundationCourses = courses
    .filter(c => c.type === '基础课')
    .map(c => c.category);
  
  const projectCourses = courses
    .filter(c => c.type === '项目课')
    .map(c => c.category);

  // 创建或更新导师
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTeacher 
        ? `/api/teachers/${editingTeacher.id}`
        : '/api/teachers';
      
      const response = await fetch(url, {
        method: editingTeacher ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('操作失败');

      toast({
        title: '成功',
        description: editingTeacher ? '导师信息已更新' : '导师已创建',
      });

      setDialogOpen(false);
      setEditingTeacher(null);
      resetForm();
      fetchTeachers();
    } catch (error) {
      console.error('操作失败:', error);
      toast({
        title: '错误',
        description: '操作失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 删除导师
  const handleDelete = (teacher: Teacher) => {
    confirm(
      '确认删除',
      `确定要删除导师「${teacher.name}」吗？此操作无法撤销。`,
      async () => {
        try {
          const response = await fetch(`/api/teachers/${teacher.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('删除失败');

          toast({
            title: '成功',
            description: '导师已删除',
          });

          fetchTeachers();
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

  // 编辑导师
  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacherId: teacher.teacherId,
      name: teacher.name,
      teachableCourses: teacher.teachableCourses,
      maxWeeklyHours: teacher.maxWeeklyHours,
      teacherType: teacher.teacherType || 'full_time',
    });
    setDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      teacherId: '',
      name: '',
      teachableCourses: [],
      maxWeeklyHours: 20,
      teacherType: 'full_time',
    });
  };

  // 切换课程选择
  const toggleCourse = (course: string) => {
    setFormData(prev => ({
      ...prev,
      teachableCourses: prev.teachableCourses.includes(course)
        ? prev.teachableCourses.filter(c => c !== course)
        : [...prev.teachableCourses, course]
    }));
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

  // 过滤和排序导师
  const filteredAndSortedTeachers = useMemo(() => {
    let result = teachers.filter(teacher =>
      teacher.name.includes(searchTerm) || 
      teacher.teacherId.includes(searchTerm)
    );

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'teacherId':
        case 'name':
        case 'teacherType':
          comparison = (a[sortField] || '').localeCompare(b[sortField] || '', 'zh-CN');
          break;
        case 'maxWeeklyHours':
        case 'currentHours':
          comparison = (a[sortField] || 0) - (b[sortField] || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [teachers, searchTerm, sortField, sortOrder]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedTeachers.length / pageSize);
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedTeachers.slice(start, start + pageSize);
  }, [filteredAndSortedTeachers, currentPage, pageSize]);

  // 导出数据
  const handleExport = () => {
    if (filteredAndSortedTeachers.length === 0) {
      toast({
        title: '提示',
        description: '没有可导出的数据',
        variant: 'default',
      });
      return;
    }

    // 准备导出数据
    const exportData = filteredAndSortedTeachers.map(teacher => ({
      ...teacher,
      subjects: teacher.teachableCourses.join('; '),
      currentWeekHours: teacher.currentHours,
      phone: '',
      email: '',
      feishuId: '',
      status: '在职',
      createdAt: new Date(teacher.createdAt).toLocaleDateString('zh-CN'),
    }));

    exportToCSV(exportData, teacherExportColumns, '导师列表');
    
    toast({
      title: '导出成功',
      description: `已导出 ${exportData.length} 条导师数据`,
    });
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: teachers.length,
    fullTime: teachers.filter(t => t.teacherType === 'full_time' || !t.teacherType).length,
    partTime: teachers.filter(t => t.teacherType === 'part_time').length,
  }), [teachers]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">导师管理</h1>
          <p className="text-gray-500 mt-1">管理导师信息和课程安排</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={loading || teachers.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTeacher(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加导师
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingTeacher ? '编辑导师' : '添加导师'}</DialogTitle>
                <DialogDescription>
                  {editingTeacher ? '修改导师信息' : '填写导师基本信息'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">导师编号</Label>
                    <Input
                      id="teacherId"
                      value={formData.teacherId}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                      placeholder="例如: TCH001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入姓名"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherType">导师类型</Label>
                  <Select
                    value={formData.teacherType}
                    onValueChange={(value) => setFormData({ ...formData, teacherType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择导师类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">全职导师</SelectItem>
                      <SelectItem value="part_time">兼职导师</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>可授课程</Label>
                      <span className="text-xs text-muted-foreground">（点击下方课程进行勾选）</span>
                    </div>
                    <Link href="/courses" target="_blank">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-orange-600"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        添加新课程
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  {courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <p className="text-sm text-muted-foreground mb-3">课程库暂无课程</p>
                      <Link href="/courses" target="_blank">
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          前往添加课程
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* 基础课 */}
                      {foundationCourses.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              基础课
                            </Badge>
                            <span className="text-xs text-muted-foreground">Foundation ({foundationCourses.length})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {foundationCourses.map(course => (
                              <Button
                                key={course}
                                type="button"
                                variant={formData.teachableCourses.includes(course) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleCourse(course)}
                                className={`justify-start text-left h-auto py-2 px-3 ${
                                  formData.teachableCourses.includes(course) 
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                                    : 'border-orange-200 hover:bg-orange-50 hover:border-orange-300'
                                }`}
                              >
                                {formData.teachableCourses.includes(course) && (
                                  <Check className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                )}
                                <span className="text-xs truncate">{courseNameMap[course]}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 项目课 */}
                      {projectCourses.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                              项目课
                            </Badge>
                            <span className="text-xs text-muted-foreground">Project ({projectCourses.length})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {projectCourses.map(course => (
                              <Button
                                key={course}
                                type="button"
                                variant={formData.teachableCourses.includes(course) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleCourse(course)}
                                className={`justify-start text-left h-auto py-2 px-3 ${
                                  formData.teachableCourses.includes(course) 
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' 
                                    : 'border-amber-200 hover:bg-amber-50 hover:border-amber-300'
                                }`}
                              >
                                {formData.teachableCourses.includes(course) && (
                                  <Check className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                )}
                                <span className="text-xs truncate">{courseNameMap[course]}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxWeeklyHours">周最大课时</Label>
                  <Input
                    id="maxWeeklyHours"
                    type="number"
                    value={formData.maxWeeklyHours}
                    onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) || 0 })}
                    placeholder="请输入周最大课时"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingTeacher(null);
                      resetForm();
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit">
                    {editingTeacher ? '更新' : '创建'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              总导师数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              全职导师
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.fullTime}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              兼职导师
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.partTime}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>导师列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索导师..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : filteredAndSortedTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无导师数据</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加第一个导师
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
                        onClick={() => handleSort('teacherId')}
                      >
                        <div className="flex items-center gap-1">
                          导师编号 {getSortIcon('teacherId')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          姓名 {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('teacherType')}
                      >
                        <div className="flex items-center gap-1">
                          类型 {getSortIcon('teacherType')}
                        </div>
                      </TableHead>
                      <TableHead>可授课程</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('currentHours')}
                      >
                        <div className="flex items-center gap-1">
                          周课时 {getSortIcon('currentHours')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          创建时间 {getSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTeachers.map((teacher) => {
                      const hoursPercentage = Math.round((teacher.currentHours / teacher.maxWeeklyHours) * 100);
                      const isOverHours = teacher.currentHours > teacher.maxWeeklyHours;
                      
                      return (
                        <TableRow key={teacher.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{teacher.teacherId}</TableCell>
                          <TableCell>
                            <span className="font-medium">{teacher.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={teacher.teacherType === 'part_time' ? 'secondary' : 'default'}>
                              {teacher.teacherType === 'part_time' ? '兼职' : '全职'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 max-w-xs">
                              {/* 基础课 */}
                              {teacher.teachableCourses.filter(c => foundationCourses.includes(c)).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-[10px] text-orange-600 font-medium mr-1">基础:</span>
                                  {teacher.teachableCourses
                                    .filter(c => foundationCourses.includes(c))
                                    .slice(0, 2)
                                    .map(course => (
                                      <Badge 
                                        key={course} 
                                        variant="outline" 
                                        className="text-[10px] whitespace-nowrap bg-orange-50 text-orange-700 border-orange-200"
                                      >
                                        {course}
                                      </Badge>
                                    ))}
                                  {teacher.teachableCourses.filter(c => foundationCourses.includes(c)).length > 2 && (
                                    <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-600 border-orange-200">
                                      +{teacher.teachableCourses.filter(c => foundationCourses.includes(c)).length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {/* 项目课 */}
                              {teacher.teachableCourses.filter(c => projectCourses.includes(c)).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-[10px] text-amber-600 font-medium mr-1">项目:</span>
                                  {teacher.teachableCourses
                                    .filter(c => projectCourses.includes(c))
                                    .slice(0, 2)
                                    .map(course => (
                                      <Badge 
                                        key={course} 
                                        variant="outline" 
                                        className="text-[10px] whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200"
                                      >
                                        {course}
                                      </Badge>
                                    ))}
                                  {teacher.teachableCourses.filter(c => projectCourses.includes(c)).length > 2 && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-600 border-amber-200">
                                      +{teacher.teachableCourses.filter(c => projectCourses.includes(c)).length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={isOverHours ? 'text-red-500 font-medium' : ''}>
                                  {teacher.currentHours}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span>{teacher.maxWeeklyHours}</span>
                              </div>
                              <Progress 
                                value={Math.min(hoursPercentage, 100)} 
                                className={`h-1.5 ${isOverHours ? 'bg-red-100' : ''}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(teacher.createdAt).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(teacher)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(teacher)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    共 {filteredAndSortedTeachers.length} 条，第 {currentPage}/{totalPages} 页
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
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

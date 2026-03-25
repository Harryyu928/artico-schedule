'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  MoreVertical,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  FileSpreadsheet
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
import { exportToCSV, studentExportColumns } from '@/lib/export-utils';

interface Student {
  id: string;
  studentId: string;
  name: string;
  major: string;
  applicationCountry: string;
  currentStage: string;
  totalHours: number;
  usedHours: number;
  createdAt: string;
}

type SortField = 'studentId' | 'name' | 'major' | 'currentStage' | 'totalHours' | 'usedHours' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
    name: '',
    major: '游戏设计',
    applicationCountry: '美国',
    currentStage: '基础阶段',
    totalHours: 100,
  });

  // 获取学生列表
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('获取学生列表失败:', error);
      toast({
        title: '错误',
        description: '获取学生列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新学生
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingStudent 
        ? `/api/students/${editingStudent.id}`
        : '/api/students';
      
      const response = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('操作失败');

      toast({
        title: '成功',
        description: editingStudent 
          ? '学生信息已更新' 
          : `学生创建成功，编号已自动生成`,
      });

      setDialogOpen(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('操作失败:', error);
      toast({
        title: '错误',
        description: '操作失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 删除学生
  const handleDelete = (student: Student) => {
    confirm(
      '确认删除',
      `确定要删除学生「${student.name}」吗？此操作无法撤销。`,
      async () => {
        try {
          const response = await fetch(`/api/students/${student.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('删除失败');

          toast({
            title: '成功',
            description: '学生已删除',
          });

          fetchStudents();
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

  // 编辑学生
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      major: student.major,
      applicationCountry: student.applicationCountry,
      currentStage: student.currentStage,
      totalHours: student.totalHours,
    });
    setDialogOpen(true);
  };

  // 查看学生详情
  const handleView = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      major: '游戏设计',
      applicationCountry: '美国',
      currentStage: '基础阶段',
      totalHours: 100,
    });
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

  // 过滤和排序学生
  const filteredAndSortedStudents = useMemo(() => {
    let result = students.filter(student =>
      student.name.includes(searchTerm) || 
      student.studentId.includes(searchTerm) ||
      student.major.includes(searchTerm)
    );

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'studentId':
        case 'name':
        case 'major':
        case 'currentStage':
          comparison = (a[sortField] || '').localeCompare(b[sortField] || '', 'zh-CN');
          break;
        case 'totalHours':
        case 'usedHours':
          comparison = (a[sortField] || 0) - (b[sortField] || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchTerm, sortField, sortOrder]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedStudents.length / pageSize);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedStudents.slice(start, start + pageSize);
  }, [filteredAndSortedStudents, currentPage, pageSize]);

  // 导出数据
  const handleExport = () => {
    if (filteredAndSortedStudents.length === 0) {
      toast({
        title: '提示',
        description: '没有可导出的数据',
        variant: 'default',
      });
      return;
    }

    // 准备导出数据
    const exportData = filteredAndSortedStudents.map(student => ({
      ...student,
      remainingHours: student.totalHours - student.usedHours,
      consultantName: '',
      createdAt: new Date(student.createdAt).toLocaleDateString('zh-CN'),
    }));

    exportToCSV(exportData, studentExportColumns, '学生列表');
    
    toast({
      title: '导出成功',
      description: `已导出 ${exportData.length} 条学生数据`,
    });
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: students.length,
    basic: students.filter(s => s.currentStage === '基础阶段').length,
    project: students.filter(s => s.currentStage === '项目阶段').length,
    portfolio: students.filter(s => s.currentStage === '作品集打磨').length,
  }), [students]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">学生管理</h1>
          <p className="text-gray-500 mt-1">管理学生信息和课程进度</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={loading || students.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingStudent(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加学生
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingStudent ? '编辑学生' : '添加学生'}</DialogTitle>
                <DialogDescription>
                  {editingStudent ? '修改学生信息' : '填写学生基本信息'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 编辑时显示学生编号（只读） */}
                {editingStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="studentId">学生编号</Label>
                    <Input
                      id="studentId"
                      value={editingStudent.studentId}
                      disabled
                      className="bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500">学生编号不可修改</p>
                  </div>
                )}
                
                {/* 添加时显示提示 */}
                {!editingStudent && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      💡 学生编号将自动生成（按年份编号，如 202601）
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入姓名"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="major">专业方向</Label>
                  <Select
                    value={formData.major}
                    onValueChange={(value) => setFormData({ ...formData, major: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择专业方向" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="游戏设计">游戏设计</SelectItem>
                      <SelectItem value="游戏美术">游戏美术</SelectItem>
                      <SelectItem value="角色设计">角色设计</SelectItem>
                      <SelectItem value="3D游戏美术">3D游戏美术</SelectItem>
                      <SelectItem value="动画">动画</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="applicationCountry">申请国家</Label>
                    <Select
                      value={formData.applicationCountry}
                      onValueChange={(value) => setFormData({ ...formData, applicationCountry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择申请国家" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="美国">美国</SelectItem>
                        <SelectItem value="英国">英国</SelectItem>
                        <SelectItem value="加拿大">加拿大</SelectItem>
                        <SelectItem value="日本">日本</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentStage">当前阶段</Label>
                    <Select
                      value={formData.currentStage}
                      onValueChange={(value) => setFormData({ ...formData, currentStage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择当前阶段" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="基础阶段">基础阶段</SelectItem>
                        <SelectItem value="项目阶段">项目阶段</SelectItem>
                        <SelectItem value="作品集打磨">作品集打磨</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalHours">总课时</Label>
                  <Input
                    id="totalHours"
                    type="number"
                    value={formData.totalHours}
                    onChange={(e) => setFormData({ ...formData, totalHours: parseInt(e.target.value) || 0 })}
                    placeholder="请输入总课时"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingStudent(null);
                      resetForm();
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit">
                    {editingStudent ? '更新' : '创建'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              总学生数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              基础阶段
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.basic}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              项目阶段
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.project}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              作品集打磨
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.portfolio}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>学生列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无学生数据</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加第一个学生
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
                        onClick={() => handleSort('studentId')}
                      >
                        <div className="flex items-center gap-1">
                          学生编号 {getSortIcon('studentId')}
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
                        onClick={() => handleSort('major')}
                      >
                        <div className="flex items-center gap-1">
                          专业方向 {getSortIcon('major')}
                        </div>
                      </TableHead>
                      <TableHead>申请国家</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('currentStage')}
                      >
                        <div className="flex items-center gap-1">
                          当前阶段 {getSortIcon('currentStage')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('totalHours')}
                      >
                        <div className="flex items-center gap-1">
                          课时使用 {getSortIcon('totalHours')}
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
                    {paginatedStudents.map((student) => {
                      const usedPercentage = Math.round((student.usedHours / student.totalHours) * 100);
                      const isOverHours = student.usedHours > student.totalHours;
                      
                      return (
                        <TableRow key={student.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{student.studentId}</TableCell>
                          <TableCell>
                            <span className="font-medium">{student.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-orange-200 text-orange-700">
                              {student.major}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.applicationCountry}</TableCell>
                          <TableCell>
                            <Badge variant={
                              student.currentStage === '基础阶段' ? 'default' :
                              student.currentStage === '项目阶段' ? 'secondary' : 'outline'
                            }>
                              {student.currentStage}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={isOverHours ? 'text-red-500 font-medium' : ''}>
                                  {student.usedHours}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span>{student.totalHours}</span>
                                {isOverHours && (
                                  <Badge variant="destructive" className="ml-2 text-xs">超课时</Badge>
                                )}
                              </div>
                              <Progress 
                                value={Math.min(usedPercentage, 100)} 
                                className={`h-1.5 ${isOverHours ? 'bg-red-100' : ''}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(student.createdAt).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(student.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(student)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(student)}
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
                    共 {filteredAndSortedStudents.length} 条，第 {currentPage}/{totalPages} 页
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

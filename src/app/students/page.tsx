'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileSpreadsheet,
  Sparkles
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
import { 
  PageContainer, 
  PageHeader, 
  StatCard, 
  AnimatedCard,
  StaggerContainer,
  StaggerItem,
  AnimatedButton,
  AnimatedTable,
  EmptyState,
  LoadingSpinner
} from '@/components/ui/animated';
import { staggerContainerVariants, staggerItemVariants, tableRowVariants } from '@/lib/animations';

interface Student {
  id: string;
  studentId: string;
  name: string;
  major: string;
  applicationCountry: string;
  currentStage: string;
  totalHours: number;
  consumedHours: number; // 已消耗课时
  remainingHours: number; // 剩余课时
  createdAt: string;
  // 飞书多维表格对接新字段
  studentStatus?: string;
  studentCategory?: string;
  courseCategories?: string[]; // 课程类别（多选）
  teacherIds?: string[]; // 导师（多选）
  hourlyRate?: number;
  consultantId?: string;
  admissionConsultantId?: string;
}

type SortField = 'studentId' | 'name' | 'major' | 'currentStage' | 'totalHours' | 'consumedHours' | 'createdAt';
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
        case 'consumedHours':
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
      remainingHours: student.totalHours - student.consumedHours,
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
    <PageContainer>
      {/* 页面标题 */}
      <PageHeader
        title="学生管理"
        description="管理学生信息和课程进度"
        actions={
          <>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Button variant="outline" onClick={handleExport} disabled={loading || students.length === 0} className="btn-secondary-animated">
                <Download className="mr-2 h-4 w-4" />
                导出数据
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingStudent(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="btn-primary-animated">
                    <Plus className="mr-2 h-4 w-4" />
                    添加学生
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] modal-content">
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
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-orange-800 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          学生编号将自动生成（按年份编号，如 202601）
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
                        className="input-animated"
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
                      <Button type="submit" className="btn-primary-animated">
                        {editingStudent ? '更新' : '创建'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </motion.div>
          </>
        }
      />

      {/* 统计卡片 */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="总学生数"
            value={stats.total}
            icon={<Users className="h-6 w-6" />}
            delay={0.1}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="基础阶段"
            value={stats.basic}
            icon={<GraduationCap className="h-6 w-6" />}
            delay={0.2}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="项目阶段"
            value={stats.project}
            icon={<BookOpen className="h-6 w-6" />}
            delay={0.3}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="作品集打磨"
            value={stats.portfolio}
            icon={<Award className="h-6 w-6" />}
            delay={0.4}
          />
        </motion.div>
      </motion.div>

      {/* 搜索和列表 */}
      <AnimatedCard delay={0.3}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                学生列表
              </CardTitle>
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 w-64 input-animated"
                />
              </motion.div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <LoadingSpinner size="lg" />
                <p className="text-gray-500 mt-4">加载中...</p>
              </motion.div>
            ) : filteredAndSortedStudents.length === 0 ? (
              <EmptyState
                icon={<Users className="h-16 w-16" />}
                title="暂无学生数据"
                description="点击下方按钮添加第一个学生"
                action={
                  <Button onClick={() => setDialogOpen(true)} className="btn-primary-animated">
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一个学生
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
                          onClick={() => handleSort('studentId')}
                        >
                          <div className="flex items-center gap-1">
                            学生编号 {getSortIcon('studentId')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            姓名 {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => handleSort('major')}
                        >
                          <div className="flex items-center gap-1">
                            专业方向 {getSortIcon('major')}
                          </div>
                        </TableHead>
                        <TableHead>申请国家</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => handleSort('currentStage')}
                        >
                          <div className="flex items-center gap-1">
                            当前阶段 {getSortIcon('currentStage')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => handleSort('totalHours')}
                        >
                          <div className="flex items-center gap-1">
                            课时使用 {getSortIcon('totalHours')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-orange-50 transition-colors"
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
                      <AnimatePresence mode="popLayout">
                        {paginatedStudents.map((student, index) => {
                          const usedPercentage = Math.round((student.consumedHours / student.totalHours) * 100);
                          const isOverHours = student.consumedHours > student.totalHours;
                          
                          return (
                            <motion.tr
                              key={student.id}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2, delay: index * 0.02 }}
                              className="group border-b hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent transition-all"
                            >
                              <TableCell className="font-medium">
                                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                  {student.studentId}
                                </span>
                              </TableCell>
                              <TableCell>
                                <button 
                                  onClick={() => router.push(`/students/${student.id}`)}
                                  className="font-medium group-hover:text-orange-600 transition-colors hover:underline text-left"
                                >
                                  {student.name}
                                </button>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors">
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
                                      {student.consumedHours}
                                    </span>
                                    <span className="text-gray-400">/</span>
                                    <span>{student.totalHours}</span>
                                    {isOverHours && (
                                      <Badge variant="destructive" className="ml-2 text-xs animate-pulse">超课时</Badge>
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
                                    <Button variant="ghost" size="sm" className="opacity-60 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="dropdown-enter">
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
                                      className="text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
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
                      共 <span className="font-medium text-orange-600">{filteredAndSortedStudents.length}</span> 条，第 {currentPage}/{totalPages} 页
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
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* 确认弹窗 */}
      <ConfirmDialog {...confirmDialogProps} />
    </PageContainer>
  );
}

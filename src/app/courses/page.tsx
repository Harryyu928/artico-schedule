'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  MoreVertical,
  BookOpen,
  Sparkles,
  Layers,
  Clock,
  Tag
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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

interface Course {
  id: string;
  courseId: string;
  name: string;
  type: string;
  category: string;
  duration: string;
  description?: string;
  createdAt: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const { toast } = useToast();

  // 表单状态
  const [formData, setFormData] = useState({
    courseId: '',
    name: '',
    type: '基础课',
    category: 'F-GD',
    duration: '4周',
    description: '',
  });

  // 获取课程列表
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
      toast({
        title: '错误',
        description: '获取课程列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新课程
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCourse 
        ? `/api/courses/${editingCourse.id}`
        : '/api/courses';
      
      const response = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('操作失败');

      toast({
        title: '成功',
        description: editingCourse ? '课程信息已更新' : '课程已创建',
      });

      setDialogOpen(false);
      setEditingCourse(null);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error('操作失败:', error);
      toast({
        title: '错误',
        description: '操作失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 删除课程
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个课程吗？')) return;

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      toast({
        title: '成功',
        description: '课程已删除',
      });

      fetchCourses();
    } catch (error) {
      console.error('删除失败:', error);
      toast({
        title: '错误',
        description: '删除失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 编辑课程
  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      courseId: course.courseId,
      name: course.name,
      type: course.type,
      category: course.category,
      duration: course.duration,
      description: course.description || '',
    });
    setDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      courseId: '',
      name: '',
      type: '基础课',
      category: 'F-GD',
      duration: '4周',
      description: '',
    });
  };

  // 过滤课程
  const filteredCourses = courses.filter(course =>
    course.name.includes(searchTerm) || 
    course.courseId.includes(searchTerm) ||
    course.category.includes(searchTerm)
  );

  // 统计数据
  const stats = {
    total: courses.length,
    basic: courses.filter(c => c.type === '基础课').length,
    project: courses.filter(c => c.type === '项目课').length,
    categories: new Set(courses.map(c => c.category)).size,
  };

  return (
    <PageContainer>
      {/* 页面标题 */}
      <PageHeader
        title="课程管理"
        description="管理课程库和课程信息"
        actions={
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingCourse(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary-animated">
                  <Plus className="mr-2 h-4 w-4" />
                  添加课程
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] modal-content">
                <DialogHeader>
                  <DialogTitle>{editingCourse ? '编辑课程' : '添加课程'}</DialogTitle>
                  <DialogDescription>
                    {editingCourse ? '修改课程信息' : '填写课程基本信息'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseId">课程编号</Label>
                      <Input
                        id="courseId"
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        placeholder="例如: CRS001"
                        required
                        className="input-animated"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">课程名称</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="请输入课程名称"
                        required
                        className="input-animated"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">课程类型</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择课程类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="基础课">基础课</SelectItem>
                          <SelectItem value="项目课">项目课</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">课程分类</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择课程分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="F-GD">F-GD</SelectItem>
                          <SelectItem value="F-TA">F-TA</SelectItem>
                          <SelectItem value="F-GA">F-GA</SelectItem>
                          <SelectItem value="F-3D">F-3D</SelectItem>
                          <SelectItem value="F-AN">F-AN</SelectItem>
                          <SelectItem value="P-GD">P-GD</SelectItem>
                          <SelectItem value="P-AN">P-AN</SelectItem>
                          <SelectItem value="P-GA">P-GA</SelectItem>
                          <SelectItem value="P-CA">P-CA</SelectItem>
                          <SelectItem value="P-3DGA">P-3DGA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">课程时长</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择课程时长" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4周">4周</SelectItem>
                        <SelectItem value="5周">5周</SelectItem>
                        <SelectItem value="1个月">1个月</SelectItem>
                        <SelectItem value="2个月">2个月</SelectItem>
                        <SelectItem value="3个月">3个月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">课程描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="请输入课程描述"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingCourse(null);
                        resetForm();
                      }}
                    >
                      取消
                    </Button>
                    <Button type="submit" className="btn-primary-animated">
                      {editingCourse ? '更新' : '创建'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
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
            title="总课程数"
            value={stats.total}
            icon={<BookOpen className="h-6 w-6" />}
            delay={0.1}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="基础课程"
            value={stats.basic}
            icon={<Layers className="h-6 w-6" />}
            delay={0.2}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="项目课程"
            value={stats.project}
            icon={<Sparkles className="h-6 w-6" />}
            delay={0.3}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <StatCard
            title="课程分类"
            value={stats.categories}
            icon={<Tag className="h-6 w-6" />}
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
                <BookOpen className="h-5 w-5 text-orange-500" />
                课程列表
              </CardTitle>
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-16 w-16" />}
                title="暂无课程数据"
                description="点击下方按钮添加第一个课程"
                action={
                  <Button onClick={() => setDialogOpen(true)} className="btn-primary-animated">
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一个课程
                  </Button>
                }
              />
            ) : (
              <AnimatedTable>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>课程编号</TableHead>
                      <TableHead>课程名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>时长</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredCourses.map((course, index) => (
                        <motion.tr
                          key={course.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className="group border-b hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent transition-all"
                        >
                          <TableCell className="font-medium">
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                              {course.courseId}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium group-hover:text-orange-600 transition-colors">{course.name}</div>
                              {course.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs mt-0.5">
                                  {course.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={course.type === '基础课' ? 'default' : 'secondary'}
                              className={course.type === '基础课' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}
                            >
                              {course.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                              {course.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3.5 w-3.5" />
                              {course.duration}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(course.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="opacity-60 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="dropdown-enter">
                                <DropdownMenuItem onClick={() => handleEdit(course)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(course.id)}
                                  className="text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </AnimatedTable>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>
    </PageContainer>
  );
}

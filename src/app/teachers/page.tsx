'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  MoreVertical,
  User
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
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  teachableCourses: string[];
  maxWeeklyHours: number;
  currentHours: number;
  teacherType?: string;
  createdAt: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();

  // 表单状态
  const [formData, setFormData] = useState({
    teacherId: '',
    name: '',
    teachableCourses: [] as string[],
    maxWeeklyHours: 20,
    teacherType: 'full_time',
  });

  // 课程代号到完整名称的映射
  const courseNameMap: Record<string, string> = {
    'F-GD': 'F-GD 游戏设计基础',
    'F-TA': 'F-TA 技术艺术基础',
    'F-GA': 'F-GA 游戏策划基础',
    'F-3D': 'F-3D 3D建模基础',
    'F-AN': 'F-AN 游戏动画基础',
    'P-GD': 'P-GD 游戏设计进阶',
    'P-AN': 'P-AN 游戏动画进阶',
    'P-GA': 'P-GA 游戏策划进阶',
    'P-CA': 'P-CA 角色设计',
    'P-3DGA': 'P-3DGA 3D游戏艺术',
  };

  // 按类型分类课程
  const foundationCourses = ['F-GD', 'F-TA', 'F-GA', 'F-3D', 'F-AN']; // 基础课
  const projectCourses = ['P-GD', 'P-AN', 'P-GA', 'P-CA', 'P-3DGA']; // 项目课

  const courseOptions = [...foundationCourses, ...projectCourses];

  // 获取导师列表
  useEffect(() => {
    fetchTeachers();
  }, []);

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
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个导师吗？')) return;

    try {
      const response = await fetch(`/api/teachers/${id}`, {
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

  // 过滤导师
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.includes(searchTerm) || 
    teacher.teacherId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">导师管理</h1>
          <p className="text-gray-500 mt-1">管理导师信息和课程安排</p>
        </div>
        
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
                <Label>可授课程</Label>
                
                {/* 基础课 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                      基础课
                    </Badge>
                    <span className="text-xs text-muted-foreground">Foundation</span>
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
                            ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                            : 'border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        <span className="text-xs">{courseNameMap[course]}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 项目课 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                      项目课
                    </Badge>
                    <span className="text-xs text-muted-foreground">Project</span>
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
                            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                            : 'border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        <span className="text-xs">{courseNameMap[course]}</span>
                      </Button>
                    ))}
                  </div>
                </div>
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总导师数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">全职导师</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.teacherType === 'full_time' || !t.teacherType).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">兼职导师</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.teacherType === 'part_time').length}
            </div>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无导师数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>导师编号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>可授课程</TableHead>
                  <TableHead>周课时</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.teacherId}</TableCell>
                    <TableCell>{teacher.name}</TableCell>
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
                      <div className="flex items-center gap-2">
                        <span className={teacher.currentHours > teacher.maxWeeklyHours ? 'text-red-500' : ''}>
                          {teacher.currentHours}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span>{teacher.maxWeeklyHours}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(teacher.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem 
                            onClick={() => handleDelete(teacher.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

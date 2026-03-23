'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye,
  MoreVertical,
  FileText,
  Calendar,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface SelectionForm {
  id: string;
  formId: string;
  studentId: string;
  studentName?: string;
  consultationTeacherId?: string;
  teacherName?: string;
  status: string;
  totalCourses: number;
  completedCourses: number;
  totalHours: number;
  completedHours: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  notes?: string;
  goals?: string;
  createdAt: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
}

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
}

export default function SelectionFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // 表单状态
  const [formData, setFormData] = useState({
    student_id: '',
    consultation_teacher_id: '',
    estimated_start_date: '',
    estimated_end_date: '',
    notes: '',
    goals: '',
  });

  useEffect(() => {
    fetchForms();
    fetchStudents();
    fetchTeachers();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/selection-forms');
      const data = await response.json();
      
      // 获取学生和导师信息
      const formsWithNames = await Promise.all(
        (data.forms || data || []).map(async (form: any) => {
          let studentName = '未知学生';
          let teacherName = '未指定';
          
          try {
            if (form.studentId) {
              const studentRes = await fetch(`/api/students/${form.studentId}`);
              const studentData = await studentRes.json();
              studentName = studentData.student?.name || studentName;
            }
            
            if (form.consultationTeacherId) {
              const teacherRes = await fetch(`/api/teachers/${form.consultationTeacherId}`);
              const teacherData = await teacherRes.json();
              teacherName = teacherData.teacher?.name || teacherName;
            }
          } catch (error) {
            console.error('获取关联信息失败:', error);
          }
          
          return {
            ...form,
            studentName,
            teacherName,
          };
        })
      );
      
      setForms(formsWithNames);
    } catch (error) {
      console.error('获取选课单列表失败:', error);
      toast({
        title: '错误',
        description: '获取选课单列表失败',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/selection-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('创建失败');

      const newForm = await response.json();
      
      toast({
        title: '成功',
        description: '选课单创建成功',
      });

      setDialogOpen(false);
      resetForm();
      fetchForms();
      
      // 跳转到详情页面
      router.push(`/selection-forms/${newForm.id}`);
    } catch (error) {
      console.error('创建选课单失败:', error);
      toast({
        title: '错误',
        description: '创建选课单失败',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      consultation_teacher_id: '',
      estimated_start_date: '',
      estimated_end_date: '',
      notes: '',
      goals: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      '草稿': 'secondary',
      '已确认': 'default',
      '执行中': 'default',
      '已完成': 'default',
      '已取消': 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const filteredForms = forms.filter(form =>
    form.formId.includes(searchTerm) || 
    form.studentName?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">选课单管理</h1>
          <p className="text-gray-500 mt-1">管理学生的选课单和课程规划</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建选课单
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>创建选课单</DialogTitle>
              <DialogDescription>
                为学生创建新的选课单，规划课程安排
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student">学生 *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学生" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.studentId} - {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher">选课指导导师</Label>
                <Select
                  value={formData.consultation_teacher_id}
                  onValueChange={(value) => setFormData({ ...formData, consultation_teacher_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择导师（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.teacherId} - {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">预计开始日期 *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.estimated_start_date}
                    onChange={(e) => setFormData({ ...formData, estimated_start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">预计结束日期 *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.estimated_end_date}
                    onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">学习目标</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  placeholder="描述学生的学习目标和期望"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  取消
                </Button>
                <Button type="submit">
                  创建选课单
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总选课单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">执行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.filter(f => f.status === '执行中').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.filter(f => f.status === '已完成').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">平均完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.length > 0 
                ? Math.round(forms.reduce((sum, f) => sum + (f.completedHours / (f.totalHours || 1)) * 100, 0) / forms.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 选课单列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>选课单列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索选课单..."
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
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无选课单数据，点击"创建选课单"开始
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>选课单编号</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>指导导师</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>课程进度</TableHead>
                  <TableHead>课时进度</TableHead>
                  <TableHead>时间范围</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.formId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {form.studentName}
                      </div>
                    </TableCell>
                    <TableCell>{form.teacherName}</TableCell>
                    <TableCell>{getStatusBadge(form.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">{form.completedCourses}</span>
                        <span className="text-gray-400">/</span>
                        <span>{form.totalCourses}</span>
                        {form.totalCourses > 0 && (
                          <span className="text-xs text-gray-500">
                            ({Math.round(form.completedCourses / form.totalCourses * 100)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">{form.completedHours}h</span>
                        <span className="text-gray-400">/</span>
                        <span>{form.totalHours}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {new Date(form.estimatedStartDate).toLocaleDateString()} - 
                          {new Date(form.estimatedEndDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/selection-forms/${form.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/selection-forms/${form.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            添加课程
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

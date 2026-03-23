'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  MoreVertical 
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

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
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个学生吗？')) return;

    try {
      const response = await fetch(`/api/students/${id}`, {
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

  // 过滤学生
  const filteredStudents = students.filter(student =>
    student.name.includes(searchTerm) || 
    student.studentId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">学生管理</h1>
          <p className="text-gray-500 mt-1">管理学生信息和课程进度</p>
        </div>
        
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总学生数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">基础阶段</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.currentStage === '基础阶段').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">项目阶段</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.currentStage === '项目阶段').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">作品集打磨</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.currentStage === '作品集打磨').length}
            </div>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无学生数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学生编号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>专业方向</TableHead>
                  <TableHead>申请国家</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>课时使用</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.studentId}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.major}</Badge>
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
                      <div className="flex items-center gap-2">
                        <span className={student.usedHours > student.totalHours ? 'text-red-500' : ''}>
                          {student.usedHours}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span>{student.totalHours}</span>
                        {student.usedHours > student.totalHours && (
                          <Badge variant="destructive" className="ml-2">超课时</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(student.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(student)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(student.id)}
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

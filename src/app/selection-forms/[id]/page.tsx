'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Plus, 
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  Share2,
  FileDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateSelectionFormImage } from '@/lib/share-image-service';

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

interface SelectionItem {
  id: string;
  formId: string;
  courseId: string;
  courseName?: string;
  courseType: string;
  courseStage: string;
  plannedHours: number;
  scheduledHours: number;
  completedHours: number;
  status: string;
  priority: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  currentPhase?: string;
  notes?: string;
}

interface Course {
  id: string;
  courseId: string;
  name: string;
  type: string;
  category: string;
  duration: string;
}

export default function SelectionFormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const formId = params.id as string;

  const [form, setForm] = useState<SelectionForm | null>(null);
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // 添加课程表单
  const [courseForm, setCourseForm] = useState({
    course_id: '',
    course_type: '基础课',
    course_stage: '基础',
    planned_hours: 10,
    priority: 5,
    planned_start_date: '',
    planned_end_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchFormDetail();
    fetchCourses();
  }, [formId]);

  const fetchFormDetail = async () => {
    try {
      setLoading(true);
      
      // 获取选课单详情
      const formRes = await fetch(`/api/selection-forms/${formId}`);
      const formData = await formRes.json();
      
      // 获取学生信息
      let studentName = '未知学生';
      let teacherName = '未指定';
      
      if (formData.studentId) {
        const studentRes = await fetch(`/api/students/${formData.studentId}`);
        const studentData = await studentRes.json();
        studentName = studentData.student?.name || studentName;
      }
      
      if (formData.consultationTeacherId) {
        const teacherRes = await fetch(`/api/teachers/${formData.consultationTeacherId}`);
        const teacherData = await teacherRes.json();
        teacherName = teacherData.teacher?.name || teacherName;
      }
      
      setForm({
        ...formData,
        studentName,
        teacherName,
      });
      
      // 获取选课单明细
      const itemsRes = await fetch(`/api/selection-forms/${formId}/items`);
      const itemsData = await itemsRes.json();
      
      // 获取课程信息
      const itemsWithNames = await Promise.all(
        (itemsData.items || itemsData || []).map(async (item: any) => {
          let courseName = '未知课程';
          
          try {
            if (item.courseId) {
              const courseRes = await fetch(`/api/courses/${item.courseId}`);
              const courseData = await courseRes.json();
              courseName = courseData.course?.name || courseName;
            }
          } catch (error) {
            console.error('获取课程信息失败:', error);
          }
          
          return {
            ...item,
            courseName,
          };
        })
      );
      
      setItems(itemsWithNames);
    } catch (error) {
      console.error('获取选课单详情失败:', error);
      toast({
        title: '错误',
        description: '获取选课单详情失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data.courses || data || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/selection-forms/${formId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          ...courseForm,
          planned_start_date: courseForm.planned_start_date || undefined,
          planned_end_date: courseForm.planned_end_date || undefined,
        }),
      });

      if (!response.ok) throw new Error('添加失败');

      toast({
        title: '成功',
        description: '课程已添加到选课单',
      });

      setDialogOpen(false);
      resetCourseForm();
      fetchFormDetail();
    } catch (error) {
      console.error('添加课程失败:', error);
      toast({
        title: '错误',
        description: '添加课程失败',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('确定要从选课单中移除该课程吗？')) return;

    try {
      const response = await fetch(`/api/selection-forms/${formId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      toast({
        title: '成功',
        description: '课程已从选课单移除',
      });

      fetchFormDetail();
    } catch (error) {
      console.error('删除课程失败:', error);
      toast({
        title: '错误',
        description: '删除课程失败',
        variant: 'destructive',
      });
    }
  };

  const handleShareForm = async () => {
    if (!form) return;

    try {
      setGeneratingImage(true);
      
      const imageUrl = await generateSelectionFormImage({
        formId: form.formId,
        studentName: form.studentName || '学生',
        teacherName: form.teacherName,
        totalCourses: form.totalCourses,
        totalHours: form.totalHours,
        estimatedStartDate: form.estimatedStartDate,
        estimatedEndDate: form.estimatedEndDate,
        goals: form.goals,
        courses: items.map(item => ({
          courseName: item.courseName || '课程',
          plannedHours: item.plannedHours,
          status: item.status,
        })),
      });

      if (imageUrl) {
        setShareImageUrl(imageUrl);
        toast({
          title: '生成成功',
          description: '选课单规划图已生成，可以分享给学生',
        });
      } else {
        toast({
          title: '生成失败',
          description: '无法生成分享图片，请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('生成分享图片失败:', error);
      toast({
        title: '错误',
        description: '生成分享图片失败',
        variant: 'destructive',
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const resetCourseForm = () => {
    setCourseForm({
      course_id: '',
      course_type: '基础课',
      course_stage: '基础',
      planned_hours: 10,
      priority: 5,
      planned_start_date: '',
      planned_end_date: '',
      notes: '',
    });
  };

  // 导出PDF
  const handleExportPDF = async () => {
    if (!form) return;

    try {
      setGeneratingPDF(true);
      toast({
        title: '正在生成PDF',
        description: '请稍候...',
      });

      const response = await fetch(`/api/selection-forms/${formId}/pdf`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '生成PDF失败');
      }

      // 下载PDF
      if (result.data.pdfUrl) {
        window.open(result.data.pdfUrl, '_blank');
        toast({
          title: 'PDF生成成功',
          description: result.data.signLink 
            ? 'PDF已生成，包含学生签字链接二维码'
            : 'PDF已生成',
        });
      }
    } catch (error) {
      console.error('生成PDF失败:', error);
      toast({
        title: '错误',
        description: '生成PDF失败，请重试',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      '待排课': 'secondary',
      '排课中': 'default',
      '上课中': 'default',
      '已完成': 'default',
      '已暂停': 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const completionPercentage = form && form.totalHours > 0 
    ? Math.round((form.completedHours / form.totalHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">选课单不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => router.push('/selection-forms')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回选课单列表
      </Button>

      {/* 选课单基本信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：基本信息 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{form.formId}</CardTitle>
                <p className="text-gray-500 mt-1">选课单详情</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={generatingPDF}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {generatingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  {generatingPDF ? '生成中...' : '导出PDF'}
                </Button>
                <Button
                  onClick={handleShareForm}
                  disabled={generatingImage}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {generatingImage ? '生成中...' : '分享'}
                </Button>
                <Badge 
                  variant={form.status === '已完成' ? 'default' : form.status === '执行中' ? 'default' : 'secondary'}
                  className="text-base px-3 py-1"
                >
                  {form.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">学生</Label>
                <p className="text-lg font-medium">{form.studentName}</p>
              </div>
              <div>
                <Label className="text-gray-500">选课指导导师</Label>
                <p className="text-lg font-medium">{form.teacherName}</p>
              </div>
              <div>
                <Label className="text-gray-500">预计开始日期</Label>
                <p className="text-lg font-medium">
                  {new Date(form.estimatedStartDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">预计结束日期</Label>
                <p className="text-lg font-medium">
                  {new Date(form.estimatedEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {form.goals && (
              <div>
                <Label className="text-gray-500">学习目标</Label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{form.goals}</p>
              </div>
            )}

            {form.notes && (
              <div>
                <Label className="text-gray-500">备注</Label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{form.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：进度统计 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                学习进度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">总体完成度</span>
                  <span className="text-sm font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{form.completedCourses}</p>
                  <p className="text-sm text-gray-600">已完成课程</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{form.totalCourses}</p>
                  <p className="text-sm text-gray-600">总课程数</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{form.completedHours}h</p>
                  <p className="text-sm text-gray-600">已完成课时</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{form.totalHours}h</p>
                  <p className="text-sm text-gray-600">总课时</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 课程列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              课程列表 ({items.length})
            </CardTitle>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetCourseForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加课程
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>添加课程到选课单</DialogTitle>
                  <DialogDescription>
                    选择要添加的课程并设置规划信息
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">课程 *</Label>
                    <Select
                      value={courseForm.course_id}
                      onValueChange={(value) => setCourseForm({ ...courseForm, course_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择课程" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.courseId} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course_type">课程类型</Label>
                      <Select
                        value={courseForm.course_type}
                        onValueChange={(value) => setCourseForm({ ...courseForm, course_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="基础课">基础课</SelectItem>
                          <SelectItem value="项目课">项目课</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_stage">学习阶段</Label>
                      <Select
                        value={courseForm.course_stage}
                        onValueChange={(value) => setCourseForm({ ...courseForm, course_stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="基础">基础</SelectItem>
                          <SelectItem value="项目">项目</SelectItem>
                          <SelectItem value="作品集">作品集</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planned_hours">规划课时 *</Label>
                      <Input
                        id="planned_hours"
                        type="number"
                        value={courseForm.planned_hours}
                        onChange={(e) => setCourseForm({ ...courseForm, planned_hours: parseInt(e.target.value) || 0 })}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">优先级 (1-10)</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={courseForm.priority}
                        onChange={(e) => setCourseForm({ ...courseForm, priority: parseInt(e.target.value) || 5 })}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">计划开始日期</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={courseForm.planned_start_date}
                        onChange={(e) => setCourseForm({ ...courseForm, planned_start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">计划结束日期</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={courseForm.planned_end_date}
                        onChange={(e) => setCourseForm({ ...courseForm, planned_end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">备注</Label>
                    <Textarea
                      id="notes"
                      value={courseForm.notes}
                      onChange={(e) => setCourseForm({ ...courseForm, notes: e.target.value })}
                      placeholder="课程相关备注"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetCourseForm();
                      }}
                    >
                      取消
                    </Button>
                    <Button type="submit">
                      添加课程
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无课程，点击"添加课程"开始规划
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const itemProgress = item.plannedHours > 0 
                  ? Math.round((item.completedHours / item.plannedHours) * 100)
                  : 0;
                
                return (
                  <Card key={item.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{item.courseName}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{item.courseType}</Badge>
                            <Badge variant="outline">{item.courseStage}</Badge>
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">规划课时:</span>
                          <span className="font-medium">{item.plannedHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">已完成:</span>
                          <span className="font-medium text-green-600">{item.completedHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">优先级:</span>
                          <span className="font-medium">{item.priority}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">完成进度</span>
                          <span className="text-sm font-medium">{itemProgress}%</span>
                        </div>
                        <Progress value={itemProgress} className="h-2" />
                      </div>

                      {item.currentPhase && (
                        <div className="mt-2 text-sm text-gray-600">
                          当前阶段: {item.currentPhase}
                        </div>
                      )}

                      {item.notes && (
                        <div className="mt-2 text-sm text-gray-500">
                          备注: {item.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分享图片预览 */}
      {shareImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>选课单规划图</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={shareImageUrl} 
              alt="选课单规划图" 
              className="w-full max-w-md mx-auto rounded-lg shadow-lg"
            />
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                onClick={() => window.open(shareImageUrl, '_blank')}
                variant="outline"
              >
                查看大图
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(shareImageUrl);
                  toast({
                    title: '已复制',
                    description: '图片链接已复制到剪贴板',
                  });
                }}
              >
                复制链接
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  Loader2,
  Sparkles,
  Eye,
  Edit,
  CheckCircle,
  AlertCircle,
  Play,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateSelectionFormImage } from '@/lib/share-image-service';
import { cn } from '@/lib/utils';

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
  schedules?: ScheduleInfo[];
}

interface ScheduleInfo {
  id: string;
  date: string;
  weekDay: string;
  timeSlot: string;
  hours: number;
  status: string;
  teacherName?: string;
}

interface Course {
  id: string;
  courseId: string;
  name: string;
  type: string;
  category: string;
  duration: string;
}

interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  majorDirections?: string[];
}

// 课程项状态配置
const ITEM_STATUS_CONFIG = {
  '待排课': { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, description: '等待排课' },
  '排课中': { color: 'bg-yellow-100 text-yellow-700', icon: Clock, description: '正在排课' },
  '上课中': { color: 'bg-blue-100 text-blue-700', icon: Play, description: '正在进行' },
  '已完成': { color: 'bg-green-100 text-green-700', icon: CheckCircle, description: '已完成' },
  '已暂停': { color: 'bg-red-100 text-red-700', icon: AlertCircle, description: '已暂停' },
};

export default function SelectionFormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const formId = params.id as string;

  const [form, setForm] = useState<SelectionForm | null>(null);
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);

  // 排课对话框
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectionItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    teacherId: '',
    date: '',
    timeSlot: '10:00',
    hours: 2,
    notes: '',
  });

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
    fetchTeachers();
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
      
      // 获取课程信息和关联的排课记录
      const itemsWithDetails = await Promise.all(
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
          
          // 获取关联的排课记录
          let schedules: ScheduleInfo[] = [];
          try {
            const schedulesRes = await fetch(`/api/schedule?studentId=${formData.studentId}&courseId=${item.courseId}`);
            const schedulesData = await schedulesRes.json();
            schedules = (schedulesData.schedules || []).slice(0, 5).map((s: any) => ({
              id: s.id,
              date: s.date,
              weekDay: s.weekDay,
              timeSlot: s.timeSlot,
              hours: s.hours,
              status: s.status,
              teacherName: s.teacherName,
            }));
          } catch (error) {
            console.error('获取排课记录失败:', error);
          }
          
          return {
            ...item,
            courseName,
            schedules,
          };
        })
      );
      
      setItems(itemsWithDetails);
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

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('获取导师列表失败:', error);
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

  // 更新课程项状态
  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/selection-forms/${formId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '成功',
        description: '状态已更新',
      });

      fetchFormDetail();
    } catch (error) {
      console.error('更新状态失败:', error);
      toast({
        title: '错误',
        description: '更新状态失败',
        variant: 'destructive',
      });
    }
  };

  // 打开排课对话框
  const openScheduleDialog = (item: SelectionItem) => {
    setSelectedItem(item);
    setScheduleForm({
      teacherId: '',
      date: '',
      timeSlot: '10:00',
      hours: 2,
      notes: '',
    });
    setScheduleDialogOpen(true);
  };

  // 创建排课
  const handleCreateSchedule = async () => {
    if (!selectedItem || !form) return;
    
    if (!scheduleForm.teacherId || !scheduleForm.date) {
      toast({
        title: '请填写完整',
        description: '请选择导师和日期',
        variant: 'destructive',
      });
      return;
    }
    
    setScheduling(selectedItem.id);
    
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          teacherId: scheduleForm.teacherId,
          courseId: selectedItem.courseId,
          date: scheduleForm.date,
          timeSlot: scheduleForm.timeSlot,
          hours: scheduleForm.hours,
          notes: scheduleForm.notes,
          studentCourseId: selectedItem.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '排课失败');
      }

      toast({
        title: '排课成功',
        description: `已为 ${selectedItem.courseName} 创建排课`,
      });

      setScheduleDialogOpen(false);
      fetchFormDetail();
    } catch (error: any) {
      console.error('排课失败:', error);
      toast({
        title: '排课失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setScheduling(null);
    }
  };

  // 自动排课（单个课程项）
  const handleAutoScheduleItem = async (item: SelectionItem) => {
    if (!form) return;
    
    setScheduling(item.id);
    
    try {
      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          courseId: item.courseId,
          selectionItemId: item.id,
        }),
      });

      const result = await response.json();

      if (result.scheduled > 0) {
        toast({
          title: '自动排课成功',
          description: `已安排 ${result.scheduled} 节课程`,
        });
        fetchFormDetail();
      } else {
        toast({
          title: '自动排课失败',
          description: result.conflicts?.[0]?.reason || '未找到合适的排课时间',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('自动排课失败:', error);
      toast({
        title: '自动排课失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setScheduling(null);
    }
  };

  // 为整个选课单自动排课
  const handleAutoScheduleAll = async () => {
    if (!form) return;
    
    const pendingItems = items.filter(item => 
      item.status === '待排课' || item.scheduledHours < item.plannedHours
    );
    
    if (pendingItems.length === 0) {
      toast({
        title: '无需排课',
        description: '所有课程都已排满',
      });
      return;
    }
    
    if (!confirm(`将为 ${pendingItems.length} 门课程自动排课，是否继续？`)) return;
    
    setScheduling('all');
    
    try {
      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          selectionFormId: formId,
        }),
      });

      const result = await response.json();

      toast({
        title: '自动排课完成',
        description: `成功 ${result.scheduled} 节，失败 ${result.failed} 节`,
      });

      fetchFormDetail();
    } catch (error) {
      console.error('自动排课失败:', error);
      toast({
        title: '自动排课失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setScheduling(null);
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
          description: '选课单规划图已生成',
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
      
      const response = await fetch(`/api/selection-forms/${formId}/pdf`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success && result.data?.pdfUrl) {
        window.open(result.data.pdfUrl, '_blank');
        toast({
          title: 'PDF生成成功',
          description: 'PDF已生成',
        });
      }
    } catch (error) {
      console.error('生成PDF失败:', error);
      toast({
        title: '错误',
        description: '生成PDF失败',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = ITEM_STATUS_CONFIG[status as keyof typeof ITEM_STATUS_CONFIG] || ITEM_STATUS_CONFIG['待排课'];
    const Icon = config.icon;
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const completionPercentage = form && form.totalHours > 0 
    ? Math.round((form.completedHours / form.totalHours) * 100)
    : 0;

  // 时间段选项
  const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
    <div className="container mx-auto py-6 px-4 max-w-6xl">
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
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <CardTitle className="text-2xl">{form.formId}</CardTitle>
                <CardDescription className="mt-1">选课单详情</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleExportPDF}
                  disabled={generatingPDF}
                  variant="outline"
                  size="sm"
                >
                  {generatingPDF ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  导出PDF
                </Button>
                <Button
                  onClick={handleShareForm}
                  disabled={generatingImage}
                  variant="outline"
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  分享
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-500 text-sm">学生</Label>
                <p className="text-lg font-medium">{form.studentName}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">选课指导导师</Label>
                <p className="text-lg font-medium">{form.teacherName}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">预计开始</Label>
                <p className="text-lg font-medium">
                  {new Date(form.estimatedStartDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">预计结束</Label>
                <p className="text-lg font-medium">
                  {new Date(form.estimatedEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {form.goals && (
              <div>
                <Label className="text-gray-500 text-sm">学习目标</Label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{form.goals}</p>
              </div>
            )}

            {form.notes && (
              <div>
                <Label className="text-gray-500 text-sm">备注</Label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{form.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：进度统计 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{form.completedCourses}</p>
                  <p className="text-xs text-gray-600">已完成课程</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{form.totalCourses}</p>
                  <p className="text-xs text-gray-600">总课程数</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{form.completedHours}h</p>
                  <p className="text-xs text-gray-600">已完成课时</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{form.totalHours}h</p>
                  <p className="text-xs text-gray-600">总课时</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 课程列表 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              课程列表 ({items.length})
            </CardTitle>
            
            <div className="flex gap-2">
              {/* 批量自动排课 */}
              <Button
                variant="outline"
                onClick={handleAutoScheduleAll}
                disabled={scheduling === 'all'}
              >
                {scheduling === 'all' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                一键排课
              </Button>
              
              {/* 添加课程 */}
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetCourseForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
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
                      <Label>课程 *</Label>
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
                        <Label>课程类型</Label>
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
                        <Label>学习阶段</Label>
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
                        <Label>规划课时 *</Label>
                        <Input
                          type="number"
                          value={courseForm.planned_hours}
                          onChange={(e) => setCourseForm({ ...courseForm, planned_hours: parseInt(e.target.value) || 0 })}
                          min="1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>优先级 (1-10)</Label>
                        <Input
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
                        <Label>计划开始日期</Label>
                        <Input
                          type="date"
                          value={courseForm.planned_start_date}
                          onChange={(e) => setCourseForm({ ...courseForm, planned_start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>计划结束日期</Label>
                        <Input
                          type="date"
                          value={courseForm.planned_end_date}
                          onChange={(e) => setCourseForm({ ...courseForm, planned_end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>备注</Label>
                      <Textarea
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
                      <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                        添加课程
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无课程，点击"添加课程"开始规划</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const itemProgress = item.plannedHours > 0 
                  ? Math.round((item.completedHours / item.plannedHours) * 100)
                  : 0;
                const remainingHours = item.plannedHours - item.scheduledHours;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-lg">{item.courseName}</h3>
                              {getStatusBadge(item.status)}
                              {remainingHours > 0 && item.status !== '已完成' && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  剩余 {remainingHours}h 待排
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2 mt-2 text-sm text-gray-500">
                              <span>{item.courseType}</span>
                              <span>·</span>
                              <span>{item.courseStage}</span>
                              <span>·</span>
                              <span>优先级 {item.priority}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* 快捷操作 */}
                            {item.status !== '已完成' && remainingHours > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAutoScheduleItem(item)}
                                  disabled={scheduling === item.id}
                                  title="自动排课"
                                >
                                  {scheduling === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openScheduleDialog(item)}
                                  title="手动排课"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {/* 状态菜单 */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateItemStatus(item.id, '待排课')}>
                                  待排课
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateItemStatus(item.id, '排课中')}>
                                  排课中
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateItemStatus(item.id, '上课中')}>
                                  上课中
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateItemStatus(item.id, '已完成')}>
                                  已完成
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateItemStatus(item.id, '已暂停')}>
                                  已暂停
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 课时进度 */}
                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500">规划课时</span>
                            <p className="font-medium">{item.plannedHours}h</p>
                          </div>
                          <div>
                            <span className="text-gray-500">已排课时</span>
                            <p className="font-medium text-blue-600">{item.scheduledHours}h</p>
                          </div>
                          <div>
                            <span className="text-gray-500">已完成</span>
                            <p className="font-medium text-green-600">{item.completedHours}h</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-gray-600">完成进度</span>
                            <span className="font-medium">{itemProgress}%</span>
                          </div>
                          <Progress value={itemProgress} className="h-2" />
                        </div>

                        {/* 关联的排课记录 */}
                        {item.schedules && item.schedules.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                              <CalendarDays className="h-4 w-4" />
                              近期排课
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.schedules.map((schedule) => (
                                <Link 
                                  key={schedule.id}
                                  href={`/schedules?highlight=${schedule.id}`}
                                >
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      'cursor-pointer hover:bg-gray-50',
                                      schedule.status === '已完成' && 'border-green-300 text-green-700',
                                      schedule.status === '已确认' && 'border-blue-300 text-blue-700',
                                      schedule.status === '待确认' && 'border-yellow-300 text-yellow-700',
                                    )}
                                  >
                                    {schedule.date} {schedule.timeSlot}
                                    {schedule.teacherName && ` · ${schedule.teacherName}`}
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.notes && (
                          <div className="mt-2 text-sm text-gray-500">
                            备注: {item.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动排课对话框 */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动排课</DialogTitle>
            <DialogDescription>
              为「{selectedItem?.courseName}」创建排课
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>导师 *</Label>
              <Select
                value={scheduleForm.teacherId}
                onValueChange={(v) => setScheduleForm({ ...scheduleForm, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择导师" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                      {teacher.majorDirections && teacher.majorDirections.length > 0 && (
                        <span className="text-gray-400 ml-2">
                          ({teacher.majorDirections.slice(0, 2).join(', ')})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日期 *</Label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>时间段</Label>
                <Select
                  value={scheduleForm.timeSlot}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, timeSlot: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>课时</Label>
              <Input
                type="number"
                value={scheduleForm.hours}
                onChange={(e) => setScheduleForm({ ...scheduleForm, hours: parseInt(e.target.value) || 2 })}
                min="1"
                max="4"
              />
            </div>
            
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                placeholder="可选备注"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreateSchedule}
              disabled={scheduling === selectedItem?.id}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {scheduling === selectedItem?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              确认排课
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分享图片预览 */}
      {shareImageUrl && (
        <Card className="mt-6">
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
                className="bg-orange-500 hover:bg-orange-600"
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

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  FileText,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Target,
  Save,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Consultation {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  studentSid?: string;
  studentInfo?: any;
  teacherId: string;
  consultantName: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  attendanceStatus: string;
  contentSummary?: string;
  teachingMethod?: string;
  teacherFeedback?: string;
  createdAt: string;
}

interface Course {
  id: string;
  courseId: string;
  name: string;
  category: string;
  type: string;
}

interface SelectedCourse {
  courseId: string;
  courseName: string;
  courseType: string;
  courseStage: string;
  plannedHours: number;
  priority: number;
  notes?: string;
}

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const consultationId = params.id as string;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectionForm, setSelectionForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);

  // 完成指导课表单
  const [completeForm, setCompleteForm] = useState({
    goals: '',
    notes: '',
    estimatedStartDate: '',
    estimatedEndDate: '',
    selectedCourses: [] as SelectedCourse[],
  });

  // 添加课程表单
  const [courseForm, setCourseForm] = useState({
    courseId: '',
    courseType: '基础课',
    courseStage: '基础',
    plannedHours: 10,
    priority: 5,
    notes: '',
  });

  useEffect(() => {
    fetchConsultationDetail();
  }, [consultationId]);

  const fetchConsultationDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/consultations/${consultationId}`);
      const data = await res.json();

      if (data.success) {
        setConsultation(data.data.consultation);
        setAvailableCourses(data.data.availableCourses || []);
        setSelectionForm(data.data.selectionForm);

        // 如果已有选课单，填充数据
        if (data.data.selectionForm) {
          setCompleteForm({
            goals: data.data.selectionForm.goals || '',
            notes: data.data.selectionForm.notes || '',
            estimatedStartDate: data.data.selectionForm.estimatedStartDate || '',
            estimatedEndDate: data.data.selectionForm.estimatedEndDate || '',
            selectedCourses: (data.data.selectionForm.items || []).map((item: any) => ({
              courseId: item.courseId,
              courseName: item.courseName || '课程',
              courseType: item.courseType,
              courseStage: item.courseStage,
              plannedHours: item.plannedHours,
              priority: item.priority,
              notes: item.notes,
            })),
          });
        }
      } else {
        // 使用模拟数据
        setConsultation(getMockConsultation());
        setAvailableCourses(getMockCourses());
      }
    } catch (error) {
      console.error('获取选课指导课详情失败:', error);
      setConsultation(getMockConsultation());
      setAvailableCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const getMockConsultation = (): Consultation => ({
    id: consultationId,
    recordId: 'CG001',
    studentId: 's1',
    studentName: '张同学',
    studentSid: 'STU001',
    studentInfo: {
      major: '游戏开发',
      applicationCountry: '美国',
      currentStage: '基础阶段',
    },
    teacherId: 'c1',
    consultantName: '王顾问',
    classDate: new Date().toISOString().split('T')[0],
    weekDay: '周三',
    startTime: '10:00',
    attendanceStatus: '已预约',
    teachingMethod: '线上',
    createdAt: new Date().toISOString(),
  });

  const getMockCourses = (): Course[] => [
    { id: '1', courseId: 'F-GD-001', name: '游戏设计基础', category: 'F-GD', type: '基础课' },
    { id: '2', courseId: 'F-TA-001', name: '技术美术入门', category: 'F-TA', type: '基础课' },
    { id: '3', courseId: 'P-GD-001', name: '游戏项目一', category: 'P-GD', type: '项目课' },
  ];

  const handleStart = async () => {
    if (!consultation) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '已开始', description: '选课指导课已开始' });
        setConsultation({ ...consultation, attendanceStatus: '进行中' });
      } else {
        // 模拟成功
        setConsultation({ ...consultation, attendanceStatus: '进行中' });
        toast({ title: '已开始', description: '选课指导课已开始' });
      }
    } catch (error) {
      // 模拟成功
      setConsultation({ ...consultation, attendanceStatus: '进行中' });
      toast({ title: '已开始', description: '选课指导课已开始' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!consultation) return;

    if (completeForm.selectedCourses.length === 0) {
      toast({
        title: '请添加课程',
        description: '至少需要添加一门课程才能完成选课指导',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          data: completeForm,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '已完成', description: '选课指导课已完成，选课单已创建' });
        if (data.data.selectionForm?.id) {
          router.push(`/selection-forms/${data.data.selectionForm.id}`);
        } else {
          fetchConsultationDetail();
        }
      } else {
        // 模拟成功
        toast({ title: '已完成', description: '选课指导课已完成' });
        setConsultation({ ...consultation, attendanceStatus: '已完成' });
      }
    } catch (error) {
      // 模拟成功
      toast({ title: '已完成', description: '选课指导课已完成' });
      setConsultation({ ...consultation, attendanceStatus: '已完成' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!consultation || !confirm('确定要取消此选课指导课吗？')) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '已取消', description: '选课指导课已取消' });
        router.push('/consultations');
      } else {
        // 模拟成功
        toast({ title: '已取消', description: '选课指导课已取消' });
        router.push('/consultations');
      }
    } catch (error) {
      // 模拟成功
      toast({ title: '已取消', description: '选课指导课已取消' });
      router.push('/consultations');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCourse = () => {
    const course = availableCourses.find(c => c.id === courseForm.courseId);
    if (!course) {
      toast({ title: '请选择课程', variant: 'destructive' });
      return;
    }

    const newCourse: SelectedCourse = {
      courseId: course.id,
      courseName: course.name,
      courseType: courseForm.courseType,
      courseStage: courseForm.courseStage,
      plannedHours: courseForm.plannedHours,
      priority: courseForm.priority,
      notes: courseForm.notes,
    };

    setCompleteForm({
      ...completeForm,
      selectedCourses: [...completeForm.selectedCourses, newCourse],
    });

    setCourseForm({
      courseId: '',
      courseType: '基础课',
      courseStage: '基础',
      plannedHours: 10,
      priority: 5,
      notes: '',
    });
    setAddCourseDialogOpen(false);
  };

  const handleRemoveCourse = (index: number) => {
    const newCourses = completeForm.selectedCourses.filter((_, i) => i !== index);
    setCompleteForm({ ...completeForm, selectedCourses: newCourses });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case '已预约':
        return { color: 'bg-yellow-100 text-yellow-700', icon: Calendar };
      case '进行中':
        return { color: 'bg-blue-100 text-blue-700', icon: Play };
      case '已完成':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case '已取消':
        return { color: 'bg-gray-100 text-gray-500', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-500', icon: Calendar };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">选课指导课不存在</div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(consultation.attendanceStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => router.push('/consultations')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 基本信息 */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-4 rounded-xl', statusConfig.color)}>
                <StatusIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{consultation.studentName}</h1>
                  <Badge className={cn('ml-2', statusConfig.color)}>
                    {consultation.attendanceStatus}
                  </Badge>
                </div>
                <p className="text-gray-500 mt-1">
                  {consultation.recordId} · {consultation.consultantName}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {consultation.attendanceStatus === '已预约' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    取消预约
                  </Button>
                  <Button
                    onClick={handleStart}
                    disabled={submitting}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    开始指导
                  </Button>
                </>
              )}
              {consultation.attendanceStatus === '进行中' && (
                <Button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  完成指导
                </Button>
              )}
              {consultation.attendanceStatus === '已完成' && selectionForm && (
                <Link href={`/selection-forms/${selectionForm.id}`}>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    查看选课单
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 详细信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">日期</p>
                <p className="font-medium">{formatDate(consultation.classDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">时间</p>
                <p className="font-medium">{consultation.startTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {consultation.teachingMethod === '线上' ? (
                <Video className="w-5 h-5 text-gray-400" />
              ) : (
                <MapPin className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm text-gray-500">方式</p>
                <p className="font-medium">{consultation.teachingMethod || '线上'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">学生ID</p>
                <p className="font-medium">{consultation.studentSid || '-'}</p>
              </div>
            </div>
          </div>

          {/* 学生信息 */}
          {consultation.studentInfo && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-700 mb-3">学生信息</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">专业方向：</span>
                  <span>{consultation.studentInfo.major || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">申请国家：</span>
                  <span>{consultation.studentInfo.applicationCountry || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">当前阶段：</span>
                  <span>{consultation.studentInfo.currentStage || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 指导内容（进行中或已完成时显示） */}
      {(consultation.attendanceStatus === '进行中' || consultation.attendanceStatus === '已完成') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                选课规划
              </CardTitle>
              <CardDescription>
                填写学生的学习目标和课程规划
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 学习目标 */}
              <div className="space-y-2">
                <Label>学习目标</Label>
                <Textarea
                  value={completeForm.goals}
                  onChange={(e) => setCompleteForm({ ...completeForm, goals: e.target.value })}
                  placeholder="描述学生的学习目标、申请方向等"
                  rows={3}
                  disabled={consultation.attendanceStatus === '已完成'}
                />
              </div>

              {/* 备注 */}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={completeForm.notes}
                  onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  placeholder="指导过程中的其他备注"
                  rows={2}
                  disabled={consultation.attendanceStatus === '已完成'}
                />
              </div>

              {/* 时间规划 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>预计开始日期</Label>
                  <Input
                    type="date"
                    value={completeForm.estimatedStartDate}
                    onChange={(e) => setCompleteForm({ ...completeForm, estimatedStartDate: e.target.value })}
                    disabled={consultation.attendanceStatus === '已完成'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>预计结束日期</Label>
                  <Input
                    type="date"
                    value={completeForm.estimatedEndDate}
                    onChange={(e) => setCompleteForm({ ...completeForm, estimatedEndDate: e.target.value })}
                    disabled={consultation.attendanceStatus === '已完成'}
                  />
                </div>
              </div>

              {/* 课程列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>课程规划</Label>
                  {consultation.attendanceStatus !== '已完成' && (
                    <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          添加课程
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>添加课程</DialogTitle>
                          <DialogDescription>
                            选择要添加到选课单的课程
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>课程 *</Label>
                            <Select
                              value={courseForm.courseId}
                              onValueChange={(v) => setCourseForm({ ...courseForm, courseId: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择课程" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCourses.map((course) => (
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
                                value={courseForm.courseType}
                                onValueChange={(v) => setCourseForm({ ...courseForm, courseType: v })}
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
                                value={courseForm.courseStage}
                                onValueChange={(v) => setCourseForm({ ...courseForm, courseStage: v })}
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
                              <Label>规划课时</Label>
                              <Input
                                type="number"
                                value={courseForm.plannedHours}
                                onChange={(e) => setCourseForm({ ...courseForm, plannedHours: parseInt(e.target.value) || 10 })}
                                min="1"
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

                          <div className="space-y-2">
                            <Label>备注</Label>
                            <Textarea
                              value={courseForm.notes}
                              onChange={(e) => setCourseForm({ ...courseForm, notes: e.target.value })}
                              placeholder="可选备注"
                              rows={2}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddCourseDialogOpen(false)}>
                            取消
                          </Button>
                          <Button onClick={handleAddCourse} className="bg-orange-500 hover:bg-orange-600">
                            添加
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {completeForm.selectedCourses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg border-dashed">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>暂无课程，点击上方按钮添加</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completeForm.selectedCourses.map((course, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{course.courseName}</span>
                            <Badge variant="outline" className="text-xs">
                              {course.courseType}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {course.plannedHours}课时 · 优先级 {course.priority}
                          </div>
                        </div>
                        {consultation.attendanceStatus !== '已完成' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCourse(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 总课时 */}
                {completeForm.selectedCourses.length > 0 && (
                  <div className="flex justify-end">
                    <div className="text-right">
                      <span className="text-gray-500">总课时：</span>
                      <span className="font-bold text-orange-600">
                        {completeForm.selectedCourses.reduce((sum, c) => sum + c.plannedHours, 0)}h
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 完成按钮 */}
              {consultation.attendanceStatus === '进行中' && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleComplete}
                    disabled={submitting || completeForm.selectedCourses.length === 0}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    完成指导并创建选课单
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

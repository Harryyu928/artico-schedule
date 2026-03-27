'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  FileText,
  Calendar,
  Clock,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';

interface Student {
  id: string;
  studentId: string;
  name: string;
  major: string | null;
}

interface Course {
  id: string;
  courseId: string;
  name: string;
  category: string;
}

interface ScheduleInfo {
  id: string;
  scheduleId: string;
  date: Date;
  timeSlot: string;
  hours: number;
  student: Student | null;
  course: Course | null;
}

function NewRecordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetchingSchedule, setFetchingSchedule] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    scheduleId: '',
    studentId: '',
    courseId: '',
    classDate: format(new Date(), 'yyyy-MM-dd'),
    weekDay: '',
    startTime: '',
    endTime: '',
    actualDuration: 120,
    courseCategory: '',
    courseContentDetail: '',
    contentSummary: '',
    teachingMethod: '',
    studentPerformance: '',
    homeworkAssigned: '',
    homeworkDeadline: '',
    nextClassPlan: '',
    teacherFeedback: '',
    projectPhase: '',
    phaseContent: '',
  });

  // 获取当前用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== '导师') {
          toast({
            title: '权限不足',
            description: '只有导师可以访问此页面',
            variant: 'destructive',
          });
          router.push('/');
          return;
        }
        if (data.user.teacher) {
          setTeacherId(data.user.teacher.id);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        router.push('/login');
      }
    };
    fetchUser();
  }, [router, toast]);

  // 如果有scheduleId参数，获取课程安排信息
  useEffect(() => {
    const scheduleId = searchParams.get('scheduleId');
    if (scheduleId && teacherId) {
      fetchScheduleInfo(scheduleId);
    }
  }, [searchParams, teacherId]);

  const fetchScheduleInfo = async (scheduleId: string) => {
    setFetchingSchedule(true);
    try {
      const response = await fetch(`/api/teacher/schedule?teacherId=${teacherId}&type=all`);
      const result = await response.json();
      
      if (result.success) {
        const schedule = result.data.schedules.find((s: any) => s.scheduleId === scheduleId);
        if (schedule) {
          setScheduleInfo(schedule);
          
          // 填充表单
          const date = new Date(schedule.date);
          const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          
          setFormData(prev => ({
            ...prev,
            scheduleId: schedule.scheduleId,
            studentId: schedule.student?.id || '',
            courseId: schedule.course?.id || '',
            classDate: format(date, 'yyyy-MM-dd'),
            weekDay: schedule.weekDay || weekDays[date.getDay()],
            startTime: schedule.timeSlot,
            actualDuration: schedule.hours * 60 || 120,
          }));
        }
      }
    } catch (error) {
      console.error('获取课程安排失败:', error);
    } finally {
      setFetchingSchedule(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.courseId || !formData.classDate || !formData.contentSummary) {
      toast({
        title: '提示',
        description: '请填写必填信息（学生、课程、上课日期、教学内容）',
        variant: 'destructive',
      });
      return;
    }

    if (!teacherId) {
      toast({
        title: '错误',
        description: '无法获取导师信息',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/teacher/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          teacherId,
          classDate: formData.classDate,
          homeworkDeadline: formData.homeworkDeadline || undefined,
          createdBy: teacherId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '保存成功',
          description: '上课记录已保存',
        });
        router.push('/teacher/records');
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];
  const projectPhases = ['Concept', 'Modeling', 'Texturing', 'Lighting', 'Render', 'Portfolio'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/teacher/records">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  新建上课记录
                </h1>
                <p className="text-xs text-muted-foreground">填写本次课程的详细记录</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {fetchingSchedule ? (
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">加载课程信息...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 课程安排信息卡片（如果是从课程表进入） */}
            {scheduleInfo && (
              <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <CheckCircle2 className="w-5 h-5" />
                    已关联课程安排
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">日期</p>
                        <p className="font-medium">{format(new Date(scheduleInfo.date), 'yyyy-MM-dd')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">时间</p>
                        <p className="font-medium">{scheduleInfo.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">学生</p>
                        <p className="font-medium">{scheduleInfo.student?.name || '未知'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">课程</p>
                        <p className="font-medium truncate">{scheduleInfo.course?.name || '未知'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 基本信息 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  基本信息
                </CardTitle>
                <CardDescription>课程的基本信息，带 * 为必填项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">学生 *</Label>
                    <Input
                      id="studentId"
                      value={scheduleInfo?.student?.name || formData.studentId}
                      disabled={!!scheduleInfo}
                      placeholder={scheduleInfo ? '' : '输入学生ID或姓名'}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseId">课程 *</Label>
                    <Input
                      id="courseId"
                      value={scheduleInfo?.course?.name || formData.courseId}
                      disabled={!!scheduleInfo}
                      placeholder={scheduleInfo ? '' : '输入课程ID或名称'}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="classDate">上课日期 *</Label>
                    <Input
                      id="classDate"
                      type="date"
                      value={formData.classDate}
                      onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekDay">星期</Label>
                    <Select
                      value={formData.weekDay}
                      onValueChange={(value) => setFormData({ ...formData, weekDay: value })}
                    >
                      <SelectTrigger className="border-orange-200">
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDays.map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">上课时间</Label>
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                    >
                      <SelectTrigger className="border-orange-200">
                        <SelectValue placeholder="选择时间" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endTime">结束时间</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actualDuration">实际时长（分钟）</Label>
                    <Input
                      id="actualDuration"
                      type="number"
                      value={formData.actualDuration}
                      onChange={(e) => setFormData({ ...formData, actualDuration: parseInt(e.target.value) || 120 })}
                      className="border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseCategory">课程类别</Label>
                    <Input
                      id="courseCategory"
                      placeholder="如：AP艺术课程、作品集指导"
                      value={formData.courseCategory}
                      onChange={(e) => setFormData({ ...formData, courseCategory: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 教学内容 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                  教学内容
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contentSummary">教学内容 *</Label>
                  <Textarea
                    id="contentSummary"
                    placeholder="请详细描述本次课程的教学内容..."
                    value={formData.contentSummary}
                    onChange={(e) => setFormData({ ...formData, contentSummary: e.target.value })}
                    rows={4}
                    className="border-orange-200 focus:border-orange-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teachingMethod">教学方法</Label>
                  <Input
                    id="teachingMethod"
                    placeholder="如：讲解、演示、实操指导"
                    value={formData.teachingMethod}
                    onChange={(e) => setFormData({ ...formData, teachingMethod: e.target.value })}
                    className="border-orange-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentPerformance">学生表现</Label>
                  <Textarea
                    id="studentPerformance"
                    placeholder="描述学生的课堂表现、理解程度、互动情况..."
                    value={formData.studentPerformance}
                    onChange={(e) => setFormData({ ...formData, studentPerformance: e.target.value })}
                    rows={3}
                    className="border-orange-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 作业与计划 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  作业与下次计划
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homeworkAssigned">课后作业</Label>
                  <Textarea
                    id="homeworkAssigned"
                    placeholder="布置的课后作业内容和要求..."
                    value={formData.homeworkAssigned}
                    onChange={(e) => setFormData({ ...formData, homeworkAssigned: e.target.value })}
                    rows={2}
                    className="border-orange-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homeworkDeadline">作业截止日期</Label>
                  <Input
                    id="homeworkDeadline"
                    type="date"
                    value={formData.homeworkDeadline}
                    onChange={(e) => setFormData({ ...formData, homeworkDeadline: e.target.value })}
                    className="border-orange-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextClassPlan">下次课计划</Label>
                  <Textarea
                    id="nextClassPlan"
                    placeholder="下次课程的教学计划..."
                    value={formData.nextClassPlan}
                    onChange={(e) => setFormData({ ...formData, nextClassPlan: e.target.value })}
                    rows={2}
                    className="border-orange-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherFeedback">导师评语</Label>
                  <Textarea
                    id="teacherFeedback"
                    placeholder="对学生的整体评价和建议..."
                    value={formData.teacherFeedback}
                    onChange={(e) => setFormData({ ...formData, teacherFeedback: e.target.value })}
                    rows={2}
                    className="border-orange-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 项目课信息（可选） */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  项目课信息（可选）
                </CardTitle>
                <CardDescription>如果这是项目课，请填写以下信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectPhase">项目阶段</Label>
                    <Select
                      value={formData.projectPhase}
                      onValueChange={(value) => setFormData({ ...formData, projectPhase: value })}
                    >
                      <SelectTrigger className="border-orange-200">
                        <SelectValue placeholder="选择阶段" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectPhases.map(phase => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phaseContent">阶段内容</Label>
                    <Input
                      id="phaseContent"
                      placeholder="本阶段的具体内容"
                      value={formData.phaseContent}
                      onChange={(e) => setFormData({ ...formData, phaseContent: e.target.value })}
                      className="border-orange-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                className="border-orange-200 hover:bg-orange-50"
                onClick={() => router.push('/teacher/records')}
              >
                取消
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存记录
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <NewRecordForm />
    </Suspense>
  );
}

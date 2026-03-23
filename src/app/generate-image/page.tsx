'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  Sparkles,
  Calendar,
  BookOpen,
  TrendingUp
} from 'lucide-react';

export default function GenerateImagePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('schedule');

  // 排课表单状态
  const [scheduleForm, setScheduleForm] = useState({
    studentName: '',
    courseName: '',
    teacherName: '',
    date: '',
    time: '',
    duration: '2',
  });

  // 上课记录表单状态
  const [recordForm, setRecordForm] = useState({
    studentName: '',
    courseName: '',
    teacherName: '',
    date: '',
    content: '',
    performance: '',
    homework: '',
  });

  // 学习进度表单状态
  const [progressForm, setProgressForm] = useState({
    studentName: '',
    totalCourses: '',
    completedCourses: '',
    totalHours: '',
    currentStage: '',
  });

  // 生成排课分享图
  const handleGenerateSchedule = async () => {
    if (!scheduleForm.studentName || !scheduleForm.courseName) {
      toast({
        title: '提示',
        description: '请填写学生姓名和课程名称',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setImageUrl('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'schedule',
          data: scheduleForm,
        }),
      });

      const result = await response.json();

      if (result.success && result.imageUrls?.[0]) {
        setImageUrl(result.imageUrls[0]);
        toast({
          title: '生成成功',
          description: '排课分享图已生成',
        });
      } else {
        throw new Error(result.errors?.[0] || '生成失败');
      }
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 生成上课记录分享图
  const handleGenerateRecord = async () => {
    if (!recordForm.studentName || !recordForm.courseName) {
      toast({
        title: '提示',
        description: '请填写学生姓名和课程名称',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setImageUrl('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'class-record',
          data: recordForm,
        }),
      });

      const result = await response.json();

      if (result.success && result.imageUrls?.[0]) {
        setImageUrl(result.imageUrls[0]);
        toast({
          title: '生成成功',
          description: '上课记录分享图已生成',
        });
      } else {
        throw new Error(result.errors?.[0] || '生成失败');
      }
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 生成学习进度分享图
  const handleGenerateProgress = async () => {
    if (!progressForm.studentName || !progressForm.totalCourses) {
      toast({
        title: '提示',
        description: '请填写学生姓名和总课程数',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setImageUrl('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'progress',
          data: progressForm,
        }),
      });

      const result = await response.json();

      if (result.success && result.imageUrls?.[0]) {
        setImageUrl(result.imageUrls[0]);
        toast({
          title: '生成成功',
          description: '学习进度分享图已生成',
        });
      } else {
        throw new Error(result.errors?.[0] || '生成失败');
      }
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 下载图片
  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `artico-share-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: '下载成功',
        description: '图片已保存到本地',
      });
    } catch (error) {
      toast({
        title: '下载失败',
        description: '请重试',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            AI生成分享图
          </h1>
          <p className="text-muted-foreground mt-1">
            使用AI自动生成精美的排课、上课记录和学习进度分享图
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-orange-50 px-4 py-2 rounded-lg">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span>AI智能生图</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：表单区域 */}
        <Card className="border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-500" />
              生成设置
            </CardTitle>
            <CardDescription>
              选择图片类型并填写相关信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  排课分享
                </TabsTrigger>
                <TabsTrigger value="record" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  上课记录
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  学习进度
                </TabsTrigger>
              </TabsList>

              {/* 排课分享图表单 */}
              <TabsContent value="schedule" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">学生姓名 *</Label>
                    <Input
                      id="studentName"
                      placeholder="请输入学生姓名"
                      value={scheduleForm.studentName}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, studentName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courseName">课程名称 *</Label>
                    <Input
                      id="courseName"
                      placeholder="请输入课程名称"
                      value={scheduleForm.courseName}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, courseName: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherName">授课导师</Label>
                    <Input
                      id="teacherName"
                      placeholder="请输入导师姓名"
                      value={scheduleForm.teacherName}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, teacherName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">课程时长</Label>
                    <Select
                      value={scheduleForm.duration}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1小时</SelectItem>
                        <SelectItem value="2">2小时</SelectItem>
                        <SelectItem value="3">3小时</SelectItem>
                        <SelectItem value="4">4小时</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">上课日期</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">上课时间</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  onClick={handleGenerateSchedule}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成排课分享图
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* 上课记录分享图表单 */}
              <TabsContent value="record" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="record-studentName">学生姓名 *</Label>
                    <Input
                      id="record-studentName"
                      placeholder="请输入学生姓名"
                      value={recordForm.studentName}
                      onChange={(e) => setRecordForm({ ...recordForm, studentName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="record-courseName">课程名称 *</Label>
                    <Input
                      id="record-courseName"
                      placeholder="请输入课程名称"
                      value={recordForm.courseName}
                      onChange={(e) => setRecordForm({ ...recordForm, courseName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="record-teacherName">授课导师</Label>
                    <Input
                      id="record-teacherName"
                      placeholder="请输入导师姓名"
                      value={recordForm.teacherName}
                      onChange={(e) => setRecordForm({ ...recordForm, teacherName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="record-date">上课日期</Label>
                    <Input
                      id="record-date"
                      type="date"
                      value={recordForm.date}
                      onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">上课内容</Label>
                  <Textarea
                    id="content"
                    placeholder="请输入本次课程的主要内容..."
                    value={recordForm.content}
                    onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performance">课堂表现</Label>
                  <Textarea
                    id="performance"
                    placeholder="请描述学生的课堂表现..."
                    value={recordForm.performance}
                    onChange={(e) => setRecordForm({ ...recordForm, performance: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homework">课后作业</Label>
                  <Input
                    id="homework"
                    placeholder="请输入课后作业内容"
                    value={recordForm.homework}
                    onChange={(e) => setRecordForm({ ...recordForm, homework: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  onClick={handleGenerateRecord}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成上课记录分享图
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* 学习进度分享图表单 */}
              <TabsContent value="progress" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="progress-studentName">学生姓名 *</Label>
                  <Input
                    id="progress-studentName"
                    placeholder="请输入学生姓名"
                    value={progressForm.studentName}
                    onChange={(e) => setProgressForm({ ...progressForm, studentName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalCourses">总课程数 *</Label>
                    <Input
                      id="totalCourses"
                      type="number"
                      placeholder="10"
                      value={progressForm.totalCourses}
                      onChange={(e) => setProgressForm({ ...progressForm, totalCourses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completedCourses">已完成</Label>
                    <Input
                      id="completedCourses"
                      type="number"
                      placeholder="6"
                      value={progressForm.completedCourses}
                      onChange={(e) => setProgressForm({ ...progressForm, completedCourses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalHours">总学时</Label>
                    <Input
                      id="totalHours"
                      type="number"
                      placeholder="120"
                      value={progressForm.totalHours}
                      onChange={(e) => setProgressForm({ ...progressForm, totalHours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentStage">当前阶段</Label>
                  <Select
                    value={progressForm.currentStage}
                    onValueChange={(value) => setProgressForm({ ...progressForm, currentStage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择当前学习阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="基础阶段">基础阶段</SelectItem>
                      <SelectItem value="进阶阶段">进阶阶段</SelectItem>
                      <SelectItem value="项目阶段">项目阶段</SelectItem>
                      <SelectItem value="作品集阶段">作品集阶段</SelectItem>
                      <SelectItem value="申请阶段">申请阶段</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  onClick={handleGenerateProgress}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成学习进度分享图
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 右侧：预览区域 */}
        <Card className="border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-500" />
                图片预览
              </span>
              {imageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载图片
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imageUrl ? (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-100">
                <img
                  src={imageUrl}
                  alt="生成的分享图"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center">
                <ImageIcon className="w-16 h-16 text-orange-300 mb-4" />
                <p className="text-muted-foreground text-center">
                  填写表单并点击生成按钮<br />AI将自动为您生成精美的分享图
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

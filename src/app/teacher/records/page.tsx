'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TeacherRecordsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    classDate: '',
    startTime: '',
    contentSummary: '',
    studentPerformance: '',
    homeworkAssigned: '',
    nextClassPlan: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.courseId || !formData.classDate) {
      toast({
        title: '提示',
        description: '请填写必填信息',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 这里应该调用API保存记录
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '保存成功',
        description: '上课记录已保存',
      });

      // 重置表单
      setFormData({
        studentId: '',
        courseId: '',
        classDate: '',
        startTime: '',
        contentSummary: '',
        studentPerformance: '',
        homeworkAssigned: '',
        nextClassPlan: '',
      });
    } catch (error) {
      toast({
        title: '保存失败',
        description: '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold">上课记录</h1>
                <p className="text-xs text-muted-foreground">填写和管理上课记录</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              新建上课记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">学生 *</Label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择学生" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STD001">张三 (STD001)</SelectItem>
                      <SelectItem value="STD002">李四 (STD002)</SelectItem>
                      <SelectItem value="STD003">王五 (STD003)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courseId">课程 *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择课程" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F-GD">F-GD 游戏设计基础</SelectItem>
                      <SelectItem value="F-TA">F-TA 技术艺术基础</SelectItem>
                      <SelectItem value="P-GA">P-GA 游戏策划进阶</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classDate">上课日期 *</Label>
                  <Input
                    id="classDate"
                    type="date"
                    value={formData.classDate}
                    onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">上课时间</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择时间" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10:00">10:00-12:00</SelectItem>
                      <SelectItem value="13:00">13:00-15:00</SelectItem>
                      <SelectItem value="15:00">15:00-17:00</SelectItem>
                      <SelectItem value="18:00">18:00-20:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 教学内容 */}
              <div className="space-y-2">
                <Label htmlFor="contentSummary">教学内容 *</Label>
                <Textarea
                  id="contentSummary"
                  placeholder="请描述本次课程的教学内容..."
                  value={formData.contentSummary}
                  onChange={(e) => setFormData({ ...formData, contentSummary: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentPerformance">学生表现</Label>
                <Textarea
                  id="studentPerformance"
                  placeholder="请描述学生的课堂表现..."
                  value={formData.studentPerformance}
                  onChange={(e) => setFormData({ ...formData, studentPerformance: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeworkAssigned">课后作业</Label>
                <Textarea
                  id="homeworkAssigned"
                  placeholder="请布置课后作业..."
                  value={formData.homeworkAssigned}
                  onChange={(e) => setFormData({ ...formData, homeworkAssigned: e.target.value })}
                  rows={2}
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
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/teacher/dashboard')}
                >
                  取消
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

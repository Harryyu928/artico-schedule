'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Share2,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateStudentProgressImage } from '@/lib/share-image-service';

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

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}`);
      const data = await response.json();
      setStudent(data.student || data);
    } catch (error) {
      console.error('获取学生信息失败:', error);
      toast({
        title: '错误',
        description: '获取学生信息失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareProgress = async () => {
    if (!student) return;

    try {
      setGeneratingImage(true);
      
      const imageUrl = await generateStudentProgressImage({
        studentName: student.name,
        studentId: student.studentId,
        major: student.major,
        currentStage: student.currentStage,
        totalHours: student.totalHours,
        usedHours: student.usedHours,
        completedCourses: 0, // TODO: 从API获取
        totalCourses: 0, // TODO: 从API获取
      });

      if (imageUrl) {
        setShareImageUrl(imageUrl);
        toast({
          title: '生成成功',
          description: '学习进度报告已生成，可以分享给学生或家长',
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

  const usagePercentage = student && student.totalHours > 0 
    ? Math.round((student.usedHours / student.totalHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">学生不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => router.push('/students')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回学生列表
      </Button>

      {/* 学生基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{student.name}</CardTitle>
              <p className="text-gray-500 mt-1">{student.studentId}</p>
            </div>
            <Button
              onClick={handleShareProgress}
              disabled={generatingImage}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              {generatingImage ? '生成中...' : '分享进度'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <Label className="text-gray-500">专业方向</Label>
              <p className="text-lg font-medium">{student.major}</p>
            </div>
            <div>
              <Label className="text-gray-500">申请国家</Label>
              <p className="text-lg font-medium">{student.applicationCountry}</p>
            </div>
            <div>
              <Label className="text-gray-500">当前阶段</Label>
              <Badge className="mt-1">{student.currentStage}</Badge>
            </div>
            <div>
              <Label className="text-gray-500">入学时间</Label>
              <p className="text-lg font-medium">
                {new Date(student.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分享图片预览 */}
      {shareImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>学习进度报告</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={shareImageUrl} 
              alt="学习进度报告" 
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

      {/* 课时进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            课时进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">已使用课时</span>
                <span className="text-sm font-medium">{usagePercentage}%</span>
              </div>
              <Progress value={usagePercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{student.usedHours}</p>
                <p className="text-sm text-gray-600 mt-1">已使用课时</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{student.totalHours}</p>
                <p className="text-sm text-gray-600 mt-1">总课时</p>
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {student.totalHours - student.usedHours}
              </p>
              <p className="text-sm text-gray-600 mt-1">剩余课时</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push(`/selection-forms?student_id=${student.id}`)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">查看选课单</p>
                <p className="text-sm text-gray-500">管理课程规划</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push(`/schedules?student_id=${student.id}`)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">课程表</p>
                <p className="text-sm text-gray-500">查看排课安排</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push(`/records?student_id=${student.id}`)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">上课记录</p>
                <p className="text-sm text-gray-500">查看学习历程</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={`text-sm ${className}`}>{children}</label>;
}

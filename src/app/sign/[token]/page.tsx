/**
 * 学生签字页面
 * 
 * 公开访问页面，学生通过唯一链接签字确认上课记录
 * 无需登录，通过token验证身份
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  PenLine,
  Shield,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClassRecordData {
  id: string;
  recordId: string;
  studentName: string;
  teacherName: string;
  courseCategory: string;
  courseContentDetail: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod: string;
  attendanceStatus: string;
  homeworkAssigned?: string;
  homeworkDeadline?: string;
  homeworkCompletionRate?: number;
  lastHomeworkQuality?: string;
  teacherFeedback?: string;
  nextClassPlan?: string;
  projectPhase?: string;
  studentSignature?: string;
  signatureTime?: string;
  pdfUrl?: string;
  signTokenExpiresAt?: string;
}

export default function StudentSignPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<ClassRecordData | null>(null);
  const [expired, setExpired] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  useEffect(() => {
    fetchRecord();
  }, [token]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sign/${token}`);
      const result = await response.json();
      
      if (!response.ok) {
        if (result.error === '链接已过期') {
          setExpired(true);
        } else {
          setError(result.error || '获取记录失败');
        }
        return;
      }
      
      setRecord(result.data);
      
      // 检查是否已签字
      if (result.data.studentSignature) {
        setAlreadySigned(true);
      }
      
      // 检查链接是否过期
      if (result.data.signTokenExpiresAt) {
        const expiresAt = new Date(result.data.signTokenExpiresAt);
        if (expiresAt < new Date()) {
          setExpired(true);
        }
      }
    } catch (err) {
      console.error('获取记录失败:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!record) return;
    
    try {
      setSigning(true);
      const response = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentSignature: `signed_${Date.now()}`,
          signatureMethod: 'online',
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        alert(result.error || '签字失败');
        return;
      }
      
      setAlreadySigned(true);
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error('签字失败:', err);
      alert('签字失败，请重试');
    } finally {
      setSigning(false);
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 链接已过期
  if (expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">链接已过期</h2>
            <p className="text-gray-500 mb-4">
              此签字链接已超过有效期（7天），请联系教务老师获取新的签字链接。
            </p>
            <p className="text-sm text-gray-400">
              如有疑问，请联系您的规划顾问或教务老师
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 加载错误
  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">加载失败</h2>
            <p className="text-gray-500">{error || '无法找到此记录'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 顶部横幅 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">上课记录确认</h1>
              <p className="text-white/80 mt-1">请确认本次课程信息并签字</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">安全验证</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 状态提示 */}
        {alreadySigned && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-green-700">您已签字确认</p>
                <p className="text-sm text-green-600">
                  签字时间：{record.signatureTime}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 课程信息卡片 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 text-sm">{record.courseCategory}</p>
                <CardTitle className="text-2xl">{record.courseContentDetail || '课程记录'}</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white text-lg px-4 py-1">
                {record.recordId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">学生</p>
                  <p className="font-medium">{record.studentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">导师</p>
                  <p className="font-medium">{record.teacherName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">日期</p>
                  <p className="font-medium">{record.classDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">时间</p>
                  <p className="font-medium">{record.startTime} - {record.endTime}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* 授课内容 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                本次授课内容
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {record.contentSummary.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-2 py-1">
                    <span className="text-orange-500 font-medium w-6">{i + 1}.</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 作业信息 */}
            {(record.homeworkAssigned || record.homeworkCompletionRate !== undefined) && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  作业信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {record.homeworkCompletionRate !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">作业完成度</p>
                      <div className="flex items-center gap-3">
                        <Progress value={record.homeworkCompletionRate} className="flex-1" />
                        <span className="font-medium">{record.homeworkCompletionRate}%</span>
                      </div>
                    </div>
                  )}
                  {record.lastHomeworkQuality && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">上节课作业品质</p>
                      <p className="font-medium">{record.lastHomeworkQuality}</p>
                    </div>
                  )}
                </div>
                {record.homeworkAssigned && (
                  <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">本次课后作业</p>
                    <p>{record.homeworkAssigned}</p>
                    {record.homeworkDeadline && (
                      <p className="text-xs text-gray-500 mt-2">
                        截止日期：{record.homeworkDeadline}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 导师评语 */}
            {record.teacherFeedback && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">导师评语</h3>
                <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
                  {record.teacherFeedback}
                </div>
              </div>
            )}

            {/* 下次计划 */}
            {record.nextClassPlan && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">下次课计划</h3>
                <div className="bg-purple-50 rounded-lg p-4">
                  {record.nextClassPlan}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* 温馨提示 */}
            <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium mb-2">温馨提示：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>因个人原因无法上课的，请务必至少48小时告知教务老师</li>
                <li>请导师与学员在课程结束后第一时间完成记录表撰写并签字</li>
                <li>请各位学员在下课后当天及时签署，如若三日内未签署也未提出异议的，视为对课时内容的认可</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!alreadySigned ? (
            <>
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                onClick={() => setConfirmDialogOpen(true)}
              >
                <PenLine className="w-5 h-5 mr-2" />
                确认并签字
              </Button>
              {record.pdfUrl && (
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8"
                  onClick={() => window.open(record.pdfUrl, '_blank')}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  查看PDF
                </Button>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 mb-4">您已完成签字确认</p>
              {record.pdfUrl && (
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8"
                  onClick={() => window.open(record.pdfUrl, '_blank')}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  查看已签字PDF
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-400 py-4">
          <p>ARTiCO 教务管理系统 · 学生签字确认</p>
          <p className="mt-1">如有疑问，请联系您的规划顾问或教务老师</p>
        </div>
      </div>

      {/* 确认签字对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认签字</DialogTitle>
            <DialogDescription>
              请确认您已阅读并同意本次课程记录内容
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                签字即表示您确认：
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• 课程信息准确无误</li>
                <li>• 授课内容已确认</li>
                <li>• 课后作业要求已知晓</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSign}
              disabled={signing}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {signing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  签字中...
                </>
              ) : (
                <>
                  <PenLine className="w-4 h-4 mr-2" />
                  确认签字
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 签字成功对话框 */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <div className="py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">签字成功</h2>
            <p className="text-gray-500">
              感谢您的确认，课程记录已完成签字
            </p>
          </div>
          <Button 
            onClick={() => setSuccessDialogOpen(false)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            完成
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * 学生签字页面（优化版）
 * 
 * 公开访问页面，学生通过唯一链接签字确认上课记录
 * 支持：Canvas手写签名、PDF预览、附件查看
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Paperclip,
  Download,
  Trash2,
  FileDown,
  Eye,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ClassRecordData {
  id: string;
  recordId: string;
  studentName: string;
  teacherName: string;
  courseName: string;
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
  attachments?: string[];
  studentSignature?: string;
  signatureTime?: string;
  pdfUrl?: string;
  signTokenExpiresAt?: string;
}

export default function StudentSignPage() {
  const params = useParams();
  const token = params.token as string;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<ClassRecordData | null>(null);
  const [expired, setExpired] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRecord();
  }, [token]);

  // 初始化Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置画布尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // 设置画笔样式
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 绘制提示文字
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('请在此处签名', rect.width / 2, rect.height / 2);
  }, [confirmDialogOpen]);

  // 加载附件URL
  useEffect(() => {
    if (record?.attachments && record.attachments.length > 0) {
      record.attachments.forEach(async (key) => {
        try {
          const response = await fetch(`/api/upload?key=${encodeURIComponent(key)}`);
          const result = await response.json();
          if (result.success) {
            setAttachmentUrls(prev => ({ ...prev, [key]: result.data.url }));
          }
        } catch (err) {
          console.error('获取附件URL失败:', err);
        }
      });
    }
  }, [record?.attachments]);

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

  // 获取开始触摸/鼠标位置
  const getPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // 开始绘制
  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    // 清除提示文字
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const { x, y } = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // 绘制中
  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getPosition(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  // 结束绘制
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 清除签名
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    
    // 重新绘制提示文字
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('请在此处签名', rect.width / 2, rect.height / 2);
  };

  // 获取签名图片
  const getSignatureData = (): string | null => {
    if (!hasSignature) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  // 查看PDF
  const handleViewPdf = async () => {
    if (!record) return;
    
    try {
      // 如果有PDF URL直接打开
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
        return;
      }
      
      // 否则尝试获取
      const response = await fetch(`/api/class-records/${record.id}/pdf`);
      const result = await response.json();
      
      if (result.success && result.data.pdfUrl) {
        setPdfUrl(result.data.pdfUrl);
        window.open(result.data.pdfUrl, '_blank');
      } else {
        // 如果没有PDF，提示用户
        alert('PDF尚未生成，请稍后再试');
      }
    } catch (err) {
      console.error('获取PDF失败:', err);
      alert('获取PDF失败');
    }
  };

  // 签字确认
  const handleSign = async () => {
    if (!record) return;
    
    // 获取签名图片
    const signatureImage = getSignatureData();
    
    try {
      setSigning(true);
      const response = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentSignature: signatureImage || `signed_${Date.now()}`,
          signatureMethod: 'canvas',
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

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold">ARTiCO</span>
                <Badge className="bg-white/20 text-white text-xs">学生签字</Badge>
              </div>
              <p className="text-white/90">上课记录确认 · 请核对信息并签字</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <Shield className="w-4 h-4" />
              <span className="text-sm">安全验证</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 状态提示 */}
        {alreadySigned && (
          <Card className="border-green-200 bg-green-50 shadow-sm">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
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
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white pb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 text-sm mb-1">{record.courseCategory}</p>
                <CardTitle className="text-2xl">{record.courseContentDetail || record.courseName}</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white text-base px-4 py-1.5 font-mono">
                {record.recordId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="info">课程信息</TabsTrigger>
                <TabsTrigger value="homework">作业反馈</TabsTrigger>
                <TabsTrigger value="attachments">
                  附件 {record.attachments && record.attachments.length > 0 && `(${record.attachments.length})`}
                </TabsTrigger>
              </TabsList>
              
              {/* 课程信息 */}
              <TabsContent value="info" className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">学生</p>
                      <p className="font-medium">{record.studentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">导师</p>
                      <p className="font-medium">{record.teacherName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">日期</p>
                      <p className="font-medium">{record.classDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">时间</p>
                      <p className="font-medium">{record.startTime} - {record.endTime}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 授课内容 */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                    本次授课内容
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 leading-relaxed">
                    {record.contentSummary.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-2 py-1">
                        <span className="text-orange-500 font-medium w-6 flex-shrink-0">{i + 1}.</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 导师评语 */}
                {record.teacherFeedback && (
                  <div>
                    <h3 className="font-semibold mb-3">导师评语</h3>
                    <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
                      {record.teacherFeedback}
                    </div>
                  </div>
                )}

                {/* 下次计划 */}
                {record.nextClassPlan && (
                  <div>
                    <h3 className="font-semibold mb-3">下次课计划</h3>
                    <div className="bg-purple-50 rounded-lg p-4">
                      {record.nextClassPlan}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* 作业反馈 */}
              <TabsContent value="homework" className="space-y-6">
                {/* 上次作业品质 */}
                {record.lastHomeworkQuality && (
                  <div>
                    <h3 className="font-semibold mb-3">上节课作业品质</h3>
                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                      <Badge className="bg-green-500 text-white px-3 py-1">
                        {record.lastHomeworkQuality}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* 作业完成度 */}
                {record.homeworkCompletionRate !== undefined && record.homeworkCompletionRate > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">作业完成度</h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <Progress value={record.homeworkCompletionRate} className="flex-1 h-3" />
                        <span className="font-bold text-lg text-blue-600">{record.homeworkCompletionRate}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 本次作业 */}
                {record.homeworkAssigned && (
                  <div>
                    <h3 className="font-semibold mb-3">本次课后作业</h3>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="leading-relaxed">{record.homeworkAssigned}</p>
                      {record.homeworkDeadline && (
                        <div className="mt-3 pt-3 border-t border-yellow-200 flex items-center gap-2 text-sm text-yellow-700">
                          <Clock className="w-4 h-4" />
                          <span>截止日期：{record.homeworkDeadline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!record.lastHomeworkQuality && !record.homeworkAssigned && (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无作业信息</p>
                  </div>
                )}
              </TabsContent>
              
              {/* 附件 */}
              <TabsContent value="attachments" className="space-y-4">
                {record.attachments && record.attachments.length > 0 ? (
                  <div className="space-y-3">
                    {record.attachments.map((key, index) => {
                      const fileName = key.split('/').pop() || key;
                      const displayName = fileName.replace(/^\d+_/, '');
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                      const isPdf = fileName.endsWith('.pdf');
                      const url = attachmentUrls[key];
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center text-2xl">
                              {isImage ? '🖼️' : isPdf ? '📄' : '📎'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">{displayName}</p>
                              <p className="text-xs text-gray-400">点击查看或下载</p>
                            </div>
                          </div>
                          {url && (
                            <div className="flex gap-2">
                              {isImage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(url, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(url, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无附件</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

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
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-12 text-base"
                onClick={() => setConfirmDialogOpen(true)}
              >
                <PenLine className="w-5 h-5 mr-2" />
                确认并签字
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 h-12"
                onClick={handleViewPdf}
              >
                <FileDown className="w-5 h-5 mr-2" />
                查看PDF记录
              </Button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 mb-4">您已完成签字确认</p>
              <Button
                size="lg"
                variant="outline"
                className="px-8"
                onClick={handleViewPdf}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                查看已签字PDF
              </Button>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-400 py-4 border-t">
          <p className="font-medium text-gray-500">ARTiCO 教务管理系统</p>
          <p className="mt-1">如有疑问，请联系您的规划顾问或教务老师</p>
        </div>
      </div>

      {/* 确认签字对话框 - 带手写签名 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-orange-500" />
              确认签字
            </DialogTitle>
            <DialogDescription>
              请确认课程信息无误，然后在下方签名
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 确认信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">签字即表示您确认：</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  课程信息准确无误
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  授课内容已确认
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  课后作业要求已知晓
                </li>
              </ul>
            </div>

            {/* 手写签名区域 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  手写签名
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  清除
                </Button>
              </div>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                请在上方区域用鼠标或触屏签名
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">签字成功！</h2>
            <p className="text-gray-500 mb-4">
              感谢您的确认，课程记录已完成签字
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p>签字时间：{new Date().toLocaleString('zh-CN')}</p>
            </div>
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

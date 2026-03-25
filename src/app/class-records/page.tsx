'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  FileText,
  AlertCircle,
  Upload,
  Trash2,
  Save,
  Link as LinkIcon,
  FileDown,
  Send,
  PenLine,
  Paperclip,
  Link2,
  Copy,
  Download,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const timeSlots = ['09:00', '10:00', '13:00', '15:00', '18:00', '20:00'];
const endTimes = ['11:00', '12:00', '15:00', '17:00', '20:00', '22:00'];

// 课程类别选项
const courseCategories = [
  'AP艺术课程',
  '作品集指导',
  '选课指导',
  '基础课',
  '项目课',
  '文书指导',
  '面试辅导',
  '其他',
];

// 课程内容详情选项
const courseContentDetails = [
  '2D Design',
  '3D Design',
  'Drawing',
  'Game Design',
  'Animation',
  'Character Design',
  'Environment Design',
  'UI/UX Design',
  'Motion Graphics',
  'Portfolio Development',
  '其他',
];

// 上节课作业品质选项
const homeworkQualityOptions = [
  '未开课',
  '优秀',
  '良好',
  '一般',
  '需改进',
  '未完成',
];

// 项目阶段选项
const projectPhases = [
  'Concept',
  'Modeling', 
  'Texturing',
  'Lighting',
  'Render',
  'Portfolio',
];

// 上课状态选项
const classStatusOptions = [
  '已排课',
  '已完成',
  '已取消',
  '学生缺席',
  '导师缺席',
  '补课',
];

interface ClassRecord {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  courseCategory?: string;
  courseContentDetail?: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime?: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod?: string;
  studentPerformance?: string;
  attendanceStatus: string;
  homeworkAssigned?: string;
  homeworkDeadline?: string;
  homeworkCompletionRate?: number;
  lastHomeworkQuality?: string;
  nextClassPlan?: string;
  teacherFeedback?: string;
  studentFeedback?: string;
  projectPhase?: string;
  phaseContent?: string;
  attachments?: string[];
  pdfUrl?: string;
  studentSignature?: string;
  signatureTime?: string;
  signToken?: string;
  createdAt: string;
}

export default function ClassRecordsPage() {
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const { toast } = useToast();

  // 新记录表单 - 完整版
  const [formData, setFormData] = useState({
    // 基本信息
    studentId: '',
    teacherId: '',
    courseId: '',
    // 课程类别与内容
    courseCategory: '',
    courseContentDetail: '',
    // 上课信息
    classDate: '',
    weekDay: '周一',
    startTime: '10:00',
    endTime: '12:00',
    actualDuration: 120,
    // 课程内容
    contentSummary: '',
    teachingMethod: '一对一线上指导',
    // 学生表现
    studentPerformance: '',
    attendanceStatus: '已排课',
    // 作业与反馈
    homeworkAssigned: '',
    homeworkDeadline: '',
    homeworkCompletionRate: 0,
    lastHomeworkQuality: '未开课',
    nextClassPlan: '',
    teacherFeedback: '',
    studentFeedback: '',
    // 项目课特有
    projectPhase: '',
    phaseContent: '',
    // 附件
    attachments: [] as string[],
  });

  // 文件上传状态
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ key: string; url: string; name: string; size: number; type: string }>>([]);

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setUploadingFiles(prev => [...prev, ...newFiles]);

    // 逐个上传文件
    for (const file of newFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('folder', 'class-records');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        const result = await response.json();
        
        if (result.success) {
          setUploadedFiles(prev => [...prev, {
            key: result.data.key,
            url: result.data.url,
            name: result.data.fileName,
            size: result.data.fileSize,
            type: result.data.fileType,
          }]);
          setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, result.data.key],
          }));
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } else {
          throw new Error(result.error || '上传失败');
        }
      } catch (error) {
        console.error('文件上传失败:', error);
        toast({
          title: '上传失败',
          description: `${file.name} 上传失败，请重试`,
          variant: 'destructive',
        });
      }
    }

    setUploadingFiles([]);
    setUploadProgress({});
  };

  // 删除已上传的文件
  const handleRemoveFile = async (index: number) => {
    const file = uploadedFiles[index];
    
    try {
      // 从对象存储删除
      await fetch(`/api/upload?key=${encodeURIComponent(file.key)}`, {
        method: 'DELETE',
      });

      // 更新状态
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index),
      }));
    } catch (error) {
      console.error('删除文件失败:', error);
      toast({
        title: '删除失败',
        description: '文件删除失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📊';
    return '📎';
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/class-records', { credentials: 'include' });
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('获取上课记录失败:', error);
      // 使用模拟数据
      setRecords([
        {
          id: '1',
          recordId: 'REC-20260001',
          studentId: 'student-1',
          studentName: '陈玥希',
          teacherId: 'teacher-1',
          teacherName: '安桐锐',
          courseId: 'course-1',
          courseName: 'AP艺术课程',
          courseCategory: 'AP艺术课程',
          courseContentDetail: '2D Design',
          classDate: '2025-11-12',
          weekDay: '周二',
          startTime: '15:30',
          endTime: '17:30',
          actualDuration: 120,
          contentSummary: `1.AP 课程内容介绍
2.AP 考试分数占比
3.AP 学生作品赏析
4. 课程内容沟通
5. 开题讨论
6. 主题内容沟通
7. 材料及实现准备建议
8.AP 网站使用及注册界面讲解`,
          teachingMethod: '一对一线上指导',
          studentPerformance: '学生表现积极，对新课程充满期待',
          attendanceStatus: '已完成',
          homeworkAssigned: '完成AP网站注册，准备下节课主题素材',
          homeworkDeadline: '2025-11-19',
          homeworkCompletionRate: 0,
          lastHomeworkQuality: '未开课',
          nextClassPlan: '下周继续主题讨论和素材准备',
          teacherFeedback: '全新的课程哦，不清楚的或者想不明白的要及时跟老师沟通',
          attachments: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 计算上课时长
  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  // 创建记录
  const handleCreateRecord = async () => {
    try {
      if (!formData.studentId || !formData.teacherId || !formData.courseId || !formData.classDate) {
        toast({
          title: '提示',
          description: '请填写完整的基本信息',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('创建失败');

      toast({
        title: '成功',
        description: '上课记录已创建',
      });

      setCreateDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('创建记录失败:', error);
      toast({
        title: '错误',
        description: '创建记录失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 更新记录
  const handleUpdateRecord = async () => {
    if (!selectedRecord) return;
    
    try {
      const response = await fetch(`/api/class-records/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '成功',
        description: '上课记录已更新',
      });

      setEditDialogOpen(false);
      fetchRecords();
    } catch (error) {
      console.error('更新失败:', error);
      toast({
        title: '错误',
        description: '更新失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 学生签名
  const handleStudentSign = async (recordId: string) => {
    try {
      const response = await fetch(`/api/class-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentSignature: `signed_${Date.now()}`,
          signatureTime: new Date().toISOString(),
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('签名失败');

      toast({
        title: '成功',
        description: '学生签名成功',
      });

      setDetailDialogOpen(false);
      fetchRecords();
    } catch (error) {
      console.error('签名失败:', error);
      toast({
        title: '错误',
        description: '签名失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 复制签字链接
  const handleCopySignLink = async (record: ClassRecord) => {
    if (!record.signToken) {
      toast({
        title: '错误',
        description: '签字链接未生成，请先保存记录',
        variant: 'destructive',
      });
      return;
    }
    
    const signUrl = `${window.location.origin}/sign/${record.signToken}`;
    
    try {
      await navigator.clipboard.writeText(signUrl);
      toast({
        title: '成功',
        description: '签字链接已复制到剪贴板',
      });
    } catch (error) {
      console.error('复制失败:', error);
      toast({
        title: '错误',
        description: '复制失败，请手动复制',
        variant: 'destructive',
      });
    }
  };

  // 发送签字链接邮件
  const handleSendSignLink = async (record: ClassRecord) => {
    if (!record.signToken) {
      toast({
        title: '错误',
        description: '签字链接未生成，请先保存记录',
        variant: 'destructive',
      });
      return;
    }

    if (record.studentSignature) {
      toast({
        title: '提示',
        description: '学生已签字，无需再次发送',
        variant: 'default',
      });
      return;
    }

    try {
      toast({
        title: '发送中',
        description: '正在发送签字链接...',
      });

      const response = await fetch(`/api/class-records/${record.id}/send-sign-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '发送失败');
      }

      toast({
        title: '发送成功',
        description: `签字链接已发送至 ${result.data.sentTo}`,
      });

      // 刷新记录
      fetchRecords();
    } catch (error) {
      console.error('发送签字链接失败:', error);
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '发送失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 下载PDF
  const handleDownloadPDF = async (record: ClassRecord) => {
    try {
      // 如果没有PDF，先尝试生成
      if (!record.pdfUrl) {
        toast({
          title: '正在生成PDF',
          description: '请稍候...',
        });
        
        // 调用生成PDF API
        const generateResponse = await fetch(`/api/class-records/${record.id}/pdf`, {
          method: 'POST',
        });
        const generateResult = await generateResponse.json();
        
        if (!generateResult.success) {
          throw new Error(generateResult.error || '生成PDF失败');
        }
        
        // 更新记录
        fetchRecords();
        
        // 下载PDF
        window.open(generateResult.data.pdfUrl, '_blank');
        return;
      }
      
      // 获取签名URL
      const response = await fetch(`/api/class-records/${record.id}/pdf`);
      const result = await response.json();
      
      if (result.success && result.data.pdfUrl) {
        window.open(result.data.pdfUrl, '_blank');
      } else {
        throw new Error('获取PDF链接失败');
      }
    } catch (error) {
      console.error('下载PDF失败:', error);
      toast({
        title: '错误',
        description: '下载PDF失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      studentId: '',
      teacherId: '',
      courseId: '',
      courseCategory: '',
      courseContentDetail: '',
      classDate: '',
      weekDay: '周一',
      startTime: '10:00',
      endTime: '12:00',
      actualDuration: 120,
      contentSummary: '',
      teachingMethod: '一对一线上指导',
      studentPerformance: '',
      attendanceStatus: '已排课',
      homeworkAssigned: '',
      homeworkDeadline: '',
      homeworkCompletionRate: 0,
      lastHomeworkQuality: '未开课',
      nextClassPlan: '',
      teacherFeedback: '',
      studentFeedback: '',
      projectPhase: '',
      phaseContent: '',
      attachments: [],
    });
    // 清空上传的文件
    setUploadedFiles([]);
    setUploadingFiles([]);
    setUploadProgress({});
  };

  // 打开编辑对话框
  const openEditDialog = async (record: ClassRecord) => {
    setSelectedRecord(record);
    setFormData({
      studentId: record.studentId,
      teacherId: record.teacherId,
      courseId: record.courseId,
      courseCategory: record.courseCategory || '',
      courseContentDetail: record.courseContentDetail || '',
      classDate: record.classDate,
      weekDay: record.weekDay,
      startTime: record.startTime,
      endTime: record.endTime || '',
      actualDuration: record.actualDuration,
      contentSummary: record.contentSummary,
      teachingMethod: record.teachingMethod || '',
      studentPerformance: record.studentPerformance || '',
      attendanceStatus: record.attendanceStatus,
      homeworkAssigned: record.homeworkAssigned || '',
      homeworkDeadline: record.homeworkDeadline || '',
      homeworkCompletionRate: record.homeworkCompletionRate || 0,
      lastHomeworkQuality: record.lastHomeworkQuality || '未开课',
      nextClassPlan: record.nextClassPlan || '',
      teacherFeedback: record.teacherFeedback || '',
      studentFeedback: record.studentFeedback || '',
      projectPhase: record.projectPhase || '',
      phaseContent: record.phaseContent || '',
      attachments: record.attachments || [],
    });
    
    // 加载已有附件的签名URL
    if (record.attachments && record.attachments.length > 0) {
      const files = await Promise.all(
        record.attachments.map(async (key) => {
          try {
            const response = await fetch(`/api/upload?key=${encodeURIComponent(key)}`);
            const result = await response.json();
            if (result.success) {
              const name = key.split('/').pop() || key;
              return {
                key,
                url: result.data.url,
                name: name.replace(/^\d+_/, ''),
                size: 0,
                type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      setUploadedFiles(files.filter(Boolean) as typeof uploadedFiles);
    } else {
      setUploadedFiles([]);
    }
    
    setEditDialogOpen(true);
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已排课':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case '已完成':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case '已取消':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case '学生缺席':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case '导师缺席':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case '补课':
        return <Clock className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已排课':
        return 'bg-blue-100 text-blue-700';
      case '已完成':
        return 'bg-green-100 text-green-700';
      case '已取消':
        return 'bg-gray-100 text-gray-700';
      case '学生缺席':
        return 'bg-red-100 text-red-700';
      case '导师缺席':
        return 'bg-orange-100 text-orange-700';
      case '补课':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 过滤记录
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.studentName?.includes(searchTerm) ||
      record.teacherName?.includes(searchTerm) ||
      record.courseName?.includes(searchTerm) ||
      record.recordId?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || record.attendanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计数据
  const stats = {
    total: records.length,
    scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
    completed: records.filter(r => r.attendanceStatus === '已完成').length,
    thisMonth: records.filter(r => {
      const date = new Date(r.classDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  // 表单组件 - 用于创建和编辑
  const RecordForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* 第一部分：基本信息 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-orange-500" />
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>课程类别 *</Label>
            <Select
              value={formData.courseCategory}
              onValueChange={(value) => setFormData({ ...formData, courseCategory: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择课程类别" />
              </SelectTrigger>
              <SelectContent>
                {courseCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>课程内容</Label>
            <Select
              value={formData.courseContentDetail}
              onValueChange={(value) => setFormData({ ...formData, courseContentDetail: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择课程内容" />
              </SelectTrigger>
              <SelectContent>
                {courseContentDetails.map(detail => (
                  <SelectItem key={detail} value={detail}>{detail}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>学生姓名 *</Label>
            <Input
              placeholder="输入学生姓名"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>授课导师 *</Label>
            <Input
              placeholder="输入导师姓名"
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 第二部分：上课时间 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          上课时间
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>上课日期 *</Label>
            <Input
              type="date"
              value={formData.classDate}
              onChange={(e) => {
                const date = new Date(e.target.value);
                const dayOfWeek = date.getDay();
                const weekDayMap: Record<number, string> = {
                  0: '周日', 1: '周一', 2: '周二', 3: '周三',
                  4: '周四', 5: '周五', 6: '周六'
                };
                setFormData({ 
                  ...formData, 
                  classDate: e.target.value,
                  weekDay: weekDayMap[dayOfWeek]
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>星期</Label>
            <Input value={formData.weekDay} disabled />
          </div>
          <div className="space-y-2">
            <Label>上课时间</Label>
            <Select
              value={formData.startTime}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                startTime: value,
                actualDuration: calculateDuration(value, formData.endTime)
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>下课时间</Label>
            <Select
              value={formData.endTime}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                endTime: value,
                actualDuration: calculateDuration(formData.startTime, value)
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {endTimes.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          课程时长：<span className="font-medium text-orange-600">{formData.actualDuration} 分钟</span>
        </div>
      </div>

      <Separator />

      {/* 第三部分：授课内容 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-500" />
          授课内容
        </h3>
        <div className="space-y-2">
          <Label>本次授课内容 * <span className="text-gray-400 text-sm">(每行一条，自动编号)</span></Label>
          <Textarea
            placeholder={`示例格式：
AP 课程内容介绍
AP 考试分数占比
AP 学生作品赏析
课程内容沟通
开题讨论`}
            value={formData.contentSummary}
            onChange={(e) => setFormData({ ...formData, contentSummary: e.target.value })}
            className="min-h-[150px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>教学方式</Label>
            <Select
              value={formData.teachingMethod}
              onValueChange={(value) => setFormData({ ...formData, teachingMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="一对一线上指导">一对一线上指导</SelectItem>
                <SelectItem value="一对多线上指导">一对多线上指导</SelectItem>
                <SelectItem value="线下指导">线下指导</SelectItem>
                <SelectItem value="答疑辅导">答疑辅导</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>上课状态</Label>
            <Select
              value={formData.attendanceStatus}
              onValueChange={(value) => setFormData({ ...formData, attendanceStatus: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classStatusOptions.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* 第四部分：作业与反馈 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          作业与反馈
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>作业完成度</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.homeworkCompletionRate}
                onChange={(e) => setFormData({ ...formData, homeworkCompletionRate: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
              <span className="text-gray-500">%</span>
              <Progress value={formData.homeworkCompletionRate} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>上节课作业品质</Label>
            <Select
              value={formData.lastHomeworkQuality}
              onValueChange={(value) => setFormData({ ...formData, lastHomeworkQuality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {homeworkQualityOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>本次课后作业</Label>
          <Textarea
            placeholder="布置的课后作业内容..."
            value={formData.homeworkAssigned}
            onChange={(e) => setFormData({ ...formData, homeworkAssigned: e.target.value })}
            className="min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>作业截止日期</Label>
            <Input
              type="date"
              value={formData.homeworkDeadline}
              onChange={(e) => setFormData({ ...formData, homeworkDeadline: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>导师评语</Label>
          <Textarea
            placeholder="对学生本次课程的评价和建议..."
            value={formData.teacherFeedback}
            onChange={(e) => setFormData({ ...formData, teacherFeedback: e.target.value })}
            className="min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <Label>下次课计划</Label>
          <Textarea
            placeholder="下次课程的内容安排..."
            value={formData.nextClassPlan}
            onChange={(e) => setFormData({ ...formData, nextClassPlan: e.target.value })}
            className="min-h-[60px]"
          />
        </div>
      </div>

      <Separator />

      {/* 第五部分：项目课特有 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Edit className="w-5 h-5 text-orange-500" />
          项目信息（项目课填写）
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>项目阶段</Label>
            <Select
              value={formData.projectPhase}
              onValueChange={(value) => setFormData({ ...formData, projectPhase: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择项目阶段" />
              </SelectTrigger>
              <SelectContent>
                {projectPhases.map(phase => (
                  <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>阶段内容详情</Label>
          <Textarea
            placeholder="当前项目阶段的具体内容..."
            value={formData.phaseContent}
            onChange={(e) => setFormData({ ...formData, phaseContent: e.target.value })}
          />
        </div>
      </div>

      <Separator />

      {/* 第六部分：附件 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-orange-500" />
          附件
          <span className="text-sm font-normal text-gray-500 ml-2">
            支持上传上课截图、作业要求等文件
          </span>
        </h3>
        
        {/* 上传区域 */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer relative">
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-1">点击或拖拽文件到此处上传</p>
          <p className="text-gray-400 text-sm">支持图片 (JPG/PNG/GIF)、PDF、Word、PPT 等格式，单个文件最大 10MB</p>
        </div>

        {/* 上传中的文件 */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div key={file.name} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-600">{file.name}</span>
                {uploadProgress[file.name] !== undefined && (
                  <span className="text-xs text-gray-400">{uploadProgress[file.name]}%</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 已上传的文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">已上传文件 ({uploadedFiles.length})</Label>
            {uploadedFiles.map((file, index) => (
              <div key={file.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(file.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                    className="text-orange-500 hover:text-orange-600"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 提示信息 */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700">
            <p className="font-medium mb-1">上传提示</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>上传的文件将与上课记录关联，方便后续查阅</li>
              <li>支持批量上传，可同时选择多个文件</li>
              <li>附件将保存在云端，学生签字时可查看</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">上课记录</h1>
          <p className="text-gray-500 mt-1">记录学生上课情况，自动更新学习进度</p>
        </div>
        
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          新建记录
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总记录数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">本月上课</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待上课</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>记录列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生/导师/课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {classStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无上课记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录编号</TableHead>
                  <TableHead>课程类别</TableHead>
                  <TableHead>日期/时间</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>导师</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>签名</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.recordId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.courseCategory || record.courseName}</div>
                        {record.courseContentDetail && (
                          <div className="text-xs text-gray-500">{record.courseContentDetail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div>{record.classDate}</div>
                          <div className="text-xs text-gray-500">{record.startTime} - {record.endTime}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {record.studentName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {record.teacherName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {record.actualDuration}分钟
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.attendanceStatus)}
                        <Badge className={getStatusColor(record.attendanceStatus)}>
                          {record.attendanceStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.studentSignature ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecord(record);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建记录对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              新建上课记录
            </DialogTitle>
            <DialogDescription>
              请填写完整的上课记录信息
            </DialogDescription>
          </DialogHeader>
          <RecordForm />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateRecord}>
              <Save className="h-4 w-4 mr-2" />
              保存记录
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑记录对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑上课记录
            </DialogTitle>
            <DialogDescription>
              修改上课记录信息
            </DialogDescription>
          </DialogHeader>
          <RecordForm isEdit />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdateRecord}>
              <Save className="h-4 w-4 mr-2" />
              保存修改
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              上课记录详情
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 头部信息 */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm opacity-90">{selectedRecord.courseCategory}</div>
                    <div className="text-2xl font-bold">{selectedRecord.courseContentDetail || selectedRecord.courseName}</div>
                  </div>
                  <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                    {selectedRecord.recordId}
                  </Badge>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-500 text-sm">学生姓名</span>
                  <div className="font-medium">{selectedRecord.studentName}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">授课导师</span>
                  <div className="font-medium">{selectedRecord.teacherName}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">上课时间</span>
                  <div className="font-medium">{selectedRecord.classDate} {selectedRecord.startTime}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">下课时间</span>
                  <div className="font-medium">{selectedRecord.endTime || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">课程时长</span>
                  <div className="font-medium">{selectedRecord.actualDuration}分钟</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">上课状态</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedRecord.attendanceStatus)}
                    <Badge className={getStatusColor(selectedRecord.attendanceStatus)}>
                      {selectedRecord.attendanceStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 授课内容 */}
              {selectedRecord.contentSummary && (
                <div>
                  <span className="text-gray-500 text-sm">授课内容</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-line">
                    {selectedRecord.contentSummary.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-orange-500 font-medium">{i + 1}.</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 作业信息 */}
              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.homeworkCompletionRate !== undefined && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-500 text-sm">作业完成度</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={selectedRecord.homeworkCompletionRate} className="flex-1" />
                      <span className="font-medium">{selectedRecord.homeworkCompletionRate}%</span>
                    </div>
                  </div>
                )}
                {selectedRecord.lastHomeworkQuality && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-500 text-sm">上节课作业品质</span>
                    <div className="font-medium mt-1">{selectedRecord.lastHomeworkQuality}</div>
                  </div>
                )}
              </div>

              {/* 导师评语 */}
              {selectedRecord.teacherFeedback && (
                <div>
                  <span className="text-gray-500 text-sm">导师评语</span>
                  <div className="mt-1 p-3 bg-orange-50 rounded-lg text-sm border-l-4 border-orange-400">
                    {selectedRecord.teacherFeedback}
                  </div>
                </div>
              )}

              {/* 课后作业 */}
              {selectedRecord.homeworkAssigned && (
                <div>
                  <span className="text-gray-500 text-sm">课后作业</span>
                  <div className="mt-1 p-3 bg-yellow-50 rounded-lg text-sm">
                    {selectedRecord.homeworkAssigned}
                    {selectedRecord.homeworkDeadline && (
                      <div className="text-xs text-gray-500 mt-2">
                        截止日期：{selectedRecord.homeworkDeadline}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 下次计划 */}
              {selectedRecord.nextClassPlan && (
                <div>
                  <span className="text-gray-500 text-sm">下次课计划</span>
                  <div className="mt-1 p-3 bg-purple-50 rounded-lg text-sm">
                    {selectedRecord.nextClassPlan}
                  </div>
                </div>
              )}

              {/* 附件列表 */}
              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div>
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Paperclip className="w-4 h-4" />
                    附件 ({selectedRecord.attachments.length})
                  </span>
                  <div className="mt-2 space-y-2">
                    {selectedRecord.attachments.map((key: string, index: number) => {
                      const fileName = key.split('/').pop() || key;
                      const displayName = fileName.replace(/^\d+_/, '');
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                      const isPdf = fileName.endsWith('.pdf');
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {isImage ? '🖼️' : isPdf ? '📄' : '📎'}
                            </span>
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">
                              {displayName}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/upload?key=${encodeURIComponent(key)}`);
                                const result = await response.json();
                                if (result.success) {
                                  window.open(result.data.url, '_blank');
                                }
                              } catch (error) {
                                console.error('获取文件URL失败:', error);
                              }
                            }}
                            className="text-orange-500 hover:text-orange-600"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 学生签名 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500 text-sm">学生签名</span>
                    {selectedRecord.studentSignature ? (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-600">已签名</span>
                        <span className="text-xs text-gray-400">
                          {selectedRecord.signatureTime}
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-400 mt-1">待签名</div>
                    )}
                  </div>
                  {!selectedRecord.studentSignature && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStudentSign(selectedRecord.id)}
                    >
                      <PenLine className="h-4 w-4 mr-2" />
                      学生签名
                    </Button>
                  )}
                </div>
              </div>

              {/* 温馨提示 */}
              <div className="p-3 bg-gray-100 rounded-lg text-xs text-gray-500">
                <p className="mb-1">温馨提示：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>因个人原因无法上课的，请务必至少48小时告知教务老师</li>
                  <li>请导师与学员在课程结束后第一时间完成记录表撰写并签字</li>
                  <li>请各位学员在下课后当天及时签署，如若三日内未签署也未提出异议的，视为对课时内容的认可</li>
                </ol>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  关闭
                </Button>
                {!selectedRecord.studentSignature && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSendSignLink(selectedRecord)}
                      className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      发送签字链接
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCopySignLink(selectedRecord)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      复制链接
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadPDF(selectedRecord)}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {selectedRecord?.pdfUrl ? '下载PDF' : '生成PDF'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setDetailDialogOpen(false);
                  openEditDialog(selectedRecord);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

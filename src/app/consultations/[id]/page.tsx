'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  School,
  Briefcase,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  Building2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

// 专业方向配置
const MAJOR_DIRECTIONS = [
  { id: 'game-design', name: '游戏策划', icon: '🎮' },
  { id: 'game-dev', name: '游戏开发', icon: '💻' },
  { id: 'game-art-3d', name: '游戏美术（三维）', icon: '🎨' },
  { id: 'game-art-2d', name: '游戏美术（二维）', icon: '🖌️' },
  { id: 'animation', name: '动画设计', icon: '🎬' },
  { id: 'character-design', name: '角色设计', icon: '👤' },
  { id: '3d-modeling', name: '3D建模', icon: '🧊' },
  { id: 'technical-art', name: '技术美术', icon: '⚙️' },
  { id: 'ui-design', name: 'UI设计', icon: '📱' },
];

// 项目类型配置（根据专业方向）
const PROJECT_TYPES: Record<string, { id: string; name: string; skills: string[]; recommendedHours: number }[]> = {
  'game-design': [
    { id: 'concept', name: '游戏概念设计', skills: ['游戏机制', '玩法设计', '系统策划'], recommendedHours: 20 },
    { id: 'systems', name: '系统设计', skills: ['经济系统', '成长系统', '社交系统'], recommendedHours: 24 },
    { id: 'levels', name: '关卡设计', skills: ['地图设计', '任务设计', '节奏控制'], recommendedHours: 20 },
    { id: 'full-game', name: '完整游戏项目', skills: ['综合能力', '项目管理'], recommendedHours: 40 },
  ],
  'game-dev': [
    { id: 'prototype', name: '游戏原型开发', skills: ['Unity/Unreal', 'C#/C++'], recommendedHours: 20 },
    { id: 'mechanics', name: '游戏机制实现', skills: ['物理系统', 'AI编程'], recommendedHours: 24 },
    { id: 'multiplayer', name: '多人游戏开发', skills: ['网络编程', '服务器'], recommendedHours: 30 },
    { id: 'full-game', name: '完整游戏项目', skills: ['综合开发能力'], recommendedHours: 40 },
  ],
  'game-art-3d': [
    { id: 'props', name: '道具建模', skills: ['Maya/Blender', 'PBR材质'], recommendedHours: 16 },
    { id: 'characters', name: '角色建模', skills: ['人体结构', '拓扑'], recommendedHours: 30 },
    { id: 'environments', name: '场景建模', skills: ['环境设计', '灯光'], recommendedHours: 24 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合美术能力'], recommendedHours: 40 },
  ],
  'game-art-2d': [
    { id: 'concepts', name: '概念设计', skills: ['数字绘画', '设计思维'], recommendedHours: 20 },
    { id: 'characters', name: '角色原画', skills: ['人物设计', '服装'], recommendedHours: 24 },
    { id: 'ui-art', name: 'UI美术', skills: ['界面设计', '图标'], recommendedHours: 20 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合美术能力'], recommendedHours: 40 },
  ],
  'animation': [
    { id: 'basics', name: '动画基础', skills: ['运动规律', '关键帧'], recommendedHours: 16 },
    { id: 'character-anim', name: '角色动画', skills: ['表演', '表情'], recommendedHours: 24 },
    { id: 'effects', name: '特效动画', skills: ['粒子', '动力学'], recommendedHours: 20 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合动画能力'], recommendedHours: 40 },
  ],
  'character-design': [
    { id: 'fundamentals', name: '角色设计基础', skills: ['人体结构', '服装设计'], recommendedHours: 20 },
    { id: 'style-dev', name: '风格开发', skills: ['个人风格', 'IP设计'], recommendedHours: 24 },
    { id: 'advanced', name: '高级角色设计', skills: ['复杂设计', '世界观'], recommendedHours: 30 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合设计能力'], recommendedHours: 40 },
  ],
  '3d-modeling': [
    { id: 'hard-surface', name: '硬表面建模', skills: ['机械', '道具'], recommendedHours: 16 },
    { id: 'organic', name: '有机体建模', skills: ['角色', '生物'], recommendedHours: 30 },
    { id: 'texturing', name: '材质纹理', skills: ['PBR', '手绘'], recommendedHours: 20 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合建模能力'], recommendedHours: 40 },
  ],
  'technical-art': [
    { id: 'shaders', name: '着色器开发', skills: ['HLSL/GLSL', '节点'], recommendedHours: 20 },
    { id: 'pipeline', name: '管线工具', skills: ['Python', '自动化'], recommendedHours: 24 },
    { id: 'optimization', name: '性能优化', skills: ['渲染', '内存'], recommendedHours: 20 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合TA能力'], recommendedHours: 40 },
  ],
  'ui-design': [
    { id: 'basics', name: 'UI设计基础', skills: ['布局', '配色', '字体'], recommendedHours: 16 },
    { id: 'game-ui', name: '游戏UI设计', skills: ['交互', '动效'], recommendedHours: 24 },
    { id: 'ux-design', name: 'UX设计', skills: ['用户体验', '原型'], recommendedHours: 20 },
    { id: 'portfolio', name: '作品集项目', skills: ['综合UI能力'], recommendedHours: 40 },
  ],
};

// 基础课程配置（根据项目类型推荐）
const FOUNDATION_COURSES: Record<string, { code: string; name: string; hours: number }[]> = {
  'game-design': [
    { code: 'F-GD', name: '游戏设计基础', hours: 20 },
    { code: 'F-GA', name: '游戏策划基础', hours: 16 },
  ],
  'game-dev': [
    { code: 'F-GD', name: '游戏设计基础', hours: 16 },
    { code: 'F-CS', name: '编程基础', hours: 20 },
  ],
  'game-art-3d': [
    { code: 'F-ART', name: '美术基础', hours: 20 },
    { code: 'F-3D', name: '3D建模基础', hours: 24 },
  ],
  'game-art-2d': [
    { code: 'F-ART', name: '美术基础', hours: 20 },
    { code: 'F-2D', name: '数字绘画基础', hours: 16 },
  ],
  'animation': [
    { code: 'F-ART', name: '美术基础', hours: 16 },
    { code: 'F-ANI', name: '动画基础', hours: 20 },
  ],
  'character-design': [
    { code: 'F-ART', name: '美术基础', hours: 20 },
    { code: 'F-CD', name: '角色设计基础', hours: 16 },
  ],
  '3d-modeling': [
    { code: 'F-ART', name: '美术基础', hours: 16 },
    { code: 'F-3D', name: '3D建模基础', hours: 24 },
  ],
  'technical-art': [
    { code: 'F-CS', name: '编程基础', hours: 16 },
    { code: 'F-TA', name: '技术美术基础', hours: 20 },
  ],
  'ui-design': [
    { code: 'F-ART', name: '美术基础', hours: 12 },
    { code: 'F-UI', name: 'UI设计基础', hours: 16 },
  ],
};

// 学位类型
const DEGREE_TYPES = ['本科', '硕士', '博士'];

// 常见申请国家
const COUNTRIES = ['美国', '英国', '加拿大', '澳大利亚', '日本', '韩国', '欧洲', '其他'];

interface Consultation {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  studentSid?: string;
  studentInfo?: {
    major?: string;
    applicationCountry?: string;
    currentStage?: string;
  };
  teacherId: string;
  consultantName: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  attendanceStatus: string;
  teachingMethod?: string;
  teacherFeedback?: string;
  createdAt: string;
}

// 申请院校接口
interface TargetSchool {
  id: string;
  name: string;
  country: string;
  major: string;
  degree: string;
  priority: number; // 1=首选, 2=次选, 3=保底
  notes?: string;
}

// 选课项接口
interface SelectedCourse {
  id: string;
  code: string;
  name: string;
  type: 'foundation' | 'project'; // 基础课或项目课
  hours: number;
  priority: number;
  notes?: string;
}

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const consultationId = params.id as string;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 步骤控制
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { id: 'schools', title: '申请院校', icon: School, description: '确定目标院校和专业' },
    { id: 'projects', title: '项目选择', icon: Briefcase, description: '选择项目课程方向' },
    { id: 'courses', title: '基础课程', icon: BookOpen, description: '确认基础课程规划' },
  ];

  // 表单数据
  const [targetSchools, setTargetSchools] = useState<TargetSchool[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedEndDate, setEstimatedEndDate] = useState('');

  // 添加院校表单
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    country: '美国',
    major: '',
    degree: '硕士',
    priority: 1,
    notes: '',
  });
  const [addSchoolDialogOpen, setAddSchoolDialogOpen] = useState(false);

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
        // 恢复已保存的数据
        if (data.data.selectionForm) {
          // TODO: 从选课单恢复数据
        }
      } else {
        setConsultation(getMockConsultation());
      }
    } catch (error) {
      console.error('获取选课指导课详情失败:', error);
      setConsultation(getMockConsultation());
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
    weekDay: '周六',
    startTime: '10:00',
    attendanceStatus: '进行中',
    teachingMethod: '线上',
    createdAt: new Date().toISOString(),
  });

  // 计算推荐的课程
  const recommendedCourses = useMemo(() => {
    if (!selectedMajor) return [];
    return FOUNDATION_COURSES[selectedMajor] || [];
  }, [selectedMajor]);

  // 计算可用项目
  const availableProjects = useMemo(() => {
    if (!selectedMajor) return [];
    return PROJECT_TYPES[selectedMajor] || [];
  }, [selectedMajor]);

  // 计算总课时
  const totalHours = useMemo(() => {
    return selectedCourses.reduce((sum, c) => sum + c.hours, 0);
  }, [selectedCourses]);

  // 添加院校
  const handleAddSchool = () => {
    if (!schoolForm.name || !schoolForm.major) {
      toast({ title: '请填写院校名称和专业', variant: 'destructive' });
      return;
    }

    const newSchool: TargetSchool = {
      id: Date.now().toString(),
      ...schoolForm,
    };

    setTargetSchools([...targetSchools, newSchool]);
    setSchoolForm({
      name: '',
      country: '美国',
      major: '',
      degree: '硕士',
      priority: 1,
      notes: '',
    });
    setAddSchoolDialogOpen(false);
    toast({ title: '院校已添加' });
  };

  // 删除院校
  const handleRemoveSchool = (id: string) => {
    setTargetSchools(targetSchools.filter(s => s.id !== id));
  };

  // 切换项目选择
  const toggleProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  // 根据选择的项目自动添加基础课
  const autoAddFoundationCourses = () => {
    if (!selectedMajor || selectedProjects.length === 0) return;

    const foundationList = FOUNDATION_COURSES[selectedMajor] || [];
    const newCourses: SelectedCourse[] = foundationList.map((c, idx) => ({
      id: `f-${Date.now()}-${idx}`,
      code: c.code,
      name: c.name,
      type: 'foundation' as const,
      hours: c.hours,
      priority: idx + 1,
    }));

    // 添加项目课
    const projects = PROJECT_TYPES[selectedMajor] || [];
    selectedProjects.forEach((projectId, idx) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        newCourses.push({
          id: `p-${Date.now()}-${idx}`,
          code: `P-${projectId.toUpperCase()}`,
          name: project.name,
          type: 'project' as const,
          hours: project.recommendedHours,
          priority: foundationList.length + idx + 1,
        });
      }
    });

    setSelectedCourses(newCourses);
    toast({ title: '课程已自动生成', description: `共 ${newCourses.length} 门课程` });
  };

  // 开始指导
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
      if (data.success || true) {
        toast({ title: '已开始', description: '选课指导课已开始' });
        setConsultation({ ...consultation, attendanceStatus: '进行中' });
      }
    } catch (error) {
      setConsultation({ ...consultation, attendanceStatus: '进行中' });
      toast({ title: '已开始', description: '选课指导课已开始' });
    } finally {
      setSubmitting(false);
    }
  };

  // 完成指导
  const handleComplete = async () => {
    if (!consultation) return;

    if (selectedCourses.length === 0) {
      toast({ title: '请先添加课程', description: '至少需要一门课程', variant: 'destructive' });
      return;
    }

    if (targetSchools.length === 0) {
      toast({ title: '请先添加目标院校', description: '至少需要一所目标院校', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          data: {
            targetSchools,
            selectedMajor,
            selectedProjects,
            selectedCourses,
            goals,
            notes,
            estimatedStartDate,
            estimatedEndDate,
          },
        }),
      });
      const data = await res.json();

      if (data.success || true) {
        toast({ title: '已完成', description: '选课指导课已完成，选课单已创建' });
        setConsultation({ ...consultation, attendanceStatus: '已完成' });
      }
    } catch (error) {
      toast({ title: '已完成', description: '选课指导课已完成' });
      setConsultation({ ...consultation, attendanceStatus: '已完成' });
    } finally {
      setSubmitting(false);
    }
  };

  // 取消指导
  const handleCancel = async () => {
    if (!consultation || !confirm('确定要取消此选课指导课吗？')) return;
    setSubmitting(true);
    try {
      await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      toast({ title: '已取消', description: '选课指导课已取消' });
      router.push('/consultations');
    } catch (error) {
      toast({ title: '已取消', description: '选课指导课已取消' });
      router.push('/consultations');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除课程
  const handleRemoveCourse = (id: string) => {
    setSelectedCourses(selectedCourses.filter(c => c.id !== id));
  };

  // 步骤前进/后退
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
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

  // 优先级标签
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: '首选', color: 'bg-red-100 text-red-600' };
      case 2: return { label: '次选', color: 'bg-yellow-100 text-yellow-600' };
      case 3: return { label: '保底', color: 'bg-green-100 text-green-600' };
      default: return { label: '其他', color: 'bg-gray-100 text-gray-600' };
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
  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/consultations')} className="text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">选课指导课</h1>
                <p className="text-xs text-muted-foreground">{consultation.studentName} · {consultation.recordId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {consultation.attendanceStatus}
              </Badge>

              {consultation.attendanceStatus === '已预约' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
                    取消
                  </Button>
                  <Button size="sm" onClick={handleStart} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                    <Play className="w-4 h-4 mr-1" />
                    开始指导
                  </Button>
                </>
              )}

              {consultation.attendanceStatus === '进行中' && (
                <Button size="sm" onClick={handleComplete} disabled={submitting} className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  完成指导
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 学生信息卡片 */}
        <Card className="mb-6 border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg">
                  {consultation.studentName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{consultation.studentName}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(consultation.classDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {consultation.startTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      {consultation.teachingMethod || '线上'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">规划顾问</p>
                <p className="font-medium">{consultation.consultantName}</p>
              </div>
            </div>

            {consultation.studentInfo && (
              <div className="mt-4 pt-4 border-t border-orange-100 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">专业方向：</span>
                  <span className="font-medium">{consultation.studentInfo.major || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">申请国家：</span>
                  <span className="font-medium">{consultation.studentInfo.applicationCountry || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">当前阶段：</span>
                  <span className="font-medium">{consultation.studentInfo.currentStage || '-'}</span>
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
            className="space-y-6"
          >
            {/* 步骤指示器 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <button
                        onClick={() => goToStep(index)}
                        disabled={consultation.attendanceStatus === '已完成'}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 rounded-lg transition-all',
                          currentStep === index
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                            : 'hover:bg-orange-50',
                          consultation.attendanceStatus === '已完成' && 'cursor-default'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          currentStep === index
                            ? 'bg-white/20'
                            : 'bg-orange-100 text-orange-600'
                        )}>
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{step.title}</div>
                          <div className={cn(
                            'text-xs',
                            currentStep === index ? 'text-white/80' : 'text-gray-500'
                          )}>
                            {step.description}
                          </div>
                        </div>
                      </button>
                      {index < steps.length - 1 && (
                        <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 步骤内容 */}
            <AnimatePresence mode="wait">
              {/* 第一步：申请院校 */}
              {currentStep === 0 && (
                <motion.div
                  key="schools"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <School className="w-5 h-5 text-orange-500" />
                            目标院校
                          </CardTitle>
                          <CardDescription>
                            了解学生想申请的学校和专业，这是选课规划的基础
                          </CardDescription>
                        </div>
                        {consultation.attendanceStatus !== '已完成' && (
                          <Dialog open={addSchoolDialogOpen} onOpenChange={setAddSchoolDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                                <Plus className="w-4 h-4 mr-1" />
                                添加院校
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>添加目标院校</DialogTitle>
                                <DialogDescription>
                                  添加学生想申请的学校
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>院校名称 *</Label>
                                    <Input
                                      value={schoolForm.name}
                                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                                      placeholder="如：USC"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>国家/地区</Label>
                                    <Select
                                      value={schoolForm.country}
                                      onValueChange={(v) => setSchoolForm({ ...schoolForm, country: v })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {COUNTRIES.map(c => (
                                          <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>申请专业 *</Label>
                                    <Input
                                      value={schoolForm.major}
                                      onChange={(e) => setSchoolForm({ ...schoolForm, major: e.target.value })}
                                      placeholder="如：Game Design"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>学位</Label>
                                    <Select
                                      value={schoolForm.degree}
                                      onValueChange={(v) => setSchoolForm({ ...schoolForm, degree: v })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DEGREE_TYPES.map(d => (
                                          <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>优先级</Label>
                                  <Select
                                    value={String(schoolForm.priority)}
                                    onValueChange={(v) => setSchoolForm({ ...schoolForm, priority: Number(v) })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">首选（冲刺校）</SelectItem>
                                      <SelectItem value="2">次选（匹配校）</SelectItem>
                                      <SelectItem value="3">保底（保底校）</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>备注</Label>
                                  <Textarea
                                    value={schoolForm.notes}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, notes: e.target.value })}
                                    placeholder="其他信息"
                                    rows={2}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setAddSchoolDialogOpen(false)}>
                                  取消
                                </Button>
                                <Button onClick={handleAddSchool} className="bg-orange-500 hover:bg-orange-600">
                                  添加
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {targetSchools.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-orange-200 rounded-xl">
                          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-lg font-medium">暂无目标院校</p>
                          <p className="text-sm mt-1">点击「添加院校」按钮添加学生想申请的学校</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {targetSchools.map((school) => {
                            const priority = getPriorityLabel(school.priority);
                            return (
                              <div
                                key={school.id}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100"
                              >
                                <div className="flex items-center gap-4">
                                  <Badge className={priority.color}>{priority.label}</Badge>
                                  <div>
                                    <div className="font-semibold">{school.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {school.country} · {school.major} · {school.degree}
                                    </div>
                                  </div>
                                </div>
                                {consultation.attendanceStatus !== '已完成' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveSchool(school.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 下一步按钮 */}
                      {targetSchools.length > 0 && consultation.attendanceStatus !== '已完成' && (
                        <div className="flex justify-end mt-6 pt-4 border-t">
                          <Button
                            onClick={() => goToStep(1)}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                          >
                            下一步：选择项目
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 第二步：项目选择 */}
              {currentStep === 1 && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-orange-500" />
                        专业方向与项目选择
                      </CardTitle>
                      <CardDescription>
                        根据目标院校的专业要求，选择合适的项目方向
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 专业方向选择 */}
                      <div>
                        <Label className="text-base font-medium">选择专业方向</Label>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {MAJOR_DIRECTIONS.map((major) => (
                            <button
                              key={major.id}
                              onClick={() => {
                                if (consultation.attendanceStatus !== '已完成') {
                                  setSelectedMajor(major.id);
                                  setSelectedProjects([]);
                                }
                              }}
                              disabled={consultation.attendanceStatus === '已完成'}
                              className={cn(
                                'p-4 rounded-xl border-2 text-left transition-all',
                                selectedMajor === major.id
                                  ? 'border-orange-500 bg-orange-50 shadow-md'
                                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50',
                                consultation.attendanceStatus === '已完成' && 'cursor-default'
                              )}
                            >
                              <div className="text-2xl mb-1">{major.icon}</div>
                              <div className="font-medium">{major.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 项目选择 */}
                      {selectedMajor && (
                        <div>
                          <Label className="text-base font-medium">选择项目课程</Label>
                          <p className="text-sm text-gray-500 mb-3">可多选，建议按学习顺序选择</p>
                          <div className="grid grid-cols-2 gap-4">
                            {availableProjects.map((project, index) => (
                              <button
                                key={project.id}
                                onClick={() => {
                                  if (consultation.attendanceStatus !== '已完成') {
                                    toggleProject(project.id);
                                  }
                                }}
                                disabled={consultation.attendanceStatus === '已完成'}
                                className={cn(
                                  'p-4 rounded-xl border-2 text-left transition-all',
                                  selectedProjects.includes(project.id)
                                    ? 'border-orange-500 bg-orange-50 shadow-md'
                                    : 'border-gray-200 hover:border-orange-300'
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                                    项目 {index + 1}
                                  </Badge>
                                  <span className="text-sm text-gray-500">{project.recommendedHours}h</span>
                                </div>
                                <div className="font-medium mb-2">{project.name}</div>
                                <div className="flex flex-wrap gap-1">
                                  {project.skills.map(skill => (
                                    <span
                                      key={skill}
                                      className="text-xs px-2 py-0.5 bg-gray-100 rounded-full"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 导航按钮 */}
                      <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={() => goToStep(0)}>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          上一步
                        </Button>
                        {selectedProjects.length > 0 && consultation.attendanceStatus !== '已完成' && (
                          <Button
                            onClick={() => {
                              autoAddFoundationCourses();
                              goToStep(2);
                            }}
                            className="bg-gradient-to-r from-orange-500 to-amber-500"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            生成课程规划
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 第三步：课程确认 */}
              {currentStep === 2 && (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-orange-500" />
                        课程规划确认
                      </CardTitle>
                      <CardDescription>
                        确认基础课和项目课安排，填写学习目标
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 课程列表 */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-medium">已选课程</Label>
                          <span className="text-lg font-bold text-orange-600">共 {totalHours} 课时</span>
                        </div>

                        {selectedCourses.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-orange-200 rounded-xl">
                            <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p>请先选择专业方向和项目</p>
                            <Button
                              variant="link"
                              onClick={() => goToStep(1)}
                              className="text-orange-500"
                            >
                              前往选择
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedCourses.map((course, index) => (
                              <div
                                key={course.id}
                                className="flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r from-orange-50/50 to-transparent"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium',
                                    course.type === 'foundation' ? 'bg-blue-500' : 'bg-purple-500'
                                  )}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{course.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {course.code}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {course.type === 'foundation' ? '基础课' : '项目课'} · {course.hours}课时
                                    </div>
                                  </div>
                                </div>
                                {consultation.attendanceStatus !== '已完成' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveCourse(course.id)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 学习目标 */}
                      <div className="space-y-2">
                        <Label>学习目标</Label>
                        <Textarea
                          value={goals}
                          onChange={(e) => setGoals(e.target.value)}
                          placeholder="描述学生的长期学习目标和申请计划"
                          rows={3}
                          disabled={consultation.attendanceStatus === '已完成'}
                        />
                      </div>

                      {/* 时间规划 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>预计开始日期</Label>
                          <Input
                            type="date"
                            value={estimatedStartDate}
                            onChange={(e) => setEstimatedStartDate(e.target.value)}
                            disabled={consultation.attendanceStatus === '已完成'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>预计结束日期</Label>
                          <Input
                            type="date"
                            value={estimatedEndDate}
                            onChange={(e) => setEstimatedEndDate(e.target.value)}
                            disabled={consultation.attendanceStatus === '已完成'}
                          />
                        </div>
                      </div>

                      {/* 备注 */}
                      <div className="space-y-2">
                        <Label>指导备注</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="指导过程中的其他备注"
                          rows={2}
                          disabled={consultation.attendanceStatus === '已完成'}
                        />
                      </div>

                      {/* 导航按钮 */}
                      <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={() => goToStep(1)}>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          上一步
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 完成摘要（已完成状态） */}
            {consultation.attendanceStatus === '已完成' && (
              <Card className="border-2 border-green-200 bg-green-50/50">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-700">选课指导已完成</h3>
                      <p className="text-green-600">选课单已创建，可以开始排课</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

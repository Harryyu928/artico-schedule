'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  ArrowRight,
  Target,
  Briefcase,
  BookOpen,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  School,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// 步骤配置
const STEPS = [
  { id: 1, title: '申请院校', description: '确定目标院校和专业', icon: Target },
  { id: 2, title: '项目规划', description: '确定项目类型和数量', icon: Briefcase },
  { id: 3, title: '课程选择', description: '选择基础和项目课程', icon: BookOpen },
];

// 国家/地区选项
const COUNTRIES = [
  '美国', '英国', '加拿大', '日本', '澳大利亚', '欧洲', '其他'
];

// 学位选项
const DEGREES = ['本科', '硕士', '博士'];

// 专业方向选项
const MAJOR_DIRECTIONS = [
  { id: 'game-design', name: '游戏策划', description: 'Game Design' },
  { id: 'game-dev', name: '游戏开发', description: 'Game Development' },
  { id: 'game-art-3d', name: '游戏美术（三维）', description: '3D Game Art' },
  { id: 'game-art-2d', name: '游戏美术（二维）', description: '2D Game Art' },
  { id: 'animation', name: '动画设计', description: 'Animation' },
  { id: 'character-design', name: '角色设计', description: 'Character Design' },
  { id: '3d-modeling', name: '3D建模', description: '3D Modeling' },
  { id: 'tech-art', name: '技术美术', description: 'Technical Art' },
  { id: 'ui-design', name: 'UI设计', description: 'UI/UX Design' },
];

// 项目类型选项（根据专业方向）
const PROJECT_TYPES: Record<string, { id: string; name: string; requiredSkills: string[] }[]> = {
  'game-design': [
    { id: 'gd-project-1', name: '项目一：游戏概念设计', requiredSkills: ['游戏策划基础', '文档撰写'] },
    { id: 'gd-project-2', name: '项目二：系统设计', requiredSkills: ['系统设计', '数值策划'] },
    { id: 'gd-project-3', name: '项目三：关卡设计', requiredSkills: ['关卡设计', 'Unity基础'] },
    { id: 'gd-project-4', name: '项目四：完整游戏项目', requiredSkills: ['项目管理', '团队协作'] },
  ],
  'game-dev': [
    { id: 'dev-project-1', name: '项目一：游戏原型开发', requiredSkills: ['C#基础', 'Unity基础'] },
    { id: 'dev-project-2', name: '项目二：核心玩法实现', requiredSkills: ['游戏物理', 'AI编程'] },
    { id: 'dev-project-3', name: '项目三：网络多人游戏', requiredSkills: ['网络编程', '服务器开发'] },
    { id: 'dev-project-4', name: '项目四：完整游戏发布', requiredSkills: ['性能优化', '发布流程'] },
  ],
  'game-art-3d': [
    { id: '3d-project-1', name: '项目一：道具建模', requiredSkills: ['Blender/Maya基础', 'UV展开'] },
    { id: '3d-project-2', name: '项目二：角色建模', requiredSkills: ['角色建模', '拓扑'] },
    { id: '3d-project-3', name: '项目三：场景设计', requiredSkills: ['场景搭建', '光照'] },
    { id: '3d-project-4', name: '项目四：完整作品集', requiredSkills: ['渲染', '后期处理'] },
  ],
  'game-art-2d': [
    { id: '2d-project-1', name: '项目一：角色设计', requiredSkills: ['人体结构', '角色概念'] },
    { id: '2d-project-2', name: '项目二：场景绘制', requiredSkills: ['场景透视', '光影'] },
    { id: '2d-project-3', name: '项目三：UI设计', requiredSkills: ['UI设计', '交互设计'] },
    { id: '2d-project-4', name: '项目四：完整作品集', requiredSkills: ['作品整合', '展示设计'] },
  ],
  'animation': [
    { id: 'ani-project-1', name: '项目一：基础动画', requiredSkills: ['动画原理', '关键帧'] },
    { id: 'ani-project-2', name: '项目二：角色动画', requiredSkills: ['角色绑定', '动画表演'] },
    { id: 'ani-project-3', name: '项目三：特效动画', requiredSkills: ['特效制作', '粒子系统'] },
    { id: 'ani-project-4', name: '项目四：完整动画作品', requiredSkills: ['剪辑', '音效合成'] },
  ],
  'character-design': [
    { id: 'char-project-1', name: '项目一：角色概念', requiredSkills: ['角色设计基础', '故事设计'] },
    { id: 'char-project-2', name: '项目二：角色建模', requiredSkills: ['3D建模', '雕刻'] },
    { id: 'char-project-3', name: '项目三：角色绑定', requiredSkills: ['骨骼绑定', '权重'] },
    { id: 'char-project-4', name: '项目四：角色动画作品', requiredSkills: ['动画渲染', '展示'] },
  ],
  'tech-art': [
    { id: 'ta-project-1', name: '项目一：Shader基础', requiredSkills: ['Shader编程', '材质系统'] },
    { id: 'ta-project-2', name: '项目二：工具开发', requiredSkills: ['Python', '工具脚本'] },
    { id: 'ta-project-3', name: '项目三：性能优化', requiredSkills: ['性能分析', '优化技术'] },
    { id: 'ta-project-4', name: '项目四：完整技术方案', requiredSkills: ['流程设计', '文档'] },
  ],
  'ui-design': [
    { id: 'ui-project-1', name: '项目一：UI基础', requiredSkills: ['UI设计原则', 'Figma'] },
    { id: 'ui-project-2', name: '项目二：游戏UI', requiredSkills: ['游戏UI设计', '动效'] },
    { id: 'ui-project-3', name: '项目三：交互原型', requiredSkills: ['交互设计', '原型制作'] },
    { id: 'ui-project-4', name: '项目四：完整UI作品集', requiredSkills: ['作品整合', '展示'] },
  ],
  '3d-modeling': [
    { id: 'model-project-1', name: '项目一：硬表面建模', requiredSkills: ['Blender/Maya', '硬表面'] },
    { id: 'model-project-2', name: '项目二：有机体建模', requiredSkills: ['雕刻', '拓扑'] },
    { id: 'model-project-3', name: '项目三：材质贴图', requiredSkills: ['材质绘制', 'UV'] },
    { id: 'model-project-4', name: '项目四：完整作品集', requiredSkills: ['渲染', '展示'] },
  ],
};

// 基础课程（根据专业方向）
const FOUNDATION_COURSES: Record<string, { id: string; name: string; category: string; hours: number }[]> = {
  'game-design': [
    { id: 'F-GD', name: '游戏设计基础', category: 'F-GD', hours: 40 },
    { id: 'F-GA', name: '游戏策划基础', category: 'F-GA', hours: 40 },
  ],
  'game-dev': [
    { id: 'F-GD', name: '游戏设计基础', category: 'F-GD', hours: 40 },
    { id: 'F-TA', name: '技术艺术基础', category: 'F-TA', hours: 40 },
  ],
  'game-art-3d': [
    { id: 'F-3D', name: '3D建模基础', category: 'F-3D', hours: 40 },
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
  ],
  'game-art-2d': [
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
    { id: 'F-GD', name: '游戏设计基础', category: 'F-GD', hours: 40 },
  ],
  'animation': [
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
    { id: 'F-3D', name: '3D建模基础', category: 'F-3D', hours: 40 },
  ],
  'character-design': [
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
    { id: 'F-3D', name: '3D建模基础', category: 'F-3D', hours: 40 },
  ],
  'tech-art': [
    { id: 'F-TA', name: '技术艺术基础', category: 'F-TA', hours: 40 },
    { id: 'F-GD', name: '游戏设计基础', category: 'F-GD', hours: 40 },
  ],
  'ui-design': [
    { id: 'F-GD', name: '游戏设计基础', category: 'F-GD', hours: 40 },
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
  ],
  '3d-modeling': [
    { id: 'F-3D', name: '3D建模基础', category: 'F-3D', hours: 40 },
    { id: 'F-AN', name: '动画基础', category: 'F-AN', hours: 40 },
  ],
};

// 申请院校接口
interface ApplicationSchool {
  id?: string;
  schoolName: string;
  country: string;
  major: string;
  degree: string;
  priority: number;
  deadline?: string;
}

// 已选项目接口
interface SelectedProject {
  typeId: string;
  name: string;
  requiredSkills: string[];
}

// 已选课程接口
interface SelectedCourse {
  id: string;
  name: string;
  category: string;
  hours: number;
  type: 'foundation' | 'project';
  projectType?: string;
}

function SelectionPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const studentId = searchParams.get('studentId');
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<{ id: string; name: string; studentId: string } | null>(null);

  // 表单数据
  const [schools, setSchools] = useState<ApplicationSchool[]>([]);
  const [selectedMajorDirection, setSelectedMajorDirection] = useState<string>('');
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');

  // 新增院校表单
  const [newSchool, setNewSchool] = useState<ApplicationSchool>({
    schoolName: '',
    country: '美国',
    major: '',
    degree: '硕士',
    priority: 1,
  });

  // 获取学生信息
  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      const data = await response.json();
      setStudent(data.student || data);
    } catch (error) {
      console.error('获取学生信息失败:', error);
    }
  };

  // 添加院校
  const addSchool = () => {
    if (!newSchool.schoolName || !newSchool.major) {
      toast({
        title: '提示',
        description: '请填写院校名称和专业',
        variant: 'destructive',
      });
      return;
    }

    setSchools([...schools, { ...newSchool, id: Date.now().toString() }]);
    setNewSchool({
      schoolName: '',
      country: '美国',
      major: '',
      degree: '硕士',
      priority: schools.length + 1,
    });
  };

  // 删除院校
  const removeSchool = (id: string) => {
    setSchools(schools.filter(s => s.id !== id));
  };

  // 选择项目
  const toggleProject = (project: SelectedProject) => {
    const isSelected = selectedProjects.some(p => p.typeId === project.typeId);
    if (isSelected) {
      setSelectedProjects(selectedProjects.filter(p => p.typeId !== project.typeId));
    } else {
      setSelectedProjects([...selectedProjects, project]);
    }
  };

  // 自动推荐课程
  useEffect(() => {
    if (selectedMajorDirection && selectedProjects.length > 0) {
      const recommendedCourses: SelectedCourse[] = [];

      // 添加基础课程
      const foundationCourses = FOUNDATION_COURSES[selectedMajorDirection] || [];
      foundationCourses.forEach(course => {
        recommendedCourses.push({
          ...course,
          type: 'foundation' as const,
        });
      });

      // 添加项目课程
      selectedProjects.forEach(project => {
        recommendedCourses.push({
          id: project.typeId,
          name: project.name,
          category: project.typeId.split('-')[0].toUpperCase(),
          hours: 60,
          type: 'project' as const,
          projectType: project.typeId,
        });
      });

      setSelectedCourses(recommendedCourses);
    }
  }, [selectedMajorDirection, selectedProjects]);

  // 切换课程
  const toggleCourse = (course: SelectedCourse) => {
    const isSelected = selectedCourses.some(c => c.id === course.id);
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(c => c.id !== course.id));
    } else {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  // 计算总课时
  const totalHours = selectedCourses.reduce((sum, c) => sum + c.hours, 0);

  // 下一步
  const nextStep = () => {
    if (currentStep === 1 && schools.length === 0) {
      toast({
        title: '提示',
        description: '请至少添加一所申请院校',
        variant: 'destructive',
      });
      return;
    }
    if (currentStep === 2 && !selectedMajorDirection) {
      toast({
        title: '提示',
        description: '请选择专业方向',
        variant: 'destructive',
      });
      return;
    }
    if (currentStep === 3 && selectedCourses.length === 0) {
      toast({
        title: '提示',
        description: '请至少选择一门课程',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 提交选课单
  const handleSubmit = async () => {
    if (!studentId) {
      toast({
        title: '错误',
        description: '缺少学生信息',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // 创建选课单
      const response = await fetch('/api/selection-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          schools: schools,
          major_direction: selectedMajorDirection,
          projects: selectedProjects,
          courses: selectedCourses,
          total_hours: totalHours,
          goals: goals,
          notes: notes,
        }),
      });

      const result = await response.json();

      if (result.success || result.form) {
        toast({
          title: '创建成功',
          description: '选课单已创建，可以开始排课',
        });
        router.push(`/selection-forms/${result.form?.id || result.id}`);
      } else {
        throw new Error(result.error || '创建失败');
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取当前专业方向的项目类型
  const availableProjects = selectedMajorDirection ? PROJECT_TYPES[selectedMajorDirection] || [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href={studentId ? `/students/${studentId}` : '/students'}>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  选课规划
                </h1>
                {student && (
                  <p className="text-xs text-muted-foreground">学生：{student.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${index > 0 ? 'ml-8' : ''}`}>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-sm font-medium mt-2 ${isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-24 h-1 mx-4 rounded-full transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 步骤内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 步骤1：申请院校 */}
            {currentStep === 1 && (
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    确定申请院校
                  </CardTitle>
                  <CardDescription>
                    添加学生计划申请的目标院校和专业，这将影响课程规划的侧重点
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 已添加的院校列表 */}
                  {schools.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">已添加院校</Label>
                      {schools.map((school, index) => (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{school.schoolName}</p>
                              <p className="text-sm text-muted-foreground">
                                {school.country} · {school.degree} · {school.major}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeSchool(school.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 添加新院校表单 */}
                  <div className="p-4 border-2 border-dashed border-orange-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">添加申请院校</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">院校名称 *</Label>
                        <Input
                          id="schoolName"
                          placeholder="如：USC、NYU、CMU"
                          value={newSchool.schoolName}
                          onChange={(e) => setNewSchool({ ...newSchool, schoolName: e.target.value })}
                          className="border-orange-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">国家/地区</Label>
                        <Select
                          value={newSchool.country}
                          onValueChange={(value) => setNewSchool({ ...newSchool, country: value })}
                        >
                          <SelectTrigger className="border-orange-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="major">申请专业 *</Label>
                        <Input
                          id="major"
                          placeholder="如：Game Design"
                          value={newSchool.major}
                          onChange={(e) => setNewSchool({ ...newSchool, major: e.target.value })}
                          className="border-orange-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="degree">学位</Label>
                        <Select
                          value={newSchool.degree}
                          onValueChange={(value) => setNewSchool({ ...newSchool, degree: value })}
                        >
                          <SelectTrigger className="border-orange-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEGREES.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                      onClick={addSchool}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加院校
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 步骤2：项目规划 */}
            {currentStep === 2 && (
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-orange-500" />
                    确定项目类型
                  </CardTitle>
                  <CardDescription>
                    根据申请方向选择要完成的项目类型，系统将自动推荐所需的基础课程
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 专业方向选择 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">选择专业方向 *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {MAJOR_DIRECTIONS.map((direction) => (
                        <div
                          key={direction.id}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedMajorDirection === direction.id
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                          onClick={() => {
                            setSelectedMajorDirection(direction.id);
                            setSelectedProjects([]);
                          }}
                        >
                          <p className="font-medium">{direction.name}</p>
                          <p className="text-xs text-muted-foreground">{direction.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 项目选择 */}
                  {selectedMajorDirection && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">选择项目（可多选）</Label>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          已选 {selectedProjects.length} 个项目
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableProjects.map((project) => {
                          const isSelected = selectedProjects.some(p => p.typeId === project.id);
                          return (
                            <div
                              key={project.id}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                              onClick={() => toggleProject({
                                typeId: project.id,
                                name: project.name,
                                requiredSkills: project.requiredSkills,
                              })}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{project.name}</p>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {project.requiredSkills.map(skill => (
                                  <Badge key={skill} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!selectedMajorDirection && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>请先选择专业方向</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 步骤3：课程选择 */}
            {currentStep === 3 && (
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                    确认课程安排
                  </CardTitle>
                  <CardDescription>
                    系统已根据您的选择推荐课程，您可以调整课程内容
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 课程汇总 */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-white">
                    <div>
                      <p className="text-sm opacity-90">预计总课时</p>
                      <p className="text-3xl font-bold">{totalHours} 小时</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">已选课程</p>
                      <p className="text-3xl font-bold">{selectedCourses.length} 门</p>
                    </div>
                  </div>

                  {/* 基础课程 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      基础课程（推荐）
                    </Label>
                    <div className="space-y-2">
                      {selectedCourses.filter(c => c.type === 'foundation').map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-500">{course.category}</Badge>
                            <span className="font-medium">{course.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{course.hours}h</span>
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 项目课程 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                      项目课程
                    </Label>
                    <div className="space-y-2">
                      {selectedCourses.filter(c => c.type === 'project').map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className="bg-purple-500">项目</Badge>
                            <span className="font-medium">{course.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{course.hours}h</span>
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 学习目标和备注 */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="goals">学习目标</Label>
                      <Textarea
                        id="goals"
                        placeholder="描述学生的学习目标和期望..."
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows={2}
                        className="border-orange-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea
                        id="notes"
                        placeholder="其他需要说明的内容..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="border-orange-200"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 底部按钮 */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="border-orange-200 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>

          {currentStep < 3 ? (
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              onClick={nextStep}
            >
              下一步
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  创建选课单
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelectionPlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <SelectionPlanContent />
    </Suspense>
  );
}

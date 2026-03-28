'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Share2,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  User,
  Mail,
  Phone,
  Edit2,
  FileText,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  MapPin,
  Award,
  Target,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClockIcon,
  Building2,
  Users,
  Sparkles,
  Download,
  MoreVertical,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// 上课记录接口
interface ClassRecord {
  id: string;
  recordId: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime: string;
  hours: number;
  courseName: string;
  courseCategory: string;
  courseType: string;
  courseContentDetail?: string;
  contentSummary?: string;
  teacherName: string;
  teacherId: string;
  teachingMethod: string;
  attendanceStatus: string;
  homeworkStatus?: string;
  teacherFeedback?: string;
  studentPerformance?: string;
  nextPlan?: string;
  createdAt: string;
}

// 选课单接口
interface SelectionForm {
  id: string;
  formId: string;
  status: string;
  totalHours: number;
  createdAt: string;
  items: {
    courseCode: string;
    courseName: string;
    courseType: string;
    plannedHours: number;
  }[];
}

// 排课接口
interface Schedule {
  id: string;
  scheduleId: string;
  date: string;
  weekDay: string;
  timeSlot: string;
  hours: number;
  courseName: string;
  teacherName: string;
  status: string;
}

// 学生详情接口
interface StudentDetail {
  id: string;
  studentId: string;
  name: string;
  major: string;
  applicationCountry: string;
  currentStage: string;
  totalHours: number;
  consumedHours: number;
  remainingHours: number;
  studentStatus?: string;
  studentCategory?: string;
  courseCategories?: string[];
  teacherIds?: string[];
  teachers?: { id: string; name: string }[];
  consultantId?: string;
  consultantName?: string;
  createdAt: string;
  notes?: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectionForms, setSelectionForms] = useState<SelectionForm[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 分页状态
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(10);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      
      // 并行获取数据
      const [studentRes, recordsRes, formsRes, schedulesRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/class-records?studentId=${studentId}`),
        fetch(`/api/selection-forms?studentId=${studentId}`),
        fetch(`/api/schedule?studentId=${studentId}`),
      ]);

      const studentData = await studentRes.json();
      const recordsData = await recordsRes.json();
      const formsData = await formsRes.json();
      const schedulesData = await schedulesRes.json();

      setStudent(studentData.student || studentData || getMockStudent());
      setClassRecords(recordsData.records || recordsData.classRecords || getMockRecords());
      setSelectionForms(formsData.forms || formsData.selectionForms || []);
      setSchedules(schedulesData.schedules || getMockSchedules());
    } catch (error) {
      console.error('获取学生信息失败:', error);
      // 使用模拟数据
      setStudent(getMockStudent());
      setClassRecords(getMockRecords());
      setSchedules(getMockSchedules());
    } finally {
      setLoading(false);
    }
  };

  const getMockStudent = (): StudentDetail => ({
    id: studentId,
    studentId: 'STU001',
    name: '张同学',
    major: '游戏开发',
    applicationCountry: '美国',
    currentStage: '项目阶段',
    totalHours: 100,
    consumedHours: 45,
    remainingHours: 55,
    studentStatus: '在读',
    studentCategory: 'VIP 5',
    courseCategories: ['游戏开发', '技术美术'],
    teachers: [
      { id: 't1', name: '王老师' },
      { id: 't2', name: '李老师' },
    ],
    consultantName: '张顾问',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '学生学习认真，进度良好',
  });

  const getMockRecords = (): ClassRecord[] => {
    const records: ClassRecord[] = [];
    const courses = ['游戏设计基础', 'Unity开发', 'C#编程', '游戏项目一'];
    const teachers = ['王老师', '李老师', '张老师'];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 3);
      
      records.push({
        id: `r${i}`,
        recordId: `CR${String(1000 + i).padStart(5, '0')}`,
        classDate: date.toISOString().split('T')[0],
        weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
        startTime: '10:00',
        endTime: '12:00',
        hours: 2,
        courseName: courses[i % courses.length],
        courseCategory: 'F-GD',
        courseType: '基础课',
        courseContentDetail: '学习游戏设计基础概念',
        contentSummary: '完成了游戏机制设计练习',
        teacherName: teachers[i % teachers.length],
        teacherId: `t${i % 3}`,
        teachingMethod: '线上',
        attendanceStatus: '已完成',
        homeworkStatus: '已完成',
        teacherFeedback: '学生表现良好，理解能力强',
        studentPerformance: '积极参与，完成度高',
        nextPlan: '继续下一章节学习',
        createdAt: date.toISOString(),
      });
    }
    
    return records;
  };

  const getMockSchedules = (): Schedule[] => {
    const schedules: Schedule[] = [];
    const courses = ['游戏设计基础', 'Unity开发'];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      schedules.push({
        id: `s${i}`,
        scheduleId: `SCH${String(2000 + i).padStart(5, '0')}`,
        date: date.toISOString().split('T')[0],
        weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
        timeSlot: '10:00',
        hours: 2,
        courseName: courses[i % courses.length],
        teacherName: '王老师',
        status: i === 0 ? '已确认' : '待确认',
      });
    }
    
    return schedules;
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const totalClassHours = classRecords.reduce((sum, r) => sum + r.hours, 0);
    const completedClasses = classRecords.filter(r => r.attendanceStatus === '已完成').length;
    const totalClasses = classRecords.length;
    
    return {
      totalClassHours,
      completedClasses,
      totalClasses,
      completionRate: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0,
    };
  }, [classRecords]);

  // 分页上课记录
  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * recordsPageSize;
    return classRecords.slice(start, start + recordsPageSize);
  }, [classRecords, recordsPage, recordsPageSize]);

  const totalRecordPages = Math.ceil(classRecords.length / recordsPageSize);

  // 使用进度百分比
  const usagePercentage = student && student.totalHours > 0 
    ? Math.round((student.consumedHours / student.totalHours) * 100)
    : 0;

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成': return 'bg-green-100 text-green-700';
      case '进行中': return 'bg-blue-100 text-blue-700';
      case '待确认': return 'bg-yellow-100 text-yellow-700';
      case '已取消': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已完成': return <CheckCircle className="w-4 h-4" />;
      case '进行中': return <Play className="w-4 h-4" />;
      case '待确认': return <AlertCircle className="w-4 h-4" />;
      case '已取消': return <XCircle className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-gray-500">学生不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/students')} className="text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回列表
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400">
                  <AvatarFallback className="text-white font-bold">
                    {student.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{student.name}</h1>
                  <p className="text-xs text-muted-foreground">{student.studentId}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={cn(
                'text-sm',
                student.studentStatus === '在读' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              )}>
                {student.studentStatus || '在读'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/selection-forms/plan?studentId=${student.id}`)}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                开始选课规划
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{student.consumedHours}</p>
                  <p className="text-xs text-muted-foreground">已用课时</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-green-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{student.remainingHours}</p>
                  <p className="text-xs text-muted-foreground">剩余课时</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-blue-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.completedClasses}</p>
                  <p className="text-xs text-muted-foreground">已完成课程</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-purple-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">完成率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：学生信息 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 基本信息 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">专业方向</p>
                    <p className="font-medium">{student.major}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">申请国家</p>
                    <p className="font-medium">{student.applicationCountry}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">当前阶段</p>
                    <Badge variant="outline">{student.currentStage}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">学生类别</p>
                    <p className="font-medium">{student.studentCategory || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">入学时间</p>
                    <p className="font-medium">{new Date(student.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">规划顾问</p>
                    <p className="font-medium">{student.consultantName || '-'}</p>
                  </div>
                </div>

                {student.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-muted-foreground text-sm">备注</p>
                    <p className="text-sm mt-1">{student.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 课时进度 */}
            <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  课时进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-muted-foreground">使用进度</span>
                      <span className="font-medium">{usagePercentage}%</span>
                    </div>
                    <Progress value={usagePercentage} className="h-3" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{student.consumedHours}</p>
                      <p className="text-xs text-muted-foreground">已用</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{student.remainingHours}</p>
                      <p className="text-xs text-muted-foreground">剩余</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{student.totalHours}</p>
                      <p className="text-xs text-muted-foreground">总计</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 授课导师 */}
            {student.teachers && student.teachers.length > 0 && (
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    授课导师
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {student.teachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Avatar className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400">
                          <AvatarFallback className="text-white text-sm">
                            {teacher.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{teacher.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 即将上课 */}
            {schedules.length > 0 && (
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    即将上课
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schedules.slice(0, 3).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{schedule.courseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {schedule.date} · {schedule.timeSlot}
                          </p>
                        </div>
                        <Badge className={getStatusColor(schedule.status)}>
                          {schedule.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {schedules.length > 3 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="w-full mt-2 text-orange-600"
                      onClick={() => setActiveTab('schedules')}
                    >
                      查看全部 {schedules.length} 节课
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：详细标签页 */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-0">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="records">上课记录</TabsTrigger>
                    <TabsTrigger value="forms">选课单</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* 概览 */}
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-6">
                      {/* 最近上课 */}
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          最近上课
                        </h3>
                        {classRecords.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            暂无上课记录
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {classRecords.slice(0, 5).map((record) => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-orange-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    'p-2 rounded-lg',
                                    record.attendanceStatus === '已完成' ? 'bg-green-100' : 'bg-yellow-100'
                                  )}>
                                    {getStatusIcon(record.attendanceStatus)}
                                  </div>
                                  <div>
                                    <p className="font-medium">{record.courseName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {record.classDate} · {record.startTime}-{record.endTime} · {record.teacherName}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className={getStatusColor(record.attendanceStatus)}>
                                    {record.attendanceStatus}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">{record.hours}课时</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 课程类别分布 */}
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-orange-500" />
                          学习方向
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {student.courseCategories?.map((cat, i) => (
                            <Badge key={i} variant="outline" className="border-orange-200 text-orange-700">
                              {cat}
                            </Badge>
                          )) || (
                            <Badge variant="outline" className="border-orange-200 text-orange-700">
                              {student.major}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* 上课记录 */}
                  <TabsContent value="records" className="mt-0">
                    <div className="space-y-4">
                      {/* 记录统计 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>共 {classRecords.length} 条记录</span>
                          <span>|</span>
                          <span>总计 {stats.totalClassHours} 课时</span>
                        </div>
                      </div>

                      {/* 记录列表 */}
                      {classRecords.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>暂无上课记录</p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-orange-50/50">
                                  <TableHead>日期</TableHead>
                                  <TableHead>课程</TableHead>
                                  <TableHead>导师</TableHead>
                                  <TableHead>课时</TableHead>
                                  <TableHead>状态</TableHead>
                                  <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedRecords.map((record) => (
                                  <TableRow key={record.id} className="hover:bg-orange-50/30">
                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{record.classDate}</p>
                                        <p className="text-xs text-muted-foreground">{record.weekDay}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{record.courseName}</p>
                                        <p className="text-xs text-muted-foreground">{record.startTime}-{record.endTime}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>{record.teacherName}</TableCell>
                                    <TableCell>{record.hours}h</TableCell>
                                    <TableCell>
                                      <Badge className={getStatusColor(record.attendanceStatus)}>
                                        {record.attendanceStatus}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* 分页 */}
                          {totalRecordPages > 1 && (
                            <div className="flex items-center justify-between">
                              <Select
                                value={String(recordsPageSize)}
                                onValueChange={(v) => {
                                  setRecordsPageSize(Number(v));
                                  setRecordsPage(1);
                                }}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10条</SelectItem>
                                  <SelectItem value="20">20条</SelectItem>
                                  <SelectItem value="50">50条</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRecordsPage(p => Math.max(1, p - 1))}
                                  disabled={recordsPage === 1}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm">
                                  {recordsPage} / {totalRecordPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRecordsPage(p => Math.min(totalRecordPages, p + 1))}
                                  disabled={recordsPage === totalRecordPages}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* 选课单 */}
                  <TabsContent value="forms" className="mt-0">
                    {selectionForms.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>暂无选课单</p>
                        <Button
                          variant="link"
                          onClick={() => router.push(`/selection-forms/plan?studentId=${student.id}`)}
                          className="text-orange-600 mt-2"
                        >
                          开始选课规划
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectionForms.map((form) => (
                          <div
                            key={form.id}
                            className="p-4 rounded-lg border hover:bg-orange-50/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/selection-forms/${form.id}`)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-orange-500" />
                                <span className="font-medium">{form.formId}</span>
                              </div>
                              <Badge className={form.status === '已确认' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {form.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              创建于 {new Date(form.createdAt).toLocaleDateString('zh-CN')} · 共 {form.totalHours} 课时
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

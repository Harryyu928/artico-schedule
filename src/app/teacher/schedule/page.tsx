'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Course {
  id: string;
  scheduleId: string;
  date: Date;
  timeSlot: string;
  hours: number;
  status: string;
  hasRecord: boolean;
  student: {
    id: string;
    studentId: string;
    name: string;
    major: string | null;
  } | null;
  course: {
    id: string;
    courseId: string;
    name: string;
    category: string;
  } | null;
}

interface DaySchedule {
  day: string;
  date: string;
  courses: Course[];
  isToday: boolean;
}

interface ScheduleStats {
  totalCourses: number;
  totalHours: number;
  completedCourses: number;
  pendingRecords: number;
}

function TeacherScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSchedules, setWeekSchedules] = useState<DaySchedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    totalCourses: 0,
    totalHours: 0,
    completedCourses: 0,
    pendingRecords: 0,
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

  // 获取课程安排
  useEffect(() => {
    if (!teacherId) return;
    fetchSchedules();
  }, [teacherId, currentDate]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      const response = await fetch(
        `/api/teacher/schedule?teacherId=${teacherId}&type=week&date=${format(weekStart, 'yyyy-MM-dd')}`
      );
      
      if (!response.ok) throw new Error('获取课程安排失败');
      
      const result = await response.json();
      
      if (result.success) {
        // 按天组织数据
        const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const schedulesByDay: DaySchedule[] = weekDays.map((day, index) => {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + index);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          const dayCourses = result.data.schedules.filter(
            (s: Course) => format(new Date(s.date), 'yyyy-MM-dd') === dateStr
          );
          
          return {
            day,
            date: dateStr,
            courses: dayCourses,
            isToday: dateStr === today,
          };
        });
        
        setWeekSchedules(schedulesByDay);
        setStats({
          totalCourses: result.data.stats.totalCourses,
          totalHours: result.data.stats.totalHours,
          completedCourses: result.data.stats.completedCourses,
          pendingRecords: result.data.stats.pendingRecords,
        });
      }
    } catch (error) {
      console.error('获取课程安排失败:', error);
      toast({
        title: '获取失败',
        description: '无法加载课程安排',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToPrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTimeSlotLabel = (slot: string) => {
    const slots: Record<string, string> = {
      '10:00': '10:00-12:00',
      '13:00': '13:00-15:00',
      '15:00': '15:00-17:00',
      '18:00': '18:00-20:00',
      '20:00': '20:00-22:00',
    };
    return slots[slot] || slot;
  };

  const getStatusBadge = (course: Course) => {
    if (course.hasRecord) {
      return (
        <Badge className="bg-green-500 text-white text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          已记录
        </Badge>
      );
    }
    
    switch (course.status) {
      case '待确认':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
            待确认
          </Badge>
        );
      case '已确认':
        return (
          <Badge className="bg-orange-500 text-white text-xs">
            待上课
          </Badge>
        );
      case '已完成':
        return (
          <Badge variant="outline" className="text-red-500 border-red-300 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            待记录
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {course.status}
          </Badge>
        );
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  我的课程表
                </h1>
                <p className="text-xs text-muted-foreground">
                  {format(weekStart, 'yyyy年MM月dd日', { locale: zhCN })} - {format(weekEnd, 'MM月dd日', { locale: zhCN })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevWeek}
                className="border-orange-200 hover:bg-orange-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="border-orange-200 hover:bg-orange-50 text-orange-600"
              >
                今天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="border-orange-200 hover:bg-orange-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.totalCourses}</div>
                  <p className="text-xs text-muted-foreground">本周课程</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{stats.totalHours}</div>
                  <p className="text-xs text-muted-foreground">本周课时</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.completedCourses}</div>
                  <p className="text-xs text-muted-foreground">已完成</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.pendingRecords}</div>
                  <p className="text-xs text-muted-foreground">待填记录</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 周课程表 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Card key={i} className="border-2 border-orange-100">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-16" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekSchedules.map((daySchedule, index) => (
              <Card 
                key={index} 
                className={`${
                  daySchedule.isToday 
                    ? 'border-2 border-orange-400 bg-orange-50/50 dark:bg-orange-900/10 shadow-lg' 
                    : 'border-2 border-orange-100 bg-white/80 dark:bg-gray-800/80'
                } backdrop-blur-sm`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className={daySchedule.isToday ? 'text-orange-600 font-bold' : ''}>
                      {daySchedule.day}
                    </span>
                    <span className={`text-xs ${daySchedule.isToday ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {format(new Date(daySchedule.date), 'MM/dd')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySchedule.courses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      无课程安排
                    </div>
                  ) : (
                    daySchedule.courses.map((course, courseIndex) => (
                      <div
                        key={courseIndex}
                        className={`p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                          course.hasRecord
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : course.status === '已完成'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        }`}
                        onClick={() => {
                          if (course.status === '已完成' && !course.hasRecord) {
                            // 跳转到填写上课记录页面
                            router.push(`/teacher/records/new?scheduleId=${course.scheduleId}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span className="text-xs font-medium text-orange-600">
                            {getTimeSlotLabel(course.timeSlot)}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {course.student?.name || '未知学生'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {course.course?.name || '未知课程'}
                        </p>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(course)}
                          {course.status === '已完成' && !course.hasRecord && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/teacher/records/new?scheduleId=${course.scheduleId}`);
                              }}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 快捷操作 */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button
            variant="outline"
            className="border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => router.push('/teacher/records')}
          >
            <FileText className="w-4 h-4 mr-2" />
            上课记录列表
          </Button>
          <Button
            variant="outline"
            className="border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => router.push('/teacher/students')}
          >
            <Users className="w-4 h-4 mr-2" />
            我的学生
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function TeacherSchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <TeacherScheduleContent />
    </Suspense>
  );
}

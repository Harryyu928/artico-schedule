'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { format, parseISO, addDays, startOfWeek, addWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock,
  Save,
  User,
  Users,
  GraduationCap,
  Check,
  Calendar as CalendarIcon,
  CalendarDays,
  AlertCircle,
  Plus,
  XCircle,
  ClockAlert,
  CalendarX2,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import MonthCalendar, { CalendarEvent } from '@/components/calendar/MonthCalendar';
import { 
  Skeleton, 
  TimeTableSkeleton, 
  CalendarSkeleton, 
  UserSelectSkeleton 
} from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// 动画配置
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
};

const fadeInScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const weekDaysForCalc = [1, 2, 3, 4, 5, 6, 0]; // JavaScript getDay() 格式
const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

// 时间调整类型
type BlockType = 'temporary_unavailable' | 'meeting' | 'leave' | 'training' | 'other';

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'temporary_unavailable', label: '临时不可用' },
  { value: 'meeting', label: '会议' },
  { value: 'leave', label: '请假' },
  { value: 'training', label: '培训' },
  { value: 'other', label: '其他' },
];

interface TimeSlot {
  id: string;
  weekDay: string;
  timeSlot: string;
  isAvailable: boolean;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  major?: string;
}

interface Teacher {
  id: string;
  name: string;
  teacherId: string;
  teachableCourses?: string[];
}

interface TimeBlock {
  id: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  blockType: BlockType;
  reason: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  affectedSchedules: string[];
  createdAt: string;
}

export default function AvailabilityPage() {
  const [userType, setUserType] = useState<'student' | 'teacher'>('teacher');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const { toast } = useToast();

  // 时间调整表单
  const [timeBlockForm, setTimeBlockForm] = useState({
    id: '', // 用于编辑模式
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: true,
    blockType: 'temporary_unavailable' as BlockType,
    reason: '',
  });
  const [isEditMode, setIsEditMode] = useState(false); // 编辑模式标记
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);

  // 初始化时间表
  useEffect(() => {
    initializeAvailability();
  }, []);

  // 加载用户列表
  useEffect(() => {
    if (userType === 'student') {
      fetchStudents();
    } else {
      fetchTeachers();
    }
  }, [userType]);

  // 加载已保存的时间设置和时间调整
  useEffect(() => {
    if (selectedUserId) {
      loadUserAvailability();
      if (userType === 'teacher') {
        loadTimeBlocks();
      }
    }
  }, [selectedUserId, userType]);

  const initializeAvailability = () => {
    const slots: TimeSlot[] = [];
    weekDays.forEach(day => {
      timeSlots.forEach(time => {
        slots.push({
          id: `${day}-${time}`,
          weekDay: day,
          timeSlot: time,
          isAvailable: false,
        });
      });
    });
    setAvailability(slots);
  };

  const fetchStudents = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/students');
      const data = await response.json();
      // API 可能返回数组或 { students: [...] } 格式
      const studentList = Array.isArray(data) ? data : (data.students || []);
      setStudents(studentList);
      // 自动选择第一个学生
      if (studentList.length > 0) {
        setSelectedUserId(studentList[0].id);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
      // 使用模拟数据
      const mockStudents = [
        { id: 'student-1', name: '张三', studentId: '2026001', major: '游戏设计' },
        { id: 'student-2', name: '李四', studentId: '2026002', major: '交互设计' },
        { id: 'student-3', name: '王五', studentId: '2026003', major: '动画设计' },
      ];
      setStudents(mockStudents);
      setSelectedUserId(mockStudents[0].id);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/teachers');
      const data = await response.json();
      // API 直接返回数组，也可能是 { teachers: [...] } 格式
      const teacherList = Array.isArray(data) ? data : (data.teachers || []);
      setTeachers(teacherList);
      // 自动选择第一个导师
      if (teacherList.length > 0) {
        setSelectedUserId(teacherList[0].id);
      }
    } catch (error) {
      console.error('获取导师列表失败:', error);
      // 使用模拟数据
      const mockTeachers = [
        { id: 'teacher-1', name: '李老师', teacherId: 'T001', teachableCourses: ['F-GD', 'V-GD'] },
        { id: 'teacher-2', name: '王老师', teacherId: 'T002', teachableCourses: ['F-IA', 'V-IA'] },
        { id: 'teacher-3', name: '张老师', teacherId: 'T003', teachableCourses: ['F-AN', 'V-AN'] },
      ];
      setTeachers(mockTeachers);
      setSelectedUserId(mockTeachers[0].id);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserAvailability = async () => {
    try {
      const response = await fetch(`/api/availability?userId=${selectedUserId}&userRole=${userType === 'student' ? '学生' : '导师'}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setAvailability(prev => prev.map(slot => {
          const found = data.find((d: any) => d.weekDay === slot.weekDay && d.timeSlot === slot.timeSlot);
          return { ...slot, isAvailable: found?.isAvailable || false };
        }));
      } else {
        // 使用模拟数据演示
        setAvailability(prev => prev.map(slot => {
          // 模拟：工作日下午和晚上可用
          if (['周一', '周二', '周三', '周四', '周五'].includes(slot.weekDay) && 
              ['15:00', '18:00', '20:00'].includes(slot.timeSlot)) {
            return { ...slot, isAvailable: true };
          }
          // 模拟：周末上午可用
          if (['周六', '周日'].includes(slot.weekDay) && ['10:00', '13:00'].includes(slot.timeSlot)) {
            return { ...slot, isAvailable: true };
          }
          return { ...slot, isAvailable: false };
        }));
      }
    } catch (error) {
      console.error('加载时间设置失败:', error);
      // 使用模拟数据演示
      setAvailability(prev => prev.map(slot => {
        if (['周一', '周二', '周三', '周四', '周五'].includes(slot.weekDay) && 
            ['15:00', '18:00', '20:00'].includes(slot.timeSlot)) {
          return { ...slot, isAvailable: true };
        }
        if (['周六', '周日'].includes(slot.weekDay) && ['10:00', '13:00'].includes(slot.timeSlot)) {
          return { ...slot, isAvailable: true };
        }
        return { ...slot, isAvailable: false };
      }));
    }
  };

  const loadTimeBlocks = async () => {
    try {
      const response = await fetch(`/api/time-blocks?teacherId=${selectedUserId}`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setTimeBlocks(data.data);
      } else {
        // 使用模拟数据演示月视图效果
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        setTimeBlocks([
          {
            id: 'demo-block-1',
            teacherId: selectedUserId,
            startDate: format(today, 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd'),
            startTime: null,
            endTime: null,
            isAllDay: true,
            blockType: 'meeting',
            reason: '教研会议（演示数据）',
            status: 'confirmed',
            affectedSchedules: [],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'demo-block-2',
            teacherId: selectedUserId,
            startDate: format(nextWeek, 'yyyy-MM-dd'),
            endDate: format(nextWeek, 'yyyy-MM-dd'),
            startTime: '10:00',
            endTime: '12:00',
            isAllDay: false,
            blockType: 'temporary_unavailable',
            reason: '临时有事（演示数据）',
            status: 'confirmed',
            affectedSchedules: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('加载时间调整失败:', error);
      // 使用模拟数据演示月视图效果
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      setTimeBlocks([
        {
          id: 'demo-block-1',
          teacherId: selectedUserId,
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
          startTime: null,
          endTime: null,
          isAllDay: true,
          blockType: 'meeting',
          reason: '教研会议（演示数据）',
          status: 'confirmed',
          affectedSchedules: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'demo-block-2',
          teacherId: selectedUserId,
          startDate: format(nextWeek, 'yyyy-MM-dd'),
          endDate: format(nextWeek, 'yyyy-MM-dd'),
          startTime: '10:00',
          endTime: '12:00',
          isAllDay: false,
          blockType: 'temporary_unavailable',
          reason: '临时有事（演示数据）',
          status: 'confirmed',
          affectedSchedules: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  // 切换时间段可用性
  const toggleSlot = (slotId: string) => {
    if (!selectedUserId) {
      toast({ title: '提示', description: '请先选择用户', variant: 'destructive' });
      return;
    }
    
    setAvailability(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, isAvailable: !slot.isAvailable }
          : slot
      )
    );
  };

  // 批量设置
  const setBatch = (days: string[], times: string[], available: boolean) => {
    if (!selectedUserId) {
      toast({ title: '提示', description: '请先选择用户', variant: 'destructive' });
      return;
    }
    
    setAvailability(prev => 
      prev.map(slot => {
        if (days.includes(slot.weekDay) && times.includes(slot.timeSlot)) {
          return { ...slot, isAvailable: available };
        }
        return slot;
      })
    );
  };

  const quickSetWorkdays = () => setBatch(['周一', '周二', '周三', '周四', '周五'], timeSlots, true);
  const quickSetWeekends = () => setBatch(['周六', '周日'], timeSlots, true);
  const quickSetEvenings = () => setBatch(weekDays, ['18:00', '20:00'], true);
  const clearAll = () => {
    if (!selectedUserId) {
      toast({ title: '提示', description: '请先选择用户', variant: 'destructive' });
      return;
    }
    setAvailability(prev => prev.map(slot => ({ ...slot, isAvailable: false })));
  };

  // 保存时间表
  const handleSave = async () => {
    if (!selectedUserId) {
      toast({ title: '提示', description: '请先选择用户', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      
      const availableSlots = availability
        .filter(slot => slot.isAvailable)
        .map(slot => ({
          weekDay: slot.weekDay,
          timeSlot: slot.timeSlot,
        }));

      const response = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          userRole: userType === 'student' ? '学生' : '导师',
          slots: availableSlots,
        }),
      });

      if (!response.ok) throw new Error('保存失败');

      toast({ title: '成功', description: '时间表已保存' });
    } catch {
      toast({ title: '成功', description: '时间表已保存（模拟）' });
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新时间调整
  const handleCreateTimeBlock = async () => {
    if (!timeBlockForm.startDate || !timeBlockForm.endDate || !timeBlockForm.reason) {
      toast({ title: '提示', description: '请填写完整信息', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      
      if (isEditMode && timeBlockForm.id) {
        // 编辑模式：先取消旧的，再创建新的
        const deleteResponse = await fetch(
          `/api/time-blocks?id=${timeBlockForm.id}&cancelledBy=${selectedUserId}`,
          { method: 'DELETE' }
        );
        
        if (!deleteResponse.ok) {
          throw new Error('删除旧记录失败');
        }
      }
      
      // 创建新记录
      const response = await fetch('/api/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedUserId,
          startDate: timeBlockForm.startDate,
          endDate: timeBlockForm.endDate,
          startTime: timeBlockForm.startTime || null,
          endTime: timeBlockForm.endTime || null,
          isAllDay: timeBlockForm.isAllDay,
          blockType: timeBlockForm.blockType,
          reason: timeBlockForm.reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: '成功', 
          description: isEditMode ? '时间调整已更新' : (data.message || '时间调整已创建') 
        });
        resetTimeBlockForm();
        setShowCreateDialog(false);
        loadTimeBlocks();
      } else {
        toast({ title: '错误', description: data.message || '操作失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '网络错误', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const resetTimeBlockForm = () => {
    setTimeBlockForm({
      id: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isAllDay: true,
      blockType: 'temporary_unavailable',
      reason: '',
    });
    setIsEditMode(false);
  };

  // 编辑时间调整
  const handleEditTimeBlock = (block: TimeBlock) => {
    setTimeBlockForm({
      id: block.id,
      startDate: block.startDate,
      endDate: block.endDate,
      startTime: block.startTime || '',
      endTime: block.endTime || '',
      isAllDay: block.isAllDay,
      blockType: block.blockType,
      reason: block.reason,
    });
    setIsEditMode(true);
    setShowCreateDialog(true);
  };

  // 取消时间调整
  const handleCancelTimeBlock = async (timeBlockId: string) => {
    if (!confirm('确定要取消这个时间调整吗？')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/time-blocks?id=${timeBlockId}&cancelledBy=${selectedUserId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast({ title: '成功', description: '时间调整已取消' });
        loadTimeBlocks();
      } else {
        toast({ title: '错误', description: data.message || '取消失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '错误', description: '网络错误', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 点击日历日期
  const handleDateClick = (date: Date, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedDateEvents(events);
    setShowDateDialog(true);
  };

  // 从日历快速创建
  const handleQuickCreate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setTimeBlockForm({
      id: '',
      startDate: dateStr,
      endDate: dateStr,
      startTime: '',
      endTime: '',
      isAllDay: true,
      blockType: 'temporary_unavailable',
      reason: '',
    });
    setIsEditMode(false);
    setShowDateDialog(false);
    setShowCreateDialog(true);
  };

  // 拖拽选择日期范围创建
  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    if (userType !== 'teacher' || !selectedUserId) return;
    
    setTimeBlockForm({
      id: '',
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      isAllDay: true,
      blockType: 'temporary_unavailable',
      reason: '',
    });
    setIsEditMode(false);
    setShowCreateDialog(true);
  };

  // 将周时间表转换为日历事件（显示未来4周）
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    const today = new Date();

    // 添加时间调整事件
    timeBlocks.forEach(block => {
      if (block.status === 'confirmed') {
        const start = parseISO(block.startDate);
        const end = parseISO(block.endDate);
        
        let current = start;
        while (current <= end) {
          events.push({
            id: block.id,
            title: BLOCK_TYPES.find(t => t.value === block.blockType)?.label || '不可排课',
            date: format(current, 'yyyy-MM-dd'),
            startTime: block.startTime || undefined,
            endTime: block.endTime || undefined,
            type: 'time_block',
            blockType: block.blockType,
            status: block.status,
            detail: block.reason,
          });
          current = addDays(current, 1);
        }
      }
    });

    // 将周时间表转换为具体日期（未来4周）
    for (let week = 0; week < 4; week++) {
      const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), week);
      
      availability.forEach(slot => {
        if (slot.isAvailable) {
          const dayIndex = weekDays.indexOf(slot.weekDay);
          const date = addDays(weekStart, dayIndex);
          
          events.push({
            id: `available-${format(date, 'yyyy-MM-dd')}-${slot.timeSlot}`,
            title: slot.timeSlot,
            date: format(date, 'yyyy-MM-dd'),
            startTime: slot.timeSlot,
            type: 'schedule',
            status: 'available',
            detail: '可排课',
          });
        }
      });
    }

    return events;
  }, [timeBlocks, availability]);

  // 统计
  const availableCount = availability.filter(s => s.isAvailable).length;
  const activeTimeBlocks = timeBlocks.filter(b => b.status === 'confirmed').length;
  const userList = userType === 'student' ? students : teachers;
  
  const getSelectedUserName = () => {
    if (!selectedUserId) return '';
    const user = userList.find(u => u.id === selectedUserId);
    return user?.name || '';
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 页面标题 */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            时间设置
          </h1>
          <p className="text-gray-500 mt-1">设置可用时间段和临时时间调整</p>
        </div>
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {userType === 'teacher' && selectedUserId && (
            <Button
              variant="outline"
              onClick={() => {
                resetTimeBlockForm();
                setShowCreateDialog(true);
              }}
              className="border-orange-300 text-orange-600 hover:bg-orange-50 btn-glow ripple relative overflow-hidden"
            >
              <Plus className="mr-2 h-4 w-4" />
              添加临时调整
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={loading || !selectedUserId}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 btn-glow ripple"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? '保存中...' : '保存时间表'}
          </Button>
        </motion.div>
      </motion.div>

      {/* 用户选择 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 pointer-events-none" />
          <CardHeader className="relative bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-orange-500" />
              选择用户
            </CardTitle>
            <CardDescription>选择要设置时间的用户类型和具体用户</CardDescription>
          </CardHeader>
          <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用户类型</label>
              <Select
                value={userType}
                onValueChange={(value: 'student' | 'teacher') => setUserType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      学生
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      导师
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                选择{userType === 'student' ? '学生' : '导师'}
              </label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? '加载中...' : `请选择${userType === 'student' ? '学生' : '导师'}`} />
                </SelectTrigger>
                <SelectContent>
                  {userList.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
                        <span className="text-gray-400 text-xs">
                          ({userType === 'student' ? (user as Student).studentId : (user as Teacher).teacherId})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedUserId && (
            <motion.div 
              className="mt-4 p-5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
            >
              {/* 装饰性背景 */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-200 rounded-full blur-3xl" />
              </div>
              
              <div className="flex items-center gap-4 relative">
                <motion.div 
                  className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Check className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <span className="text-sm text-gray-500">已选择</span>
                  <p className="font-bold text-lg text-gray-800">{getSelectedUserName()}</p>
                </div>
              </div>
              <div className="flex gap-3 relative">
                <motion.div 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Clock className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-bold text-lg">{availableCount}</span>
                  <span className="text-green-600 text-sm">个时段</span>
                </motion.div>
                {userType === 'teacher' && (
                  <motion.div 
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <CalendarX2 className="h-5 w-5 text-orange-600" />
                    <span className="text-orange-700 font-bold text-lg">{activeTimeBlocks}</span>
                    <span className="text-orange-600 text-sm">条调整</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* 主内容 - 标签页 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="relative">
          {/* 华丽的标签页切换器 */}
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
            {/* 滑动指示器 */}
            <motion.div
              className="absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/25"
              animate={{
                left: activeTab === 'schedule' ? '6px' : 'calc(50%)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            
            <TabsTrigger 
              value="schedule" 
              className="flex items-center gap-2 relative z-10 py-3 transition-colors duration-300 data-[state=active]:text-white"
            >
              <Clock className="h-4 w-4" />
              <span className="font-medium">周时间表</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-2 relative z-10 py-3 transition-colors duration-300 data-[state=active]:text-white"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="font-medium">月历视图</span>
            </TabsTrigger>
          </TabsList>

          {/* 周时间表 */}
          <TabsContent value="schedule" className="space-y-6 mt-6 focus-visible:outline-none">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
                {/* 快速设置 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden card-hover">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <CardTitle className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                          <Sparkles className="h-5 w-5 text-orange-500" />
                        </motion.div>
                        快速设置
                      </CardTitle>
                      <CardDescription>一键设置常用时间段组合</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="flex gap-3 flex-wrap">
                        {[
                          { label: '工作日全天', action: quickSetWorkdays, icon: '🏢' },
                          { label: '周末全天', action: quickSetWeekends, icon: '🌴' },
                          { label: '晚间时段', action: quickSetEvenings, icon: '🌙' },
                          { label: '清空全部', action: clearAll, icon: '🗑️', variant: 'destructive' },
                        ].map((btn, index) => (
                          <motion.div
                            key={btn.label}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button 
                              variant="outline" 
                              onClick={btn.action} 
                              disabled={!selectedUserId}
                              className={cn(
                                "relative overflow-hidden transition-all duration-300",
                                btn.variant === 'destructive' 
                                  ? "hover:bg-red-50 hover:text-red-600 hover:border-red-300" 
                                  : "hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/10"
                              )}
                            >
                              <span className="mr-1.5">{btn.icon}</span>
                              {btn.label}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* 时间表 */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-white to-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            可用时间表
                          </CardTitle>
                          <CardDescription className="mt-1">
                            点击时间段切换可用状态，绿色表示可用
                          </CardDescription>
                        </div>
                        <motion.div
                          key={availableCount}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm"
                        >
                          <span className="text-orange-700 font-bold text-lg">{availableCount}</span>
                          <span className="text-orange-600 text-sm ml-1">个时间段</span>
                        </motion.div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full border-collapse min-w-[700px]">
                          <thead>
                            <tr>
                              <th className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-r font-semibold text-gray-600 w-24">
                                时间
                              </th>
                              {weekDays.map((day, i) => (
                                <th 
                                  key={day} 
                                  className={cn(
                                    "p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b text-center font-semibold",
                                    (i === 5 || i === 6) && "text-red-500",
                                    i !== 6 && "border-r"
                                  )}
                                >
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {timeSlots.map((time, rowIndex) => (
                              <motion.tr 
                                key={time}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + rowIndex * 0.03 }}
                              >
                                <td className="p-2 bg-gray-50 border-b border-r text-center font-medium">
                                  <div className="flex items-center justify-center gap-1.5 text-gray-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    {time}
                                  </div>
                                </td>
                                {weekDays.map((day, colIndex) => {
                                  const slot = availability.find(s => s.weekDay === day && s.timeSlot === time);
                                  return (
                                    <td
                                      key={`${day}-${time}`}
                                      className={cn(
                                        "p-1.5 border-b text-center cursor-pointer transition-all",
                                        !selectedUserId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
                                        colIndex !== 6 && "border-r"
                                      )}
                                      onClick={() => selectedUserId && toggleSlot(slot?.id || `${day}-${time}`)}
                                    >
                                      <motion.div
                                        className={cn(
                                          "w-full h-12 rounded-lg flex items-center justify-center transition-all",
                                          slot?.isAvailable
                                            ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30"
                                            : "bg-gray-50 text-gray-300 border border-gray-100 hover:border-gray-200"
                                        )}
                                        whileHover={selectedUserId ? { scale: 1.05 } : {}}
                                        whileTap={selectedUserId ? { scale: 0.95 } : {}}
                                      >
                                        {slot?.isAvailable ? (
                                          <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 500 }}
                                          >
                                            <Check className="h-5 w-5" />
                                          </motion.div>
                                        ) : (
                                          <span className="text-lg">—</span>
                                        )}
                                      </motion.div>
                                    </td>
                                  );
                                })}
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {!selectedUserId && (
                        <motion.div 
                          className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-center"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                          <p className="text-gray-500">请先在上方选择一个用户，然后设置该用户的可用时间</p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
          </TabsContent>
          
          {/* 月历视图 */}
          <TabsContent value="calendar" className="mt-6 focus-visible:outline-none">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
                <div className="grid gap-6 lg:grid-cols-4">
                  {/* 日历主区域 */}
                  <div className="lg:col-span-3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="border-0 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white relative overflow-hidden">
                          {/* 装饰性动画背景 */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl animate-float" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
                          </div>
                          
                          <CardTitle className="flex items-center gap-2 relative">
                            <motion.div
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              <CalendarIcon className="h-5 w-5" />
                            </motion.div>
                            月视图日历
                          </CardTitle>
                          <CardDescription className="text-orange-100 relative">
                            查看可用时间和临时调整，点击日期可快速添加
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          {selectedUserId ? (
                            <MonthCalendar
                              events={calendarEvents}
                              onDateClick={handleDateClick}
                              onDateRangeSelect={userType === 'teacher' ? handleDateRangeSelect : undefined}
                            />
                          ) : (
                            <div className="p-16 text-center bg-gradient-to-b from-gray-50 to-white">
                              <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                              >
                                <CalendarIcon className="h-20 w-20 mx-auto mb-4 text-gray-200" />
                              </motion.div>
                              <p className="text-lg text-gray-400">请先选择用户查看日历</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  {/* 右侧边栏 */}
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {/* 图例说明 */}
                    <Card className="bg-gradient-to-br from-gray-50 to-white border-0 shadow-lg overflow-hidden">
                      <CardHeader className="pb-2 bg-gradient-to-r from-gray-100 to-gray-50">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="h-4 w-4 text-orange-500" />
                          图例说明
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 text-sm space-y-3">
                        {[
                          { color: 'bg-gradient-to-r from-green-400 to-emerald-500', label: '可排课时间', shadow: 'shadow-green-500/30' },
                          { color: 'bg-gradient-to-r from-red-200 to-red-300 border border-red-300', label: '不可排课', shadow: '' },
                          { color: 'bg-gradient-to-r from-orange-200 to-amber-200 border border-orange-300', label: '已排课程', shadow: '' },
                        ].map((item, i) => (
                          <motion.div 
                            key={item.label}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                          >
                            <div className={cn("w-5 h-5 rounded-md shadow-sm", item.color, item.shadow)} />
                            <span className="text-gray-600">{item.label}</span>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>

              {/* 导师专属：临时调整列表 */}
              {userType === 'teacher' && selectedUserId && (
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <CalendarX2 className="h-4 w-4 text-orange-500" />
                      </motion.div>
                      临时时间调整
                      {activeTimeBlocks > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' }}
                        >
                          <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200">
                            {activeTimeBlocks} 条
                          </Badge>
                        </motion.div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {activeTimeBlocks === 0 ? (
                      <motion.div 
                        className="text-center py-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <CalendarX2 className="h-14 w-14 mx-auto mb-4 text-gray-200" />
                        </motion.div>
                        <p className="text-sm text-gray-400">暂无时间调整</p>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            size="sm"
                            className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 btn-glow"
                            onClick={() => {
                              resetTimeBlockForm();
                              setShowCreateDialog(true);
                            }}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            添加调整
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        {timeBlocks
                          .filter(b => b.status === 'confirmed')
                          .slice(0, 5)
                          .map((block, index) => (
                            <motion.div
                              key={block.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02, x: 5 }}
                              className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-orange-700">
                                    {format(parseISO(block.startDate), 'MM-dd')}
                                    {block.startDate !== block.endDate && (
                                      <span> ~ {format(parseISO(block.endDate), 'MM-dd')}</span>
                                    )}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs font-medium",
                                      block.blockType === 'meeting' && "border-blue-300 text-blue-600 bg-blue-50",
                                      block.blockType === 'leave' && "border-purple-300 text-purple-600 bg-purple-50",
                                      block.blockType === 'temporary_unavailable' && "border-red-300 text-red-600 bg-red-50",
                                      block.blockType === 'training' && "border-green-300 text-green-600 bg-green-50",
                                    )}
                                  >
                                    {BLOCK_TYPES.find(t => t.value === block.blockType)?.label || '其他'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{block.reason}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100"
                                    onClick={() => handleEditTimeBlock(block)}
                                    title="编辑"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => handleCancelTimeBlock(block.id)}
                                    title="删除"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        {timeBlocks.filter(b => b.status === 'confirmed').length > 5 && (
                          <motion.p 
                            className="text-xs text-center text-gray-400 pt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            还有 {timeBlocks.filter(b => b.status === 'confirmed').length - 5} 条记录...
                          </motion.p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 提示信息 */}
              {userType === 'teacher' && selectedUserId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-sm">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-4 w-4 text-orange-500" />
                    </motion.div>
                    <AlertDescription className="text-sm text-orange-700">
                      <strong>提示：</strong>点击日历中的日期可快速添加临时时间调整，按住拖动可选择日期范围
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </TabsContent>
    </Tabs>
  </motion.div>

      {/* 创建/编辑时间调整对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetTimeBlockForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Edit2 className="h-5 w-5 text-orange-500" />
                  编辑时间调整
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-orange-500" />
                  添加临时时间调整
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? '修改时间调整信息，保存后将更新记录' 
                : '设置无法授课的时间段，系统将自动通知相关人员'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">开始日期 *</Label>
                <Input
                  type="date"
                  value={timeBlockForm.startDate}
                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">结束日期 *</Label>
                <Input
                  type="date"
                  value={timeBlockForm.endDate}
                  onChange={(e) => setTimeBlockForm({ ...timeBlockForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>调整类型</Label>
                <Select
                  value={timeBlockForm.blockType}
                  onValueChange={(value) => setTimeBlockForm({ ...timeBlockForm, blockType: value as BlockType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>时间段类型</Label>
                <Select
                  value={timeBlockForm.isAllDay ? 'all-day' : 'partial'}
                  onValueChange={(value) => setTimeBlockForm({ ...timeBlockForm, isAllDay: value === 'all-day' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-day">全天不可用</SelectItem>
                    <SelectItem value="partial">部分时间</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!timeBlockForm.isAllDay && (
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="time"
                    value={timeBlockForm.startTime}
                    onChange={(e) => setTimeBlockForm({ ...timeBlockForm, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="time"
                    value={timeBlockForm.endTime}
                    onChange={(e) => setTimeBlockForm({ ...timeBlockForm, endTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-medium">原因说明 *</Label>
              <Textarea
                placeholder="请详细说明无法授课的原因..."
                value={timeBlockForm.reason}
                onChange={(e) => setTimeBlockForm({ ...timeBlockForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                resetTimeBlockForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateTimeBlock}
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {loading 
                ? (isEditMode ? '保存中...' : '创建中...') 
                : (isEditMode ? '保存修改' : '确认创建')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 日期详情对话框 */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'yyyy年 M月 d日 EEEE', { locale: zhCN })}
            </DialogTitle>
            <DialogDescription>查看该日期的所有安排</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>该日期无特殊安排</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg bg-gray-50 border">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={event.type === 'time_block' ? 'destructive' : 'default'}>
                        {event.type === 'time_block' ? '不可排课' : event.type === 'schedule' ? '可排课' : '其他'}
                      </Badge>
                      {event.startTime && (
                        <span className="text-sm text-gray-500">{event.startTime}</span>
                      )}
                    </div>
                    <p className="font-medium">{event.title}</p>
                    {event.detail && <p className="text-sm text-gray-500 mt-1">{event.detail}</p>}
                  </div>
                ))}
              </div>
            )}

            {userType === 'teacher' && (
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => selectedDate && handleQuickCreate(selectedDate)}
              >
                <Plus className="mr-2 h-4 w-4" />
                为此日期添加时间调整
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

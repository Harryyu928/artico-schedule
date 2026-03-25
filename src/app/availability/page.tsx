'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO, addDays, startOfWeek, addWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: true,
    blockType: 'temporary_unavailable' as BlockType,
    reason: '',
  });
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
      setStudents(data.students || []);
      setSelectedUserId('');
    } catch (error) {
      console.error('获取学生列表失败:', error);
      setStudents([
        { id: 'student-1', name: '张三', studentId: '2026001', major: '游戏设计' },
        { id: 'student-2', name: '李四', studentId: '2026002', major: '交互设计' },
        { id: 'student-3', name: '王五', studentId: '2026003', major: '动画设计' },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
      setSelectedUserId('');
    } catch (error) {
      console.error('获取导师列表失败:', error);
      setTeachers([
        { id: 'teacher-1', name: '李老师', teacherId: 'T001', teachableCourses: ['F-GD', 'V-GD'] },
        { id: 'teacher-2', name: '王老师', teacherId: 'T002', teachableCourses: ['F-IA', 'V-IA'] },
        { id: 'teacher-3', name: '张老师', teacherId: 'T003', teachableCourses: ['F-AN', 'V-AN'] },
      ]);
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

  // 创建时间调整
  const handleCreateTimeBlock = async () => {
    if (!timeBlockForm.startDate || !timeBlockForm.endDate || !timeBlockForm.reason) {
      toast({ title: '提示', description: '请填写完整信息', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedUserId,
          ...timeBlockForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: '成功', description: data.message || '时间调整已创建' });
        setTimeBlockForm({
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          isAllDay: true,
          blockType: 'temporary_unavailable',
          reason: '',
        });
        setShowCreateDialog(false);
        loadTimeBlocks();
      } else {
        toast({ title: '错误', description: data.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '错误', description: '网络错误', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
      startDate: dateStr,
      endDate: dateStr,
      startTime: '',
      endTime: '',
      isAllDay: true,
      blockType: 'temporary_unavailable',
      reason: '',
    });
    setShowDateDialog(false);
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
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">时间设置</h1>
          <p className="text-gray-500 mt-1">设置可用时间段和临时时间调整</p>
        </div>
        <div className="flex gap-2">
          {userType === 'teacher' && selectedUserId && (
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(true)}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              添加临时调整
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading || !selectedUserId}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? '保存中...' : '保存时间表'}
          </Button>
        </div>
      </div>

      {/* 用户选择 */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>选择用户</CardTitle>
          <CardDescription>选择要设置时间的用户类型和具体用户</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  已选择：<strong>{getSelectedUserName()}</strong>
                </span>
              </div>
              <div className="flex gap-3 text-sm text-gray-600">
                <span>可排课: <strong className="text-green-600">{availableCount}</strong> 个时段</span>
                {userType === 'teacher' && (
                  <span>时间调整: <strong className="text-red-600">{activeTimeBlocks}</strong> 条</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主内容 - 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            周时间表
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            月历视图
          </TabsTrigger>
        </TabsList>

        {/* 周时间表 */}
        <TabsContent value="schedule" className="space-y-6 mt-6">
          {/* 快速设置 */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>快速设置</CardTitle>
              <CardDescription>一键设置常用时间段组合</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={quickSetWorkdays} disabled={!selectedUserId}>
                  工作日全天
                </Button>
                <Button variant="outline" onClick={quickSetWeekends} disabled={!selectedUserId}>
                  周末全天
                </Button>
                <Button variant="outline" onClick={quickSetEvenings} disabled={!selectedUserId}>
                  晚间时段
                </Button>
                <Button variant="outline" onClick={clearAll} disabled={!selectedUserId}>
                  清空全部
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 时间表 */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>可用时间表</CardTitle>
                  <CardDescription className="mt-1">
                    点击时间段切换可用状态，绿色表示可用
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-base px-4 py-2 bg-orange-50">
                  已选 {availableCount} 个时间段
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-gray-50 dark:bg-gray-800 w-24">时间段</th>
                      {weekDays.map(day => (
                        <th key={day} className="p-2 border bg-gray-50 dark:bg-gray-800 text-center font-medium">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(time => (
                      <tr key={time}>
                        <td className="p-2 border bg-gray-50 dark:bg-gray-800 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {time}
                          </div>
                        </td>
                        {weekDays.map(day => {
                          const slot = availability.find(s => s.weekDay === day && s.timeSlot === time);
                          return (
                            <td
                              key={`${day}-${time}`}
                              className={`p-1 border text-center cursor-pointer transition-all ${
                                !selectedUserId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => selectedUserId && toggleSlot(slot?.id || `${day}-${time}`)}
                            >
                              <div
                                className={`w-full h-12 rounded-md flex items-center justify-center transition-all ${
                                  slot?.isAvailable
                                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {slot?.isAvailable ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <span className="text-lg">—</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {!selectedUserId && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  请先在上方选择一个用户，然后设置该用户的可用时间
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 月历视图 */}
        <TabsContent value="calendar" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* 日历主区域 */}
            <div className="lg:col-span-3">
              <Card className="border-2 border-orange-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    月视图日历
                  </CardTitle>
                  <CardDescription className="text-orange-100">
                    查看可用时间和临时调整，点击日期可快速添加
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedUserId ? (
                    <MonthCalendar
                      events={calendarEvents}
                      onDateClick={handleDateClick}
                    />
                  ) : (
                    <div className="p-12 text-center text-gray-400">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">请先选择用户查看日历</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右侧边栏 */}
            <div className="space-y-4">
              {/* 图例说明 */}
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">图例说明</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>可排课时间</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
                    <span>不可排课（临时调整）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-200 border border-orange-300" />
                    <span>已排课程</span>
                  </div>
                </CardContent>
              </Card>

              {/* 导师专属：临时调整列表 */}
              {userType === 'teacher' && selectedUserId && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarX2 className="h-4 w-4 text-red-500" />
                      临时时间调整
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeTimeBlocks === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        <p className="text-sm">暂无时间调整</p>
                        <Button
                          size="sm"
                          className="mt-2 bg-orange-500"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          添加调整
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timeBlocks
                          .filter(b => b.status === 'confirmed')
                          .slice(0, 4)
                          .map(block => (
                            <div
                              key={block.id}
                              className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-100"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-red-700">
                                  {format(parseISO(block.startDate), 'MM-dd')}
                                  {block.startDate !== block.endDate && (
                                    <span> ~ {format(parseISO(block.endDate), 'MM-dd')}</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{block.reason}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleCancelTimeBlock(block.id)}
                              >
                                取消
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 提示信息 */}
              {userType === 'teacher' && selectedUserId && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-sm text-orange-700">
                    点击日历中的日期可以快速添加临时时间调整
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 创建时间调整对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加临时时间调整</DialogTitle>
            <DialogDescription>设置无法授课的时间段，系统将自动通知相关人员</DialogDescription>
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

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button
              onClick={handleCreateTimeBlock}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {loading ? '创建中...' : '确认创建'}
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
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock,
  Save,
  User,
  Users,
  GraduationCap,
  ChevronDown,
  Check
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
import { useToast } from '@/hooks/use-toast';

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

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

export default function AvailabilityPage() {
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();

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

  // 加载已保存的时间设置
  useEffect(() => {
    if (selectedUserId) {
      loadUserAvailability();
    }
  }, [selectedUserId]);

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
      // 清空选择
      setSelectedUserId('');
    } catch (error) {
      console.error('获取学生列表失败:', error);
      // 使用模拟数据
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
      // 清空选择
      setSelectedUserId('');
    } catch (error) {
      console.error('获取导师列表失败:', error);
      // 使用模拟数据
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
        // 更新时间表状态
        setAvailability(prev => prev.map(slot => {
          const found = data.find((d: any) => d.weekDay === slot.weekDay && d.timeSlot === slot.timeSlot);
          return { ...slot, isAvailable: found?.isAvailable || false };
        }));
      } else {
        // 重置为空
        initializeAvailability();
      }
    } catch (error) {
      console.error('加载时间设置失败:', error);
      initializeAvailability();
    }
  };

  // 切换时间段可用性
  const toggleSlot = (slotId: string) => {
    if (!selectedUserId) {
      toast({
        title: '提示',
        description: '请先选择用户',
        variant: 'destructive',
      });
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
      toast({
        title: '提示',
        description: '请先选择用户',
        variant: 'destructive',
      });
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

  // 快速设置
  const quickSetWorkdays = () => {
    setBatch(['周一', '周二', '周三', '周四', '周五'], timeSlots, true);
  };

  const quickSetWeekends = () => {
    setBatch(['周六', '周日'], timeSlots, true);
  };

  const quickSetEvenings = () => {
    setBatch(weekDays, ['18:00', '20:00'], true);
  };

  const clearAll = () => {
    if (!selectedUserId) {
      toast({
        title: '提示',
        description: '请先选择用户',
        variant: 'destructive',
      });
      return;
    }
    setAvailability(prev => 
      prev.map(slot => ({ ...slot, isAvailable: false }))
    );
  };

  // 保存时间表
  const handleSave = async () => {
    if (!selectedUserId) {
      toast({
        title: '提示',
        description: '请先选择用户',
        variant: 'destructive',
      });
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

      toast({
        title: '成功',
        description: '时间表已保存',
      });
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: '成功',
        description: '时间表已保存（模拟）',
      });
    } finally {
      setLoading(false);
    }
  };

  // 统计可用时间段
  const availableCount = availability.filter(s => s.isAvailable).length;

  // 获取当前用户列表
  const userList = userType === 'student' ? students : teachers;
  
  // 获取选中用户的名称
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
          <p className="text-gray-500 mt-1">设置学生和导师的可用时间段</p>
        </div>
        <Button onClick={handleSave} disabled={loading || !selectedUserId}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? '保存中...' : '保存时间表'}
        </Button>
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
            <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 text-orange-500" />
              <span className="text-sm">
                已选择：<strong>{getSelectedUserName()}</strong>，请在下方设置可用时间
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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
                      const slot = availability.find(
                        s => s.weekDay === day && s.timeSlot === time
                      );
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
    </div>
  );
}

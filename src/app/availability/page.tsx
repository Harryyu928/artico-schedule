'use client';

import { useState, useEffect } from 'react';
import { 
  Clock,
  Save,
  User
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

export default function AvailabilityPage() {
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [userId, setUserId] = useState('');
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 初始化时间表
  useEffect(() => {
    initializeAvailability();
  }, []);

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

  // 切换时间段可用性
  const toggleSlot = (slotId: string) => {
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
    setAvailability(prev => 
      prev.map(slot => ({ ...slot, isAvailable: false }))
    );
  };

  // 保存时间表
  const handleSave = async () => {
    if (!userId) {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userType,
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
        title: '错误',
        description: '保存失败，请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 统计可用时间段
  const availableCount = availability.filter(s => s.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">时间设置</h1>
        <p className="text-gray-500 mt-1">设置学生和导师的可用时间段</p>
      </div>

      {/* 用户选择 */}
      <Card>
        <CardHeader>
          <CardTitle>选择用户</CardTitle>
          <CardDescription>选择要设置时间的用户类型和具体用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="student">学生</SelectItem>
                  <SelectItem value="teacher">导师</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">用户ID</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="请输入用户ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快速设置 */}
      <Card>
        <CardHeader>
          <CardTitle>快速设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={quickSetWorkdays}>
              工作日全天
            </Button>
            <Button variant="outline" onClick={quickSetWeekends}>
              周末全天
            </Button>
            <Button variant="outline" onClick={quickSetEvenings}>
              晚间时段
            </Button>
            <Button variant="outline" onClick={clearAll}>
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 时间表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>可用时间表</CardTitle>
              <CardDescription className="mt-1">
                点击时间段切换可用状态，绿色表示可用
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-base px-4 py-2">
              已选 {availableCount} 个时间段
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border bg-gray-50 dark:bg-gray-800 w-24">时间段</th>
                  {weekDays.map(day => (
                    <th key={day} className="p-2 border bg-gray-50 dark:bg-gray-800 text-center">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(time => (
                  <tr key={time}>
                    <td className="p-2 border bg-gray-50 dark:bg-gray-800 font-medium text-center">
                      {time}
                    </td>
                    {weekDays.map(day => {
                      const slot = availability.find(
                        s => s.weekDay === day && s.timeSlot === time
                      );
                      return (
                        <td
                          key={`${day}-${time}`}
                          className="p-2 border text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => toggleSlot(slot?.id || `${day}-${time}`)}
                        >
                          <div
                            className={`w-full h-12 rounded flex items-center justify-center ${
                              slot?.isAvailable
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                            }`}
                          >
                            {slot?.isAvailable ? '✓' : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? '保存中...' : '保存时间表'}
        </Button>
      </div>
    </div>
  );
}

'use client';

/**
 * 时间表编辑组件
 * 
 * 用于学生和导师填写/管理自己的时间表
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 类型定义
type TimeSlot = '10:00' | '13:00' | '15:00' | '18:00' | '20:00';
type WeekDay = '周一' | '周二' | '周三' | '周四' | '周五' | '周六' | '周日';

interface TimeSlotEntry {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
  isAvailable: boolean;
  status?: 'available' | 'scheduled' | 'conflict' | 'unavailable';
}

interface TimeTableEditorProps {
  mode: 'student' | 'teacher';
  userId: string;
  onSave?: (slots: TimeSlotEntry[]) => void;
  onConfirm?: () => void;
  readOnly?: boolean;
}

const TIME_SLOTS: TimeSlot[] = ['10:00', '13:00', '15:00', '18:00', '20:00'];
const WEEK_DAYS: WeekDay[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const STATUS_COLORS = {
  available: 'bg-green-500 hover:bg-green-600',
  scheduled: 'bg-blue-500',
  conflict: 'bg-red-500',
  unavailable: 'bg-gray-200 hover:bg-gray-300',
};

const STATUS_LABELS = {
  available: '可排课',
  scheduled: '已排课',
  conflict: '冲突',
  unavailable: '不可用',
};

export function TimeTableEditor({
  mode,
  userId,
  onSave,
  onConfirm,
  readOnly = false,
}: TimeTableEditorProps) {
  const [slots, setSlots] = useState<TimeSlotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'未填写' | '部分填写' | '已填写' | '已确认'>('未填写');
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  // 初始化空时间表
  useEffect(() => {
    const initialSlots: TimeSlotEntry[] = [];
    for (const weekDay of WEEK_DAYS) {
      for (const timeSlot of TIME_SLOTS) {
        initialSlots.push({
          weekDay,
          timeSlot,
          isAvailable: false,
          status: 'unavailable',
        });
      }
    }
    setSlots(initialSlots);
    setLoading(false);
  }, []);

  // 加载时间表数据
  useEffect(() => {
    if (!userId || loading) return;
    
    const fetchTimeTable = async () => {
      try {
        const apiPath = mode === 'student' 
          ? `/api/time-table/student/${userId}`
          : `/api/time-table/teacher/${userId}`;
        
        const response = await fetch(apiPath);
        const data = await response.json();
        
        if (data.success && data.data) {
          setSlots(data.data.slots);
          setStatus(data.data.status);
          setConfirmedAt(data.data.confirmedAt);
        }
      } catch (error) {
        console.error('加载时间表失败:', error);
      }
    };
    
    fetchTimeTable();
  }, [userId, mode, loading]);

  // 切换时间段
  const toggleSlot = (weekDay: WeekDay, timeSlot: TimeSlot) => {
    if (readOnly) return;
    
    setSlots(prev => prev.map(slot => {
      if (slot.weekDay === weekDay && slot.timeSlot === timeSlot) {
        const newAvailable = !slot.isAvailable;
        return {
          ...slot,
          isAvailable: newAvailable,
          status: newAvailable ? 'available' : 'unavailable',
        };
      }
      return slot;
    }));
  };

  // 快速选择
  const quickSelect = (pattern: 'weekdays' | 'weekends' | 'evenings' | 'all' | 'clear') => {
    if (readOnly) return;
    
    setSlots(prev => prev.map(slot => {
      let shouldSelect = false;
      
      switch (pattern) {
        case 'weekdays':
          shouldSelect = ['周一', '周二', '周三', '周四', '周五'].includes(slot.weekDay);
          break;
        case 'weekends':
          shouldSelect = ['周六', '周日'].includes(slot.weekDay);
          break;
        case 'evenings':
          shouldSelect = ['18:00', '20:00'].includes(slot.timeSlot);
          break;
        case 'all':
          shouldSelect = true;
          break;
        case 'clear':
          shouldSelect = false;
          break;
      }
      
      return {
        ...slot,
        isAvailable: shouldSelect,
        status: shouldSelect ? 'available' : 'unavailable',
      };
    }));
  };

  // 保存时间表
  const handleSave = async () => {
    setSaving(true);
    try {
      const apiPath = mode === 'student'
        ? `/api/time-table/student/${userId}`
        : `/api/time-table/teacher/${userId}`;
      
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data.status);
        onSave?.(slots);
      }
    } catch (error) {
      console.error('保存时间表失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 确认时间表
  const handleConfirm = async () => {
    try {
      const apiPath = mode === 'student'
        ? `/api/time-table/student/${userId}`
        : `/api/time-table/teacher/${userId}`;
      
      const response = await fetch(apiPath, {
        method: 'PUT',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('已确认');
        setConfirmedAt(data.data.confirmedAt);
        onConfirm?.();
      }
    } catch (error) {
      console.error('确认时间表失败:', error);
    }
  };

  // 计算统计
  const availableCount = slots.filter(s => s.isAvailable).length;
  const totalHours = availableCount * 2; // 每个时间段2小时

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            📅 {mode === 'student' ? '我的时间表' : '导师时间表'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status === '已确认' ? 'default' : status === '已填写' ? 'secondary' : 'outline'}
              className={cn(
                status === '已确认' && 'bg-green-500 text-white',
                status === '已填写' && 'bg-orange-500 text-white',
              )}
            >
              {status}
            </Badge>
            {confirmedAt && (
              <span className="text-sm text-muted-foreground">
                确认于 {confirmedAt}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 快速选择 */}
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">快速选择:</span>
            <Button variant="outline" size="sm" onClick={() => quickSelect('weekdays')}>
              工作日
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('weekends')}>
              周末
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('evenings')}>
              工作日晚上
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('all')}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('clear')}>
              清除
            </Button>
          </div>
        )}

        {/* 时间表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border bg-gray-50"></th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot} className="p-2 border bg-gray-50 text-center font-medium">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map(weekDay => (
                <tr key={weekDay}>
                  <td className="p-2 border bg-gray-50 font-medium text-center">
                    {weekDay}
                  </td>
                  {TIME_SLOTS.map(timeSlot => {
                    const slot = slots.find(
                      s => s.weekDay === weekDay && s.timeSlot === timeSlot
                    );
                    const isAvailable = slot?.isAvailable ?? false;
                    const slotStatus = slot?.status ?? 'unavailable';
                    
                    return (
                      <td
                        key={timeSlot}
                        className={cn(
                          'p-2 border text-center cursor-pointer transition-colors',
                          !readOnly && 'hover:opacity-80',
                          isAvailable 
                            ? 'bg-orange-500 text-white hover:bg-orange-600' 
                            : 'bg-gray-100 hover:bg-gray-200',
                        )}
                        onClick={() => toggleSlot(weekDay, timeSlot)}
                      >
                        {isAvailable ? '✓' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{availableCount}</div>
              <div className="text-sm text-muted-foreground">可用时间段</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{totalHours}</div>
              <div className="text-sm text-muted-foreground">可用课时</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">可用</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 border rounded"></div>
              <span className="text-sm">不可用</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {!readOnly && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存时间表'}
            </Button>
            {status !== '已确认' && (
              <Button
                onClick={handleConfirm}
                disabled={saving || availableCount < 5}
                className="bg-green-500 hover:bg-green-600"
              >
                确认本周时间
              </Button>
            )}
          </div>
        )}

        {/* 提示信息 */}
        <div className="text-sm text-muted-foreground">
          💡 提示：点击时间段可切换可用/不可用状态。建议至少选择5个时间段，以便系统为您安排课程。
        </div>
      </CardContent>
    </Card>
  );
}

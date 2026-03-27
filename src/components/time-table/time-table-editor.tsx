'use client';

/**
 * 时间表编辑组件
 * 
 * 用于学生和导师填写/管理自己的时间表
 * 支持从模板复制、请假申请、临时加课等功能
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Copy, 
  CalendarOff, 
  Plus, 
  Info,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// 类型定义
type TimeSlot = '10:00' | '13:00' | '15:00' | '18:00' | '20:00';
type WeekDay = '周一' | '周二' | '周三' | '周四' | '周五' | '周六' | '周日';

interface TimeSlotEntry {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
  isAvailable: boolean;
  status?: 'available' | 'scheduled' | 'conflict' | 'unavailable';
  scheduledInfo?: {
    studentName: string;
    courseName: string;
  };
}

interface TimeTableEditorProps {
  mode: 'student' | 'teacher';
  userId: string;
  onSave?: (slots: TimeSlotEntry[]) => void;
  onConfirm?: () => void;
  readOnly?: boolean;
  isWeekly?: boolean; // 是否是本周时间表（导师用）
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
  isWeekly = false,
}: TimeTableEditorProps) {
  const [slots, setSlots] = useState<TimeSlotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'未填写' | '部分填写' | '已填写' | '已确认'>('未填写');
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<TimeSlotEntry[] | null>(null);
  
  // 请假对话框
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    date: '',
    timeSlot: '' as TimeSlot | '',
    reason: '',
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  
  // 临时加课对话框
  const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
  const [addTimeForm, setAddTimeForm] = useState({
    date: '',
    timeSlot: '' as TimeSlot | '',
    reason: '',
  });
  const [addTimeSubmitting, setAddTimeSubmitting] = useState(false);
  
  const { toast } = useToast();

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
          // 如果是导师本周时间表，使用weeklySchedule
          const slotData = isWeekly && data.data.weeklySchedule 
            ? data.data.weeklySchedule.slots 
            : data.data.defaultTemplate || data.data.slots;
          
          if (isWeekly && data.data.defaultTemplate) {
            setDefaultTemplate(data.data.defaultTemplate);
          }
          
          setSlots(slotData);
          setStatus(data.data.status);
          setConfirmedAt(data.data.confirmedAt);
        }
      } catch (error) {
        console.error('加载时间表失败:', error);
      }
    };
    
    fetchTimeTable();
  }, [userId, mode, loading, isWeekly]);

  // 切换时间段
  const toggleSlot = (weekDay: WeekDay, timeSlot: TimeSlot) => {
    if (readOnly) return;
    
    setSlots(prev => prev.map(slot => {
      if (slot.weekDay === weekDay && slot.timeSlot === timeSlot) {
        // 如果已经排课，不允许切换
        if (slot.status === 'scheduled') {
          toast({
            title: '无法修改',
            description: '该时间段已有课程安排，请先取消排课',
            variant: 'destructive',
          });
          return slot;
        }
        
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
      // 如果已经排课，不修改
      if (slot.status === 'scheduled') return slot;
      
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

  // 从模板复制
  const copyFromTemplate = () => {
    if (!defaultTemplate) {
      toast({
        title: '无模板',
        description: '请先设置默认时间模板',
        variant: 'destructive',
      });
      return;
    }
    
    setSlots(prev => prev.map(slot => {
      const templateSlot = defaultTemplate.find(
        t => t.weekDay === slot.weekDay && t.timeSlot === slot.timeSlot
      );
      
      // 不覆盖已排课的时间
      if (slot.status === 'scheduled') return slot;
      
      return {
        ...slot,
        isAvailable: templateSlot?.isAvailable ?? false,
        status: templateSlot?.isAvailable ? 'available' : 'unavailable',
      };
    }));
    
    toast({
      title: '复制成功',
      description: '已从默认模板复制时间设置',
    });
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
        body: JSON.stringify({ 
          slots,
          isDefault: !isWeekly, // 如果不是本周，则保存为默认模板
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data.status);
        onSave?.(slots);
        toast({
          title: '保存成功',
          description: '时间表已保存',
        });
      }
    } catch (error) {
      console.error('保存时间表失败:', error);
      toast({
        title: '保存失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
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
        toast({
          title: '确认成功',
          description: '时间表已确认',
        });
      }
    } catch (error) {
      console.error('确认时间表失败:', error);
      toast({
        title: '确认失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 请假申请
  const handleLeaveSubmit = async () => {
    if (!leaveForm.date || !leaveForm.timeSlot) {
      toast({
        title: '请填写完整',
        description: '请选择日期和时间段',
        variant: 'destructive',
      });
      return;
    }
    
    setLeaveSubmitting(true);
    try {
      const response = await fetch(`/api/time-table/teacher/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: leaveForm.date,
          timeSlot: leaveForm.timeSlot,
          action: 'remove',
          reason: leaveForm.reason || '请假',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '请假成功',
          description: `已取消 ${leaveForm.date} ${leaveForm.timeSlot} 的时间`,
        });
        setLeaveDialogOpen(false);
        setLeaveForm({ date: '', timeSlot: '', reason: '' });
        // 刷新时间表
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('请假失败:', error);
      toast({
        title: '请假失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // 临时加课
  const handleAddTimeSubmit = async () => {
    if (!addTimeForm.date || !addTimeForm.timeSlot) {
      toast({
        title: '请填写完整',
        description: '请选择日期和时间段',
        variant: 'destructive',
      });
      return;
    }
    
    setAddTimeSubmitting(true);
    try {
      const response = await fetch(`/api/time-table/teacher/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: addTimeForm.date,
          timeSlot: addTimeForm.timeSlot,
          action: 'add',
          reason: addTimeForm.reason || '临时加课',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '加课成功',
          description: `已添加 ${addTimeForm.date} ${addTimeForm.timeSlot} 的可用时间`,
        });
        setAddTimeDialogOpen(false);
        setAddTimeForm({ date: '', timeSlot: '', reason: '' });
        // 刷新时间表
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('加课失败:', error);
      toast({
        title: '加课失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setAddTimeSubmitting(false);
    }
  };

  // 计算统计
  const availableCount = slots.filter(s => s.isAvailable || s.status === 'available').length;
  const scheduledCount = slots.filter(s => s.status === 'scheduled').length;
  const totalHours = availableCount * 2; // 每个时间段2小时

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl">
            📅 {mode === 'student' ? '我的时间表' : isWeekly ? '本周时间表' : '默认时间模板'}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
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
        {/* 快速选择和操作 */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">快速选择:</span>
            <Button variant="outline" size="sm" onClick={() => quickSelect('weekdays')}>
              工作日
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('weekends')}>
              周末
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('evenings')}>
              晚间
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('all')}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSelect('clear')}>
              清除
            </Button>
            
            {/* 导师专属：从模板复制 */}
            {mode === 'teacher' && isWeekly && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyFromTemplate}
                className="ml-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-1" />
                从模板复制
              </Button>
            )}
          </div>
        )}

        {/* 时间表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border bg-gray-50 w-16"></th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot} className="p-2 border bg-gray-50 text-center font-medium text-sm">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map(weekDay => (
                <tr key={weekDay}>
                  <td className="p-2 border bg-gray-50 font-medium text-center text-sm">
                    {weekDay}
                  </td>
                  {TIME_SLOTS.map(timeSlot => {
                    const slot = slots.find(
                      s => s.weekDay === weekDay && s.timeSlot === timeSlot
                    );
                    const isAvailable = slot?.isAvailable ?? false;
                    const slotStatus = slot?.status ?? 'unavailable';
                    const isScheduled = slotStatus === 'scheduled';
                    
                    return (
                      <td
                        key={timeSlot}
                        className={cn(
                          'p-2 border text-center cursor-pointer transition-colors min-w-[60px]',
                          !readOnly && !isScheduled && 'hover:opacity-80',
                          isScheduled 
                            ? 'bg-blue-500 text-white cursor-not-allowed' 
                            : isAvailable 
                              ? 'bg-orange-500 text-white hover:bg-orange-600' 
                              : 'bg-gray-100 hover:bg-gray-200',
                        )}
                        onClick={() => toggleSlot(weekDay, timeSlot)}
                        title={isScheduled ? `${slot?.scheduledInfo?.studentName || ''} - ${slot?.scheduledInfo?.courseName || '已排课'}` : ''}
                      >
                        {isScheduled ? (
                          <span className="text-xs">📚</span>
                        ) : isAvailable ? (
                          '✓'
                        ) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{availableCount}</div>
              <div className="text-sm text-muted-foreground">可用时间段</div>
            </div>
            {scheduledCount > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{scheduledCount}</div>
                <div className="text-sm text-muted-foreground">已排课</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{totalHours}</div>
              <div className="text-sm text-muted-foreground">可用课时</div>
            </div>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">可用</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">已排课</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 border rounded"></div>
              <span className="text-sm">不可用</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {!readOnly && (
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              {/* 导师专属：请假/加课 */}
              {mode === 'teacher' && (
                <>
                  <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarOff className="w-4 h-4 mr-1" />
                        请假
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>请假申请</DialogTitle>
                        <DialogDescription>
                          取消指定时间段的可用状态，如有排课需先联系学生调整
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>日期 *</Label>
                          <Input
                            type="date"
                            value={leaveForm.date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>时间段 *</Label>
                          <Select
                            value={leaveForm.timeSlot}
                            onValueChange={(v) => setLeaveForm({ ...leaveForm, timeSlot: v as TimeSlot })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择时间段" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(slot => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>原因</Label>
                          <Textarea
                            value={leaveForm.reason}
                            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                            placeholder="请假原因（可选）"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                          取消
                        </Button>
                        <Button 
                          onClick={handleLeaveSubmit}
                          disabled={leaveSubmitting}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {leaveSubmitting ? '提交中...' : '确认请假'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        临时加课
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>临时加课</DialogTitle>
                        <DialogDescription>
                          在指定时间段增加可用时间，系统会自动为您分配课程
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>日期 *</Label>
                          <Input
                            type="date"
                            value={addTimeForm.date}
                            onChange={(e) => setAddTimeForm({ ...addTimeForm, date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>时间段 *</Label>
                          <Select
                            value={addTimeForm.timeSlot}
                            onValueChange={(v) => setAddTimeForm({ ...addTimeForm, timeSlot: v as TimeSlot })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择时间段" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(slot => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>备注</Label>
                          <Textarea
                            value={addTimeForm.reason}
                            onChange={(e) => setAddTimeForm({ ...addTimeForm, reason: e.target.value })}
                            placeholder="备注信息（可选）"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddTimeDialogOpen(false)}>
                          取消
                        </Button>
                        <Button 
                          onClick={handleAddTimeSubmit}
                          disabled={addTimeSubmitting}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {addTimeSubmitting ? '添加中...' : '确认添加'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
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
                  确认时间表
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p>点击时间段可切换可用/不可用状态。</p>
            <p className="mt-1">💡 建议至少选择 <strong>5个时间段</strong>，以便系统为您安排课程。</p>
            {mode === 'teacher' && (
              <p className="mt-1">📚 <strong>蓝色</strong>格子表示已排课，无法直接修改。</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

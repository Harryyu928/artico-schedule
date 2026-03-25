/**
 * 导师临时时间调整页面
 * 核心功能：直观的日历视图管理时间调整
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CalendarX2,
  ClockAlert,
  Calendar as CalendarIcon,
  Plus,
  ChevronRight,
  Info,
} from 'lucide-react';
import MonthCalendar, { CalendarEvent } from '@/components/calendar/MonthCalendar';

// 类型定义
type BlockType = 'temporary_unavailable' | 'meeting' | 'leave' | 'training' | 'other';
type CancellationReason = 'teacher_emergency' | 'teacher_leave' | 'student_request' | 'student_emergency' | 'course_conflict' | 'other';

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

interface Cancellation {
  id: string;
  cancellationId: string;
  scheduleId: string;
  teacherId: string;
  studentId: string;
  originalDate: string;
  originalTimeSlot: string;
  originalHours: number;
  cancellationReason: CancellationReason;
  cancellationDetail: string | null;
  makeupRequired: boolean;
  makeupScheduled: boolean;
  cancelledAt: string;
}

// 选项配置
const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'temporary_unavailable', label: '临时不可用' },
  { value: 'meeting', label: '会议' },
  { value: 'leave', label: '请假' },
  { value: 'training', label: '培训' },
  { value: 'other', label: '其他' },
];

const CANCELLATION_REASONS: { value: CancellationReason; label: string }[] = [
  { value: 'teacher_emergency', label: '导师突发情况' },
  { value: 'teacher_leave', label: '导师请假' },
  { value: 'student_request', label: '学生申请取消' },
  { value: 'student_emergency', label: '学生突发情况' },
  { value: 'course_conflict', label: '课程冲突' },
  { value: 'other', label: '其他原因' },
];

export default function TimeAdjustmentPage() {
  const [teacherId, setTeacherId] = useState('teacher-001');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // 取消课程表单
  const [cancelForm, setCancelForm] = useState({
    scheduleId: '',
    cancellationReason: 'teacher_emergency' as CancellationReason,
    cancellationDetail: '',
    makeupRequired: true,
    createTimeBlock: false,
    timeBlockReason: '',
  });

  // 列表数据
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [pendingMakeups, setPendingMakeups] = useState<Cancellation[]>([]);

  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    try {
      const [blocksRes, cancelsRes, makeupsRes] = await Promise.all([
        fetch(`/api/time-blocks?teacherId=${teacherId}`),
        fetch(`/api/schedules/cancellations?teacherId=${teacherId}`),
        fetch('/api/schedules/cancellations?action=pending-makeups'),
      ]);

      if (blocksRes.ok) {
        const data = await blocksRes.json();
        setTimeBlocks(data.data || []);
      }

      if (cancelsRes.ok) {
        const data = await cancelsRes.json();
        setCancellations(data.data || []);
      }

      if (makeupsRes.ok) {
        const data = await makeupsRes.json();
        setPendingMakeups(data.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 转换为日历事件
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

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

    // 添加补课安排
    pendingMakeups.forEach(makeup => {
      events.push({
        id: makeup.id,
        title: '待补课',
        date: makeup.originalDate,
        startTime: makeup.originalTimeSlot,
        type: 'makeup',
        status: 'pending',
        detail: `原课时: ${makeup.originalHours}小时`,
      });
    });

    return events;
  }, [timeBlocks, pendingMakeups]);

  // 点击日期
  const handleDateClick = (date: Date, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedDateEvents(events);
    setShowDateDialog(true);
  };

  // 快捷创建
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

  // 创建时间调整
  const handleCreateTimeBlock = async () => {
    if (!timeBlockForm.startDate || !timeBlockForm.endDate || !timeBlockForm.reason) {
      setMessage({ type: 'error', text: '请填写完整信息' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, ...timeBlockForm }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || '时间调整已创建' });
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
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '创建失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 取消时间调整
  const handleCancelTimeBlock = async (timeBlockId: string) => {
    if (!confirm('确定要取消这个时间调整吗？')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/time-blocks?id=${timeBlockId}&cancelledBy=${teacherId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '时间调整已取消' });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '取消失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  // 取消课程
  const handleCancelSchedule = async () => {
    if (!cancelForm.scheduleId) {
      setMessage({ type: 'error', text: '请输入排课ID' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/schedules/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cancelForm, cancelledBy: teacherId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || '课程已取消' });
        setCancelForm({
          scheduleId: '',
          cancellationReason: 'teacher_emergency',
          cancellationDetail: '',
          makeupRequired: true,
          createTimeBlock: false,
          timeBlockReason: '',
        });
        setShowCancelDialog(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '取消失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  // 安排补课
  const handleScheduleMakeup = async (cancellationId: string) => {
    const newScheduleId = prompt('请输入新排课ID:');
    if (!newScheduleId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/schedules/cancel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationId, newScheduleId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '补课已安排' });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '安排失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto py-6 space-y-6">
        
        {/* 页面标题 - 更醒目 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">时间调整管理</h1>
                <p className="text-gray-500">在日历上直观管理您的授课时间调整</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                添加时间调整
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-5 w-5" />
                取消课程
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={loadData}
              >
                <Clock className="mr-2 h-5 w-5" />
                刷新
              </Button>
            </div>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="shadow-md">
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        )}

        {/* 统计卡片 - 更醒目 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">不可排课时间</p>
                  <p className="text-4xl font-bold text-red-700 mt-1">
                    {timeBlocks.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className="text-xs text-red-500 mt-1">条有效调整</p>
                </div>
                <div className="w-14 h-14 bg-red-200 rounded-full flex items-center justify-center">
                  <CalendarX2 className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">待补课</p>
                  <p className="text-4xl font-bold text-orange-700 mt-1">
                    {pendingMakeups.length}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">需要安排</p>
                </div>
                <div className="w-14 h-14 bg-orange-200 rounded-full flex items-center justify-center">
                  <ClockAlert className="h-7 w-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">已取消课程</p>
                  <p className="text-4xl font-bold text-gray-700 mt-1">
                    {cancellations.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">历史记录</p>
                </div>
                <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">已安排补课</p>
                  <p className="text-4xl font-bold text-green-700 mt-1">
                    {cancellations.filter(c => c.makeupScheduled).length}
                  </p>
                  <p className="text-xs text-green-500 mt-1">已完成</p>
                </div>
                <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区：日历 + 侧边栏 */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* 日历主区域 - 占3/4 */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg border-2 border-orange-100">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6" />
                  月视图日历
                </CardTitle>
                <CardDescription className="text-orange-100">
                  点击日期可查看详情或快速添加时间调整
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <MonthCalendar
                  events={calendarEvents}
                  onDateClick={handleDateClick}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右侧边栏 - 占1/4 */}
          <div className="space-y-4">
            
            {/* 使用说明 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <Info className="h-4 w-4" />
                  使用说明
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-600 space-y-1">
                <p>• 点击日历日期查看详情</p>
                <p>• 红色标记 = 不可排课</p>
                <p>• 橙色标记 = 已排课程</p>
                <p>• 蓝色标记 = 待补课</p>
              </CardContent>
            </Card>

            {/* 待补课提醒 */}
            {pendingMakeups.length > 0 && (
              <Card className="bg-orange-50 border-orange-300 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <ClockAlert className="h-5 w-5 animate-pulse" />
                    待补课提醒
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingMakeups.slice(0, 3).map(makeup => (
                      <div
                        key={makeup.id}
                        className="flex items-center justify-between p-2 rounded bg-white border border-orange-200"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(makeup.originalDate), 'MM-dd')} {makeup.originalTimeSlot}
                          </p>
                          <p className="text-xs text-gray-500">{makeup.originalHours}小时</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleScheduleMakeup(makeup.id)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          安排
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最近时间调整 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarX2 className="h-5 w-5 text-red-500" />
                  最近时间调整
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeBlocks.filter(b => b.status === 'confirmed').length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <CalendarX2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无时间调整</p>
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

            {/* 快捷操作 */}
            <Card className="bg-gray-50">
              <CardContent className="p-4 space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加时间调整
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  取消课程
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部详情表格 */}
        {(timeBlocks.length > 0 || cancellations.length > 0) && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-orange-500" />
                详细记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>时间段</TableHead>
                    <TableHead>原因/说明</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeBlocks.slice(0, 5).map(block => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <Badge variant="destructive">时间调整</Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(block.startDate), 'MM-dd')}
                        {block.startDate !== block.endDate && (
                          <> ~ {format(parseISO(block.endDate), 'MM-dd')}</>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{block.reason}</TableCell>
                      <TableCell>
                        <Badge className={block.status === 'confirmed' ? 'bg-green-500' : ''}>
                          {block.status === 'confirmed' ? '生效中' : '已取消'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(block.createdAt), 'MM-dd HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        {block.status === 'confirmed' && (
                          <Button size="sm" variant="outline" onClick={() => handleCancelTimeBlock(block.id)}>
                            取消
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cancellations.slice(0, 5).map(cancel => (
                    <TableRow key={cancel.id}>
                      <TableCell>
                        <Badge variant="secondary">课程取消</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(cancel.originalDate), 'MM-dd')} {cancel.originalTimeSlot}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {CANCELLATION_REASONS.find(r => r.value === cancel.cancellationReason)?.label}
                      </TableCell>
                      <TableCell>
                        {cancel.makeupRequired ? (
                          cancel.makeupScheduled ? (
                            <Badge className="bg-green-500">已补课</Badge>
                          ) : (
                            <Badge variant="destructive">待补课</Badge>
                          )
                        ) : (
                          <Badge variant="outline">无需补课</Badge>
                        )}
                      </TableCell>
                      <TableCell>{format(parseISO(cancel.cancelledAt), 'MM-dd HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        {cancel.makeupRequired && !cancel.makeupScheduled && (
                          <Button size="sm" className="bg-orange-500" onClick={() => handleScheduleMakeup(cancel.id)}>
                            安排补课
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 创建时间调整对话框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">创建时间调整</DialogTitle>
              <DialogDescription>设置您无法授课的时间段</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-medium">开始日期 *</Label>
                  <Input
                    type="date"
                    value={timeBlockForm.startDate}
                    onChange={(e) => setTimeBlockForm({ ...timeBlockForm, startDate: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">结束日期 *</Label>
                  <Input
                    type="date"
                    value={timeBlockForm.endDate}
                    onChange={(e) => setTimeBlockForm({ ...timeBlockForm, endDate: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-medium">调整类型</Label>
                  <Select
                    value={timeBlockForm.blockType}
                    onValueChange={(value) => setTimeBlockForm({ ...timeBlockForm, blockType: value as BlockType })}
                  >
                    <SelectTrigger className="h-11">
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
                  <Label className="font-medium">时间段类型</Label>
                  <Select
                    value={timeBlockForm.isAllDay ? 'all-day' : 'partial'}
                    onValueChange={(value) => setTimeBlockForm({ ...timeBlockForm, isAllDay: value === 'all-day' })}
                  >
                    <SelectTrigger className="h-11">
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
                className="bg-gradient-to-r from-orange-500 to-orange-600 px-8"
              >
                {loading ? '创建中...' : '确认创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 取消课程对话框 */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-600">取消课程</DialogTitle>
              <DialogDescription>取消已安排的课程，系统将自动通知相关人员</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-medium">排课ID *</Label>
                <Input
                  placeholder="输入要取消的排课ID"
                  value={cancelForm.scheduleId}
                  onChange={(e) => setCancelForm({ ...cancelForm, scheduleId: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">取消原因</Label>
                <Select
                  value={cancelForm.cancellationReason}
                  onValueChange={(value) => setCancelForm({ ...cancelForm, cancellationReason: value as CancellationReason })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_REASONS.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>详细说明</Label>
                <Textarea
                  placeholder="请详细说明取消原因..."
                  value={cancelForm.cancellationDetail}
                  onChange={(e) => setCancelForm({ ...cancelForm, cancellationDetail: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelForm.makeupRequired}
                    onChange={(e) => setCancelForm({ ...cancelForm, makeupRequired: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span>需要安排补课</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>取消</Button>
              <Button
                onClick={handleCancelSchedule}
                disabled={loading}
                variant="destructive"
                className="px-8"
              >
                {loading ? '取消中...' : '确认取消课程'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 日期详情对话框 */}
        <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedDate && format(selectedDate, 'yyyy年 M月 d日 EEEE', { locale: zhCN })}
              </DialogTitle>
              <DialogDescription>查看该日期的所有安排</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>该日期无特殊安排</p>
                  <p className="text-sm mt-2">点击下方按钮添加时间调整</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div key={event.id} className="p-4 rounded-lg bg-gray-50 border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={event.type === 'time_block' ? 'destructive' : 'default'}>
                          {event.type === 'time_block' ? '不可排课' : event.type === 'makeup' ? '待补课' : '已排课程'}
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

              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
                onClick={() => selectedDate && handleQuickCreate(selectedDate)}
              >
                <Plus className="mr-2 h-4 w-4" />
                为此日期添加时间调整
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

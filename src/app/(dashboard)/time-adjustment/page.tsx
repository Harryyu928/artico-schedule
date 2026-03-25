/**
 * 导师临时时间调整页面
 * 支持设置不可排课时间、取消课程、查看待补课
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Clock,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  CalendarX2,
  ClockAlert,
  MessageSquare,
  Users,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState('create');
  const [teacherId, setTeacherId] = useState('teacher-001'); // 实际应从登录获取
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

  // 加载数据
  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    try {
      // 并行加载时间调整和取消记录
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
        body: JSON.stringify({
          teacherId,
          ...timeBlockForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || '时间调整已创建' 
        });
        setTimeBlockForm({
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          isAllDay: true,
          blockType: 'temporary_unavailable',
          reason: '',
        });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '创建失败' });
      }
    } catch (error) {
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
    } catch (error) {
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
        body: JSON.stringify({
          ...cancelForm,
          cancelledBy: teacherId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || '课程已取消' 
        });
        setCancelForm({
          scheduleId: '',
          cancellationReason: 'teacher_emergency',
          cancellationDetail: '',
          makeupRequired: true,
          createTimeBlock: false,
          timeBlockReason: '',
        });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '取消失败' });
      }
    } catch (error) {
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
        body: JSON.stringify({
          cancellationId,
          newScheduleId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '补课已安排' });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || '安排失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">时间调整管理</h1>
          <p className="text-muted-foreground">
            管理导师临时时间调整、取消课程和补课安排
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <Clock className="mr-2 h-4 w-4" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 快捷统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">时间调整记录</CardTitle>
            <CalendarX2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeBlocks.length}</div>
            <p className="text-xs text-muted-foreground">
              已提交 {timeBlocks.filter(b => b.status === 'confirmed').length} 条
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已取消课程</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancellations.length}</div>
            <p className="text-xs text-muted-foreground">
              本月取消 {cancellations.filter(c => {
                const date = new Date(c.cancelledAt);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length} 节
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待补课</CardTitle>
            <ClockAlert className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingMakeups.length}</div>
            <p className="text-xs text-muted-foreground">
              需要安排补课
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">通知发送</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">自动</div>
            <p className="text-xs text-muted-foreground">
              取消课程自动通知
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">
            <CalendarDays className="mr-2 h-4 w-4" />
            提交时间调整
          </TabsTrigger>
          <TabsTrigger value="cancel">
            <XCircle className="mr-2 h-4 w-4" />
            取消课程
          </TabsTrigger>
          <TabsTrigger value="makeups">
            <ClockAlert className="mr-2 h-4 w-4" />
            待补课列表
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            历史记录
          </TabsTrigger>
        </TabsList>

        {/* 提交时间调整 */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>提交临时时间调整</CardTitle>
              <CardDescription>
                设置您无法授课的时间段，系统将自动查找并通知受影响的课程
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* 调整类型 */}
                <div className="space-y-2">
                  <Label>调整类型</Label>
                  <Select
                    value={timeBlockForm.blockType}
                    onValueChange={(value) => 
                      setTimeBlockForm({ ...timeBlockForm, blockType: value as BlockType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 是否全天 */}
                <div className="space-y-2">
                  <Label>时间段类型</Label>
                  <Select
                    value={timeBlockForm.isAllDay ? 'all-day' : 'partial'}
                    onValueChange={(value) => 
                      setTimeBlockForm({ 
                        ...timeBlockForm, 
                        isAllDay: value === 'all-day',
                        startTime: value === 'all-day' ? '' : timeBlockForm.startTime,
                        endTime: value === 'all-day' ? '' : timeBlockForm.endTime,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-day">全天不可用</SelectItem>
                      <SelectItem value="partial">部分时间不可用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 开始日期 */}
                <div className="space-y-2">
                  <Label>开始日期 *</Label>
                  <Input
                    type="date"
                    value={timeBlockForm.startDate}
                    onChange={(e) => 
                      setTimeBlockForm({ ...timeBlockForm, startDate: e.target.value })
                    }
                  />
                </div>

                {/* 结束日期 */}
                <div className="space-y-2">
                  <Label>结束日期 *</Label>
                  <Input
                    type="date"
                    value={timeBlockForm.endDate}
                    onChange={(e) => 
                      setTimeBlockForm({ ...timeBlockForm, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* 具体时间（非全天时显示） */}
              {!timeBlockForm.isAllDay && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>开始时间</Label>
                    <Input
                      type="time"
                      value={timeBlockForm.startTime}
                      onChange={(e) => 
                        setTimeBlockForm({ ...timeBlockForm, startTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束时间</Label>
                    <Input
                      type="time"
                      value={timeBlockForm.endTime}
                      onChange={(e) => 
                        setTimeBlockForm({ ...timeBlockForm, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* 原因说明 */}
              <div className="space-y-2">
                <Label>原因说明 *</Label>
                <Textarea
                  placeholder="请详细说明无法授课的原因..."
                  value={timeBlockForm.reason}
                  onChange={(e) => 
                    setTimeBlockForm({ ...timeBlockForm, reason: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setTimeBlockForm({
                    startDate: '',
                    endDate: '',
                    startTime: '',
                    endTime: '',
                    isAllDay: true,
                    blockType: 'temporary_unavailable',
                    reason: '',
                  })}
                >
                  重置
                </Button>
                <Button
                  onClick={handleCreateTimeBlock}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? '提交中...' : '提交调整申请'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 取消课程 */}
        <TabsContent value="cancel">
          <Card>
            <CardHeader>
              <CardTitle>取消课程</CardTitle>
              <CardDescription>
                取消已安排的课程，系统将自动通知学生和规划顾问
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* 排课ID */}
                <div className="space-y-2">
                  <Label>排课ID *</Label>
                  <Input
                    placeholder="输入要取消的排课ID"
                    value={cancelForm.scheduleId}
                    onChange={(e) => 
                      setCancelForm({ ...cancelForm, scheduleId: e.target.value })
                    }
                  />
                </div>

                {/* 取消原因 */}
                <div className="space-y-2">
                  <Label>取消原因</Label>
                  <Select
                    value={cancelForm.cancellationReason}
                    onValueChange={(value) => 
                      setCancelForm({ ...cancelForm, cancellationReason: value as CancellationReason })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANCELLATION_REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 详细说明 */}
              <div className="space-y-2">
                <Label>详细说明</Label>
                <Textarea
                  placeholder="请详细说明取消原因..."
                  value={cancelForm.cancellationDetail}
                  onChange={(e) => 
                    setCancelForm({ ...cancelForm, cancellationDetail: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 是否需要补课 */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="makeupRequired"
                    checked={cancelForm.makeupRequired}
                    onChange={(e) => 
                      setCancelForm({ ...cancelForm, makeupRequired: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="makeupRequired" className="cursor-pointer">
                    需要安排补课
                  </Label>
                </div>

                {/* 是否同时创建时间调整 */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createTimeBlock"
                    checked={cancelForm.createTimeBlock}
                    onChange={(e) => 
                      setCancelForm({ ...cancelForm, createTimeBlock: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="createTimeBlock" className="cursor-pointer">
                    同时设置为不可排课时间
                  </Label>
                </div>
              </div>

              {/* 时间调整原因（勾选时显示） */}
              {cancelForm.createTimeBlock && (
                <div className="space-y-2">
                  <Label>不可排课原因</Label>
                  <Input
                    placeholder="例如：临时有事、身体不适等"
                    value={cancelForm.timeBlockReason}
                    onChange={(e) => 
                      setCancelForm({ ...cancelForm, timeBlockReason: e.target.value })
                    }
                  />
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCancelForm({
                    scheduleId: '',
                    cancellationReason: 'teacher_emergency',
                    cancellationDetail: '',
                    makeupRequired: true,
                    createTimeBlock: false,
                    timeBlockReason: '',
                  })}
                >
                  重置
                </Button>
                <Button
                  onClick={handleCancelSchedule}
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? '取消中...' : '确认取消课程'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 待补课列表 */}
        <TabsContent value="makeups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockAlert className="h-5 w-5 text-orange-500" />
                待补课列表
              </CardTitle>
              <CardDescription>
                以下课程需要安排补课，请及时处理
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMakeups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>暂无待补课课程</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>取消单号</TableHead>
                      <TableHead>原上课日期</TableHead>
                      <TableHead>原时间段</TableHead>
                      <TableHead>课时数</TableHead>
                      <TableHead>取消原因</TableHead>
                      <TableHead>取消时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMakeups.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.cancellationId}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.originalDate), 'yyyy-MM-dd', { locale: zhCN })}
                        </TableCell>
                        <TableCell>{item.originalTimeSlot}</TableCell>
                        <TableCell>{item.originalHours} 小时</TableCell>
                        <TableCell>
                          {CANCELLATION_REASONS.find(r => r.value === item.cancellationReason)?.label || item.cancellationReason}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.cancelledAt), 'MM-dd HH:mm', { locale: zhCN })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleScheduleMakeup(item.id)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            安排补课
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 历史记录 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
              <CardDescription>
                查看您的时间调整和课程取消历史
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="time-blocks">
                <TabsList>
                  <TabsTrigger value="time-blocks">时间调整</TabsTrigger>
                  <TabsTrigger value="cancellations">课程取消</TabsTrigger>
                </TabsList>

                <TabsContent value="time-blocks" className="mt-4">
                  {timeBlocks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      暂无时间调整记录
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>时间段</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>原因</TableHead>
                          <TableHead>影响课程</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>提交时间</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeBlocks.map((block) => (
                          <TableRow key={block.id}>
                            <TableCell>
                              <div>
                                {format(new Date(block.startDate), 'MM-dd', { locale: zhCN })}
                                {' ~ '}
                                {format(new Date(block.endDate), 'MM-dd', { locale: zhCN })}
                              </div>
                              {!block.isAllDay && block.startTime && (
                                <div className="text-xs text-muted-foreground">
                                  {block.startTime} - {block.endTime}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {BLOCK_TYPES.find(t => t.value === block.blockType)?.label || block.blockType}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {block.reason}
                            </TableCell>
                            <TableCell>
                              <Badge variant={block.affectedSchedules.length > 0 ? 'destructive' : 'secondary'}>
                                {block.affectedSchedules.length} 节
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={block.status === 'confirmed' ? 'default' : 'secondary'}
                                className={block.status === 'confirmed' ? 'bg-green-500' : ''}
                              >
                                {block.status === 'confirmed' ? '已确认' : 
                                 block.status === 'cancelled' ? '已取消' : '已完成'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(block.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                            </TableCell>
                            <TableCell className="text-right">
                              {block.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelTimeBlock(block.id)}
                                >
                                  取消
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="cancellations" className="mt-4">
                  {cancellations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      暂无课程取消记录
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>取消单号</TableHead>
                          <TableHead>原上课日期</TableHead>
                          <TableHead>原时间段</TableHead>
                          <TableHead>课时数</TableHead>
                          <TableHead>取消原因</TableHead>
                          <TableHead>补课状态</TableHead>
                          <TableHead>取消时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cancellations.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.cancellationId}
                            </TableCell>
                            <TableCell>
                              {format(new Date(item.originalDate), 'yyyy-MM-dd', { locale: zhCN })}
                            </TableCell>
                            <TableCell>{item.originalTimeSlot}</TableCell>
                            <TableCell>{item.originalHours} 小时</TableCell>
                            <TableCell>
                              {CANCELLATION_REASONS.find(r => r.value === item.cancellationReason)?.label || item.cancellationReason}
                            </TableCell>
                            <TableCell>
                              {item.makeupRequired ? (
                                item.makeupScheduled ? (
                                  <Badge className="bg-green-500">已安排补课</Badge>
                                ) : (
                                  <Badge variant="destructive">待补课</Badge>
                                )
                              ) : (
                                <Badge variant="secondary">无需补课</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(item.cancelledAt), 'MM-dd HH:mm', { locale: zhCN })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

interface ClassRecord {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime?: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod?: string;
  studentPerformance?: string;
  attendanceStatus: string;
  homework?: string;
  nextPlan?: string;
  createdAt: string;
}

export default function ClassRecordsPage() {
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const { toast } = useToast();

  // 新记录表单
  const [newRecord, setNewRecord] = useState({
    studentId: '',
    teacherId: '',
    courseId: '',
    classDate: '',
    weekDay: '周一',
    startTime: '10:00',
    actualDuration: 120,
    contentSummary: '',
    teachingMethod: '',
    studentPerformance: '',
    homework: '',
    nextPlan: '',
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/class-records');
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('获取上课记录失败:', error);
      // 使用模拟数据
      setRecords([
        {
          id: '1',
          recordId: 'REC-20260001',
          studentId: 'student-1',
          studentName: '张三',
          teacherId: 'teacher-1',
          teacherName: '李老师',
          courseId: 'course-1',
          courseName: '选课指导',
          classDate: '2026-03-24',
          weekDay: '周二',
          startTime: '10:00',
          endTime: '12:00',
          actualDuration: 120,
          contentSummary: '介绍了英国游戏设计专业申请要求和作品集准备方向',
          teachingMethod: '一对一线上指导',
          studentPerformance: '学生表现积极，对英国院校有明确目标',
          attendanceStatus: '已完成',
          homework: '调研3所目标院校的作品集要求',
          nextPlan: '下周开始作品集项目选题讨论',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          recordId: 'REC-20260002',
          studentId: 'student-2',
          studentName: '李四',
          teacherId: 'teacher-1',
          teacherName: '李老师',
          courseId: 'course-2',
          courseName: '作品集指导',
          classDate: '2026-03-24',
          weekDay: '周二',
          startTime: '15:00',
          endTime: '17:00',
          actualDuration: 120,
          contentSummary: '作品集项目一：游戏关卡设计',
          teachingMethod: '一对一线上指导',
          studentPerformance: '学生完成了初步的关卡草图设计',
          attendanceStatus: '已完成',
          homework: '完善关卡设计草图，下周进行3D建模',
          nextPlan: '继续推进项目一',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          recordId: 'REC-20260003',
          studentId: 'student-1',
          studentName: '张三',
          teacherId: 'teacher-2',
          teacherName: '王老师',
          courseId: 'course-3',
          courseName: '文书指导',
          classDate: '2026-03-26',
          weekDay: '周四',
          startTime: '18:00',
          actualDuration: 120,
          contentSummary: '',
          attendanceStatus: '已排课',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 创建记录
  const handleCreateRecord = async () => {
    try {
      if (!newRecord.studentId || !newRecord.teacherId || !newRecord.courseId || !newRecord.classDate) {
        toast({
          title: '提示',
          description: '请填写完整的记录信息',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });

      if (!response.ok) throw new Error('创建失败');

      toast({
        title: '成功',
        description: '上课记录已创建',
      });

      setCreateDialogOpen(false);
      setNewRecord({
        studentId: '',
        teacherId: '',
        courseId: '',
        classDate: '',
        weekDay: '周一',
        startTime: '10:00',
        actualDuration: 120,
        contentSummary: '',
        teachingMethod: '',
        studentPerformance: '',
        homework: '',
        nextPlan: '',
      });

      fetchRecords();
    } catch (error) {
      console.error('创建记录失败:', error);
      toast({
        title: '错误',
        description: '创建记录失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 更新状态
  const handleUpdateStatus = async (recordId: string, status: string) => {
    try {
      const response = await fetch(`/api/class-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceStatus: status }),
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '成功',
        description: '状态已更新',
      });

      setDetailDialogOpen(false);
      fetchRecords();
    } catch (error) {
      console.error('更新失败:', error);
      toast({
        title: '错误',
        description: '更新失败，请重试',
        variant: 'destructive',
      });
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已排课':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case '已上课':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case '缺课':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case '请假':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已排课':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case '已上课':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case '缺课':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      case '请假':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  // 过滤记录
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.studentName?.includes(searchTerm) ||
      record.teacherName?.includes(searchTerm) ||
      record.courseName?.includes(searchTerm) ||
      record.recordId?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || record.attendanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计数据
  const stats = {
    total: records.length,
    scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
    completed: records.filter(r => r.attendanceStatus === '已上课').length,
    thisMonth: records.filter(r => {
      const date = new Date(r.classDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">上课记录</h1>
          <p className="text-gray-500 mt-1">记录学生上课情况，自动更新学习进度</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建记录
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>创建上课记录</DialogTitle>
              <DialogDescription>
                记录本次上课的详细信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">日期</Label>
                <Input
                  type="date"
                  value={newRecord.classDate}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const dayOfWeek = date.getDay();
                    const weekDayMap: Record<number, string> = {
                      0: '周日', 1: '周一', 2: '周二', 3: '周三',
                      4: '周四', 5: '周五', 6: '周六'
                    };
                    setNewRecord({ 
                      ...newRecord, 
                      classDate: e.target.value,
                      weekDay: weekDayMap[dayOfWeek]
                    });
                  }}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">时间段</Label>
                <Select
                  value={newRecord.startTime}
                  onValueChange={(value) => setNewRecord({ ...newRecord, startTime: value })}
                >
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">时长(分钟)</Label>
                <Input
                  type="number"
                  step={30}
                  value={newRecord.actualDuration}
                  onChange={(e) => setNewRecord({ ...newRecord, actualDuration: parseInt(e.target.value) || 120 })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">学生ID</Label>
                <Input
                  placeholder="学生ID"
                  value={newRecord.studentId}
                  onChange={(e) => setNewRecord({ ...newRecord, studentId: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">导师ID</Label>
                <Input
                  placeholder="导师ID"
                  value={newRecord.teacherId}
                  onChange={(e) => setNewRecord({ ...newRecord, teacherId: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">课程ID</Label>
                <Input
                  placeholder="课程ID"
                  value={newRecord.courseId}
                  onChange={(e) => setNewRecord({ ...newRecord, courseId: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="text-right pt-2">课程内容</Label>
                <Textarea
                  placeholder="本次课程的主要内容..."
                  value={newRecord.contentSummary}
                  onChange={(e) => setNewRecord({ ...newRecord, contentSummary: e.target.value })}
                  className="col-span-2 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">教学方式</Label>
                <Input
                  placeholder="如：一对一线上指导"
                  value={newRecord.teachingMethod}
                  onChange={(e) => setNewRecord({ ...newRecord, teachingMethod: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="text-right pt-2">学生表现</Label>
                <Textarea
                  placeholder="学生的课堂表现..."
                  value={newRecord.studentPerformance}
                  onChange={(e) => setNewRecord({ ...newRecord, studentPerformance: e.target.value })}
                  className="col-span-2 min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="text-right pt-2">课后作业</Label>
                <Textarea
                  placeholder="布置的课后作业..."
                  value={newRecord.homework}
                  onChange={(e) => setNewRecord({ ...newRecord, homework: e.target.value })}
                  className="col-span-2 min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="text-right pt-2">下次计划</Label>
                <Textarea
                  placeholder="下次课的计划..."
                  value={newRecord.nextPlan}
                  onChange={(e) => setNewRecord({ ...newRecord, nextPlan: e.target.value })}
                  className="col-span-2 min-h-[60px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreateRecord}>创建记录</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总记录数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">本月上课</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待上课</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>记录列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生/导师/课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="已排课">已排课</SelectItem>
                  <SelectItem value="已上课">已上课</SelectItem>
                  <SelectItem value="缺课">缺课</SelectItem>
                  <SelectItem value="请假">请假</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无上课记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录编号</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>导师</TableHead>
                  <TableHead>课程</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.recordId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{record.classDate}</span>
                        <span className="text-gray-400">({record.weekDay})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {record.studentName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {record.teacherName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        {record.courseName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {record.actualDuration}分钟
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.attendanceStatus)}
                        <Badge className={getStatusColor(record.attendanceStatus)}>
                          {record.attendanceStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecord(record);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {record.attendanceStatus === '已排课' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(record.id, '已上课')}
                            >
                              完成
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              上课记录详情
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">记录编号</span>
                <span className="font-medium">{selectedRecord.recordId}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-500 text-sm">学生</span>
                  <div className="font-medium">{selectedRecord.studentName}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">导师</span>
                  <div className="font-medium">{selectedRecord.teacherName}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">课程</span>
                  <div className="font-medium">{selectedRecord.courseName}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">状态</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedRecord.attendanceStatus)}
                    <Badge className={getStatusColor(selectedRecord.attendanceStatus)}>
                      {selectedRecord.attendanceStatus}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">日期</span>
                  <div className="font-medium">{selectedRecord.classDate} ({selectedRecord.weekDay})</div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">时间</span>
                  <div className="font-medium">{selectedRecord.startTime} · {selectedRecord.actualDuration}分钟</div>
                </div>
              </div>

              {selectedRecord.contentSummary && (
                <div>
                  <span className="text-gray-500 text-sm">课程内容</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedRecord.contentSummary}
                  </div>
                </div>
              )}

              {selectedRecord.teachingMethod && (
                <div>
                  <span className="text-gray-500 text-sm">教学方式</span>
                  <div className="mt-1">{selectedRecord.teachingMethod}</div>
                </div>
              )}

              {selectedRecord.studentPerformance && (
                <div>
                  <span className="text-gray-500 text-sm">学生表现</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedRecord.studentPerformance}
                  </div>
                </div>
              )}

              {selectedRecord.homework && (
                <div>
                  <span className="text-gray-500 text-sm">课后作业</span>
                  <div className="mt-1 p-3 bg-orange-50 rounded-lg text-sm">
                    {selectedRecord.homework}
                  </div>
                </div>
              )}

              {selectedRecord.nextPlan && (
                <div>
                  <span className="text-gray-500 text-sm">下次计划</span>
                  <div className="mt-1 p-3 bg-blue-50 rounded-lg text-sm">
                    {selectedRecord.nextPlan}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                {selectedRecord.attendanceStatus === '已排课' && (
                  <>
                    <Button variant="outline" onClick={() => handleUpdateStatus(selectedRecord.id, '请假')}>
                      请假
                    </Button>
                    <Button variant="destructive" onClick={() => handleUpdateStatus(selectedRecord.id, '缺课')}>
                      缺课
                    </Button>
                    <Button onClick={() => handleUpdateStatus(selectedRecord.id, '已上课')}>
                      确认完成
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// 选课指导课状态配置
const STATUS_CONFIG = {
  '已预约': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  '进行中': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Play },
  '已完成': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  '已取消': { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
};

interface Consultation {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  studentSid?: string;
  teacherId: string;
  consultantName: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  attendanceStatus: string;
  contentSummary?: string;
  teachingMethod?: string;
  hasSelectionForm: boolean;
  selectionFormId?: string;
  selectionFormStatus?: string;
  createdAt: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  major?: string;
}

interface Consultant {
  id: string;
  name: string;
  role: string;
}

export default function ConsultationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 新建表单
  const [form, setForm] = useState({
    studentId: '',
    consultantId: '',
    scheduledDate: '',
    scheduledTime: '10:00',
    meetingType: '线上',
    meetingLink: '',
    notes: '',
  });

  useEffect(() => {
    fetchConsultations();
    fetchStudents();
    fetchConsultants();
  }, [statusFilter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }

      const res = await fetch(`/api/consultations?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setConsultations(data.data || []);
      } else {
        // 如果API失败，使用模拟数据
        setConsultations(getMockConsultations());
      }
    } catch (error) {
      console.error('获取选课指导课列表失败:', error);
      setConsultations(getMockConsultations());
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students?limit=100');
      const data = await res.json();
      setStudents(data.students || data || []);
    } catch (error) {
      console.error('获取学生列表失败:', error);
    }
  };

  const fetchConsultants = async () => {
    try {
      const res = await fetch('/api/users?role=规划顾问');
      const data = await res.json();
      setConsultants(data.users || []);
    } catch (error) {
      console.error('获取顾问列表失败:', error);
    }
  };

  const getMockConsultations = (): Consultation[] => {
    return [
      {
        id: '1',
        recordId: 'CG001',
        studentId: 's1',
        studentName: '张同学',
        studentSid: 'STU001',
        teacherId: 'c1',
        consultantName: '王顾问',
        classDate: new Date().toISOString().split('T')[0],
        weekDay: '周三',
        startTime: '10:00',
        attendanceStatus: '已预约',
        teachingMethod: '线上',
        hasSelectionForm: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        recordId: 'CG002',
        studentId: 's2',
        studentName: '李同学',
        studentSid: 'STU002',
        teacherId: 'c1',
        consultantName: '王顾问',
        classDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        weekDay: '周二',
        startTime: '15:00',
        attendanceStatus: '已完成',
        teachingMethod: '线上',
        hasSelectionForm: true,
        selectionFormId: 'sf1',
        selectionFormStatus: '执行中',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  };

  const handleCreate = async () => {
    if (!form.studentId || !form.consultantId || !form.scheduledDate) {
      toast({
        title: '请填写完整',
        description: '学生、顾问和日期为必填项',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: '创建成功',
          description: '选课指导课已预约',
        });
        setDialogOpen(false);
        resetForm();
        fetchConsultations();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      studentId: '',
      consultantId: '',
      scheduledDate: '',
      scheduledTime: '10:00',
      meetingType: '线上',
      meetingLink: '',
      notes: '',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['已预约'];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  // 统计数据
  const stats = {
    total: consultations.length,
    scheduled: consultations.filter(c => c.attendanceStatus === '已预约').length,
    completed: consultations.filter(c => c.attendanceStatus === '已完成').length,
    pendingForms: consultations.filter(c => c.attendanceStatus === '已完成' && !c.hasSelectionForm).length,
  };

  // 时间段选项
  const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选课指导课</h1>
          <p className="text-gray-500 mt-1">规划顾问与学生的一对一选课指导</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              预约选课指导
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>预约选课指导课</DialogTitle>
              <DialogDescription>
                为学生预约一次选课指导咨询
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>学生 *</Label>
                <Select
                  value={form.studentId}
                  onValueChange={(v) => setForm({ ...form, studentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学生" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.studentId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>规划顾问 *</Label>
                <Select
                  value={form.consultantId}
                  onValueChange={(v) => setForm({ ...form, consultantId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择顾问" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.name}
                      </SelectItem>
                    ))}
                    {consultants.length === 0 && (
                      <SelectItem value="default">默认顾问</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>日期 *</Label>
                  <Input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>时间</Label>
                  <Select
                    value={form.scheduledTime}
                    onValueChange={(v) => setForm({ ...form, scheduledTime: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>会议方式</Label>
                <Select
                  value={form.meetingType}
                  onValueChange={(v) => setForm({ ...form, meetingType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="线上">线上会议</SelectItem>
                    <SelectItem value="线下">线下见面</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.meetingType === '线上' && (
                <div className="space-y-2">
                  <Label>会议链接</Label>
                  <Input
                    value={form.meetingLink}
                    onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                    placeholder="可选：腾讯会议/Zoom链接"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="学生特点、关注方向等"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={submitting}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                确认预约
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600">总计</p>
                <p className="text-2xl font-bold text-orange-700">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-600">待进行</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">已完成</p>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600">待建选课单</p>
                <p className="text-2xl font-bold text-red-700">{stats.pendingForms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConsultations()}
                  placeholder="搜索学生姓名..."
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="已预约">已预约</SelectItem>
                <SelectItem value="进行中">进行中</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
                <SelectItem value="已取消">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 指导课列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无选课指导课记录</p>
            <p className="text-sm mt-1">点击「预约选课指导」创建新的指导课</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation, index) => (
            <motion.div
              key={consultation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/consultations/${consultation.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* 状态图标 */}
                        <div className={cn(
                          'w-12 h-12 rounded-lg flex items-center justify-center',
                          consultation.attendanceStatus === '已完成' ? 'bg-green-100' :
                          consultation.attendanceStatus === '进行中' ? 'bg-blue-100' :
                          consultation.attendanceStatus === '已取消' ? 'bg-gray-100' :
                          'bg-yellow-100'
                        )}>
                          {consultation.attendanceStatus === '已完成' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : consultation.attendanceStatus === '进行中' ? (
                            <Play className="w-6 h-6 text-blue-600" />
                          ) : consultation.attendanceStatus === '已取消' ? (
                            <XCircle className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600" />
                          )}
                        </div>

                        {/* 信息 */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-lg">{consultation.studentName}</span>
                            {consultation.studentSid && (
                              <span className="text-sm text-gray-400">({consultation.studentSid})</span>
                            )}
                            {getStatusBadge(consultation.attendanceStatus)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(consultation.classDate)} {consultation.weekDay}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {consultation.startTime}
                            </span>
                            {consultation.teachingMethod && (
                              <span className="flex items-center gap-1">
                                {consultation.teachingMethod === '线上' ? (
                                  <Video className="w-4 h-4" />
                                ) : (
                                  <MapPin className="w-4 h-4" />
                                )}
                                {consultation.teachingMethod}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 右侧信息 */}
                      <div className="flex items-center gap-4">
                        {/* 选课单状态 */}
                        {consultation.attendanceStatus === '已完成' && (
                          consultation.hasSelectionForm ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <FileText className="w-3 h-3 mr-1" />
                              已建选课单
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              待建选课单
                            </Badge>
                          )
                        )}

                        <span className="text-sm text-gray-400">
                          {consultation.consultantName}
                        </span>

                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

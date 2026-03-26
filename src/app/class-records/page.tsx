'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Users,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List,
  BarChart3,
  Filter,
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser, usePermissions } from '@/hooks/use-permissions';
import { motion, AnimatePresence } from 'framer-motion';

// 视图类型
type ViewType = 'byTeacher' | 'byStudent' | 'timeline' | 'all';

interface ClassRecord {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  courseCategory?: string;
  courseContentDetail?: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime?: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod?: string;
  studentPerformance?: string;
  attendanceStatus: string;
  homeworkAssigned?: string;
  homeworkDeadline?: string;
  homeworkCompletionRate?: number;
  lastHomeworkQuality?: string;
  nextClassPlan?: string;
  teacherFeedback?: string;
  studentFeedback?: string;
  projectPhase?: string;
  phaseContent?: string;
  attachments?: string[];
  pdfUrl?: string;
  studentSignature?: string;
  signatureTime?: string;
  signToken?: string;
  createdAt: string;
}

// 分组数据类型
interface GroupedRecords {
  key: string;
  label: string;
  records: ClassRecord[];
  stats: {
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
  };
}

export default function ClassRecordsPage() {
  const { user } = useUser();
  const { hasPermission, isRoleAtLeast } = usePermissions();
  
  // 角色判断
  const isTeacher = user?.role === '全职导师' || user?.role === '兼职导师';
  const isConsultant = user?.role === '规划顾问';
  const isAdmin = user?.role === '管理员';
  
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewType, setViewType] = useState<ViewType>('byStudent');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200); // 加载更多数据用于分组
  const [totalRecords, setTotalRecords] = useState(0);
  
  const { toast } = useToast();

  // 根据用户角色设置默认视图
  useEffect(() => {
    if (isTeacher) {
      setViewType('byStudent'); // 导师默认按学生分组
    } else if (isConsultant) {
      setViewType('byStudent'); // 规划顾问默认按学生分组
    } else if (isAdmin) {
      setViewType('byTeacher'); // 管理员默认按导师分组
    }
  }, [isTeacher, isConsultant, isAdmin]);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, pageSize, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        // 传递用户角色和名字用于数据过滤
        ...(user?.role && { userRole: user.role }),
        ...(user?.name && { userName: user.name }),
      });
      const response = await fetch(`/api/class-records?${params}`, { credentials: 'include' });
      const data = await response.json();
      setRecords(data.records || []);
      if (data.pagination) {
        setTotalRecords(data.pagination.total);
      }
    } catch (error) {
      console.error('获取上课记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据视图类型分组数据
  const groupedData = useMemo(() => {
    if (!records.length) return [];

    const groups: GroupedRecords[] = [];
    
    if (viewType === 'byTeacher') {
      // 按导师分组
      const teacherMap = new Map<string, ClassRecord[]>();
      records.forEach(record => {
        const key = record.teacherName || '未知导师';
        if (!teacherMap.has(key)) {
          teacherMap.set(key, []);
        }
        teacherMap.get(key)!.push(record);
      });
      
      teacherMap.forEach((records, key) => {
        groups.push({
          key,
          label: key,
          records: records.sort((a, b) => new Date(b.classDate).getTime() - new Date(a.classDate).getTime()),
          stats: {
            total: records.length,
            completed: records.filter(r => r.attendanceStatus === '已完成').length,
            scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
            cancelled: records.filter(r => ['已取消', '学生缺席'].includes(r.attendanceStatus)).length,
          },
        });
      });
    } else if (viewType === 'byStudent') {
      // 按学生分组
      const studentMap = new Map<string, ClassRecord[]>();
      records.forEach(record => {
        const key = record.studentName || '未知学生';
        if (!studentMap.has(key)) {
          studentMap.set(key, []);
        }
        studentMap.get(key)!.push(record);
      });
      
      studentMap.forEach((records, key) => {
        groups.push({
          key,
          label: key,
          records: records.sort((a, b) => new Date(b.classDate).getTime() - new Date(a.classDate).getTime()),
          stats: {
            total: records.length,
            completed: records.filter(r => r.attendanceStatus === '已完成').length,
            scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
            cancelled: records.filter(r => ['已取消', '学生缺席'].includes(r.attendanceStatus)).length,
          },
        });
      });
    } else if (viewType === 'timeline') {
      // 按月份分组
      const monthMap = new Map<string, ClassRecord[]>();
      records.forEach(record => {
        const date = new Date(record.classDate);
        const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        if (!monthMap.has(key)) {
          monthMap.set(key, []);
        }
        monthMap.get(key)!.push(record);
      });
      
      // 按时间倒序排列
      const sortedKeys = Array.from(monthMap.keys()).sort((a, b) => {
        const [aYear, aMonth] = a.match(/\d+/g)!.map(Number);
        const [bYear, bMonth] = b.match(/\d+/g)!.map(Number);
        return (bYear * 12 + bMonth) - (aYear * 12 + aMonth);
      });
      
      sortedKeys.forEach(key => {
        groups.push({
          key,
          label: key,
          records: monthMap.get(key)!,
          stats: {
            total: monthMap.get(key)!.length,
            completed: monthMap.get(key)!.filter(r => r.attendanceStatus === '已完成').length,
            scheduled: monthMap.get(key)!.filter(r => r.attendanceStatus === '已排课').length,
            cancelled: monthMap.get(key)!.filter(r => ['已取消', '学生缺席'].includes(r.attendanceStatus)).length,
          },
        });
      });
    } else {
      // 全部视图
      groups.push({
        key: 'all',
        label: '全部记录',
        records: records.sort((a, b) => new Date(b.classDate).getTime() - new Date(a.classDate).getTime()),
        stats: {
          total: records.length,
          completed: records.filter(r => r.attendanceStatus === '已完成').length,
          scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
          cancelled: records.filter(r => ['已取消', '学生缺席'].includes(r.attendanceStatus)).length,
        },
      });
    }
    
    return groups;
  }, [records, viewType]);

  // 统计数据
  const stats = useMemo(() => ({
    total: records.length,
    completed: records.filter(r => r.attendanceStatus === '已完成').length,
    scheduled: records.filter(r => r.attendanceStatus === '已排课').length,
    cancelled: records.filter(r => ['已取消', '学生缺席'].includes(r.attendanceStatus)).length,
  }), [records]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      '已完成': 'bg-green-100 text-green-700 border-green-200',
      '已排课': 'bg-blue-100 text-blue-700 border-blue-200',
      '已取消': 'bg-gray-100 text-gray-600 border-gray-200',
      '学生缺席': 'bg-red-100 text-red-700 border-red-200',
      '补课': 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  const getRoleTitle = () => {
    if (isTeacher) return '我的上课记录';
    if (isConsultant) return '学生上课记录';
    if (isAdmin) return '上课记录管理';
    return '上课记录';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getRoleTitle()}</h1>
          <p className="text-gray-500 mt-1">
            {isTeacher && '查看和管理您的上课记录'}
            {isConsultant && '查看和管理学生的上课记录'}
            {isAdmin && '全局上课记录管理和统计'}
          </p>
        </div>
        {(isAdmin || isConsultant) && (
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            新建记录
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">总记录</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">已完成</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">已排课</div>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">已取消</div>
            <div className="text-2xl font-bold text-gray-500">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学生、导师或课程..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 状态筛选 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
                <SelectItem value="已排课">已排课</SelectItem>
                <SelectItem value="已取消">已取消</SelectItem>
              </SelectContent>
            </Select>

            {/* 视图切换 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewType === 'byStudent' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('byStudent')}
                className={viewType === 'byStudent' ? 'bg-white shadow-sm' : ''}
              >
                <Users className="h-4 w-4 mr-1" />
                按学生
              </Button>
              <Button
                variant={viewType === 'byTeacher' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('byTeacher')}
                className={viewType === 'byTeacher' ? 'bg-white shadow-sm' : ''}
              >
                <GraduationCap className="h-4 w-4 mr-1" />
                按导师
              </Button>
              <Button
                variant={viewType === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('timeline')}
                className={viewType === 'timeline' ? 'bg-white shadow-sm' : ''}
              >
                <Calendar className="h-4 w-4 mr-1" />
                时间线
              </Button>
              <Button
                variant={viewType === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('all')}
                className={viewType === 'all' ? 'bg-white shadow-sm' : ''}
              >
                <List className="h-4 w-4 mr-1" />
                全部
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分组列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : groupedData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无上课记录</div>
      ) : (
        <div className="space-y-4">
          {groupedData.map((group) => (
            <Card key={group.key} className="overflow-hidden">
              {/* 分组头部 */}
              <div 
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleGroup(group.key)}
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(group.key) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">{group.label}</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    {group.stats.total} 条记录
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">✓ {group.stats.completed}</span>
                  <span className="text-blue-600">○ {group.stats.scheduled}</span>
                  <span className="text-gray-400">✕ {group.stats.cancelled}</span>
                </div>
              </div>

              {/* 分组内容 */}
              <AnimatePresence>
                {expandedGroups.has(group.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>记录编号</TableHead>
                          {viewType !== 'byStudent' && <TableHead>学生</TableHead>}
                          {viewType !== 'byTeacher' && <TableHead>导师</TableHead>}
                          <TableHead>课程</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>时长</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.records.map((record) => (
                          <TableRow key={record.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{record.recordId}</TableCell>
                            {viewType !== 'byStudent' && (
                              <TableCell>{record.studentName || '-'}</TableCell>
                            )}
                            {viewType !== 'byTeacher' && (
                              <TableCell>{record.teacherName || '-'}</TableCell>
                            )}
                            <TableCell>
                              <div>
                                <div className="font-medium">{record.courseCategory || record.courseName || '-'}</div>
                                {record.courseContentDetail && (
                                  <div className="text-sm text-gray-500">{record.courseContentDetail}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{record.classDate}</div>
                                <div className="text-sm text-gray-500">{record.weekDay} {record.startTime}</div>
                              </div>
                            </TableCell>
                            <TableCell>{record.actualDuration}分钟</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(record.attendanceStatus)}>
                                {record.attendanceStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
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
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalRecords > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">
            共 {totalRecords} 条记录
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded text-sm font-medium">
              {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={records.length < pageSize}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>上课记录详情</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">记录编号</Label>
                  <div className="font-medium">{selectedRecord.recordId}</div>
                </div>
                <div>
                  <Label className="text-gray-500">状态</Label>
                  <div>
                    <Badge className={getStatusBadge(selectedRecord.attendanceStatus)}>
                      {selectedRecord.attendanceStatus}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">学生</Label>
                  <div className="font-medium">{selectedRecord.studentName || '-'}</div>
                </div>
                <div>
                  <Label className="text-gray-500">导师</Label>
                  <div className="font-medium">{selectedRecord.teacherName || '-'}</div>
                </div>
                <div>
                  <Label className="text-gray-500">课程类别</Label>
                  <div>{selectedRecord.courseCategory || '-'}</div>
                </div>
                <div>
                  <Label className="text-gray-500">课程内容</Label>
                  <div>{selectedRecord.courseContentDetail || '-'}</div>
                </div>
                <div>
                  <Label className="text-gray-500">上课日期</Label>
                  <div>{selectedRecord.classDate} {selectedRecord.weekDay}</div>
                </div>
                <div>
                  <Label className="text-gray-500">上课时间</Label>
                  <div>{selectedRecord.startTime} - {selectedRecord.endTime || '-'} ({selectedRecord.actualDuration}分钟)</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-gray-500">授课内容摘要</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {selectedRecord.contentSummary || '无'}
                </div>
              </div>
              
              {selectedRecord.homeworkAssigned && (
                <div>
                  <Label className="text-gray-500">课后作业</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedRecord.homeworkAssigned}
                  </div>
                </div>
              )}
              
              {selectedRecord.teacherFeedback && (
                <div>
                  <Label className="text-gray-500">导师反馈</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedRecord.teacherFeedback}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

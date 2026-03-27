'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  ArrowLeft, 
  FileText, 
  Plus, 
  Search, 
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ClassRecord {
  id: string;
  recordId: string;
  scheduleId: string | null;
  classDate: Date;
  weekDay: string;
  startTime: string;
  endTime: string | null;
  actualDuration: number;
  attendanceStatus: string;
  contentSummary: string;
  studentPerformance: string | null;
  homeworkAssigned: string | null;
  nextClassPlan: string | null;
  homeworkScore: number | null;
  isSettled: boolean;
  createdAt: Date;
  student: {
    id: string;
    studentId: string;
    name: string;
    major: string | null;
  } | null;
  course: {
    id: string;
    courseId: string;
    name: string;
    category: string;
  } | null;
  teacher: {
    id: string;
    teacherId: string;
    name: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TeacherRecordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // 获取当前用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== '导师') {
          toast({
            title: '权限不足',
            description: '只有导师可以访问此页面',
            variant: 'destructive',
          });
          router.push('/');
          return;
        }
        if (data.user.teacher) {
          setTeacherId(data.user.teacher.id);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        router.push('/login');
      }
    };
    fetchUser();
  }, [router, toast]);

  // 获取上课记录
  useEffect(() => {
    if (!teacherId) return;
    fetchRecords();
  }, [teacherId, pagination.page, statusFilter, dateFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        teacherId: teacherId!,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (dateFilter) {
        params.append('startDate', dateFilter);
        params.append('endDate', dateFilter);
      }

      const response = await fetch(`/api/teacher/records?${params}`);
      
      if (!response.ok) throw new Error('获取上课记录失败');
      
      const result = await response.json();
      
      if (result.success) {
        setRecords(result.data.records);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('获取上课记录失败:', error);
      toast({
        title: '获取失败',
        description: '无法加载上课记录',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // 搜索时重置到第一页
    setPagination({ ...pagination, page: 1 });
    fetchRecords();
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('确定要删除这条上课记录吗？')) return;
    
    try {
      const response = await fetch(`/api/teacher/records/${recordId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '删除成功',
          description: '上课记录已删除',
        });
        fetchRecords();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '删除失败，请重试',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (record: ClassRecord) => {
    switch (record.attendanceStatus) {
      case '已完成':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            已完成
          </Badge>
        );
      case '已取消':
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            已取消
          </Badge>
        );
      case '学生缺席':
        return (
          <Badge variant="outline" className="text-red-500 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            学生缺席
          </Badge>
        );
      case '补课':
        return (
          <Badge className="bg-amber-500 text-white">
            补课
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {record.attendanceStatus}
          </Badge>
        );
    }
  };

  const getSettlementBadge = (record: ClassRecord) => {
    if (record.isSettled) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300">
          已结课
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300">
        待结课
      </Badge>
    );
  };

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  上课记录
                </h1>
                <p className="text-xs text-muted-foreground">管理和查看上课记录</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
                onClick={() => router.push('/teacher/records/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                新建记录
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 筛选区域 */}
        <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">状态筛选</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-orange-200">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="已完成">已完成</SelectItem>
                    <SelectItem value="学生缺席">学生缺席</SelectItem>
                    <SelectItem value="已取消">已取消</SelectItem>
                    <SelectItem value="补课">补课</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">日期筛选</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-orange-200"
                />
              </div>

              <Button
                variant="outline"
                className="border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                onClick={handleSearch}
              >
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>

              <Button
                variant="outline"
                className="border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('');
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 记录列表 */}
        <Card className="border-2 border-orange-100 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">暂无上课记录</p>
                <Button
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  onClick={() => router.push('/teacher/records/new')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建记录
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-orange-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-orange-50/50">
                      <TableRow>
                        <TableHead className="font-medium">上课日期</TableHead>
                        <TableHead>学生</TableHead>
                        <TableHead>课程</TableHead>
                        <TableHead>时间段</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>结课</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id} className="hover:bg-orange-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-orange-500" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(record.classDate), 'yyyy-MM-dd')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {record.weekDay}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {record.student?.name || '未知'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {record.student?.studentId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium truncate max-w-[150px]">
                                  {record.course?.name || '未知'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {record.course?.category}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">{record.startTime}</span>
                              {record.endTime && (
                                <>
                                  <span className="text-muted-foreground">-</span>
                                  <span className="text-sm">{record.endTime}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(record)}</TableCell>
                          <TableCell>{getSettlementBadge(record)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                                onClick={() => router.push(`/teacher/records/${record.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                                onClick={() => router.push(`/teacher/records/${record.id}/edit`)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                onClick={() => handleDelete(record.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => pagination.page > 1 && setPagination({ ...pagination, page: pagination.page - 1 })}
                            className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-orange-100'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => setPagination({ ...pagination, page: pageNum })}
                                isActive={pageNum === pagination.page}
                                className={`cursor-pointer ${pageNum === pagination.page ? 'bg-orange-500 text-white' : 'hover:bg-orange-100'}`}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => pagination.page < pagination.totalPages && setPagination({ ...pagination, page: pagination.page + 1 })}
                            className={pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-orange-100'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground mt-4">
                  共 {pagination.total} 条记录
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/**
 * 结课审核页面组件
 * 
 * 功能模块：
 * 1. 待结课列表 - 显示已完成但未结课的上课记录
 * 2. 待审核列表 - 显示已提交待审核的结课申请
 * 3. 已审核列表 - 显示已审核的结课记录
 * 4. 课酬统计 - 按导师/月份统计课酬
 * 
 * TODO: 等待用户提供结课模板后调整具体UI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// 状态标签颜色映射
const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<string, string> = {
  pending: '待提交',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

// 临时数据类型
interface SettlementRecord {
  id: string;
  settlementId: string;
  teacherName: string;
  studentName: string;
  courseName: string;
  classDate: string;
  teachingHours: number;
  amount: number;
  status: string;
}

// 模拟数据
const mockPendingRecords: SettlementRecord[] = [
  {
    id: '1',
    settlementId: 'SET-001',
    teacherName: '张导师',
    studentName: '李学生',
    courseName: 'AP艺术基础',
    classDate: '2024-01-15',
    teachingHours: 2,
    amount: 300,
    status: 'pending',
  },
  {
    id: '2',
    settlementId: 'SET-002',
    teacherName: '王导师',
    studentName: '赵学生',
    courseName: '作品集指导',
    classDate: '2024-01-16',
    teachingHours: 3,
    amount: 450,
    status: 'submitted',
  },
];

export function SettlementPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: 实际数据获取
  useEffect(() => {
    // fetchSettlements();
  }, [activeTab]);

  // 批量选择
  const toggleSelectAll = () => {
    if (selectedRecords.length === mockPendingRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(mockPendingRecords.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedRecords.includes(id)) {
      setSelectedRecords(selectedRecords.filter(i => i !== id));
    } else {
      setSelectedRecords([...selectedRecords, id]);
    }
  };

  // 批量审核通过
  const handleBatchApprove = async () => {
    if (selectedRecords.length === 0) return;
    
    setIsLoading(true);
    try {
      // TODO: 调用批量审核API
      console.log('批量审核:', selectedRecords);
      setSelectedRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">结课审核</h1>
          <p className="text-muted-foreground mt-1">
            课程结课审核与课酬管理
          </p>
        </div>
        <Button variant="outline">
          导出报表
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待提交</CardDescription>
            <CardTitle className="text-2xl">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              已完成未结课的课程
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待审核</CardDescription>
            <CardTitle className="text-2xl">8</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              已提交等待审核
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>本月已审核</CardDescription>
            <CardTitle className="text-2xl">45</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              审核通过的课程
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>本月课酬</CardDescription>
            <CardTitle className="text-2xl text-orange-600">¥12,500</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              已审核通过的总课酬
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">待结课</TabsTrigger>
          <TabsTrigger value="submitted">待审核</TabsTrigger>
          <TabsTrigger value="approved">已审核</TabsTrigger>
          <TabsTrigger value="salary">课酬统计</TabsTrigger>
        </TabsList>

        {/* 待结课列表 */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>待结课课程</CardTitle>
              <CardDescription>
                已完成但未提交结课申请的课程
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>导师</TableHead>
                    <TableHead>学生</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>上课日期</TableHead>
                    <TableHead>课时</TableHead>
                    <TableHead>预计课酬</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPendingRecords.filter(r => r.status === 'pending').map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.teacherName}</TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.courseName}</TableCell>
                      <TableCell>{record.classDate}</TableCell>
                      <TableCell>{record.teachingHours}h</TableCell>
                      <TableCell>¥{record.amount}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="default">
                          提交结课
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 待审核列表 */}
        <TabsContent value="submitted" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>待审核结课</CardTitle>
                <CardDescription>
                  已提交等待审核的结课申请
                </CardDescription>
              </div>
              {selectedRecords.length > 0 && (
                <Button 
                  onClick={handleBatchApprove}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  批量通过 ({selectedRecords.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input 
                        type="checkbox"
                        checked={selectedRecords.length === mockPendingRecords.filter(r => r.status === 'submitted').length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>导师</TableHead>
                    <TableHead>学生</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>上课日期</TableHead>
                    <TableHead>课时</TableHead>
                    <TableHead>课酬</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPendingRecords.filter(r => r.status === 'submitted').map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <input 
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => toggleSelect(record.id)}
                        />
                      </TableCell>
                      <TableCell>{record.teacherName}</TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.courseName}</TableCell>
                      <TableCell>{record.classDate}</TableCell>
                      <TableCell>{record.teachingHours}h</TableCell>
                      <TableCell>¥{record.amount}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                          通过
                        </Button>
                        <Button size="sm" variant="destructive">
                          拒绝
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 已审核列表 */}
        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>已审核结课</CardTitle>
              <CardDescription>
                已审核通过的结课记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>导师</TableHead>
                    <TableHead>学生</TableHead>
                    <TableHead>课程</TableHead>
                    <TableHead>上课日期</TableHead>
                    <TableHead>课时</TableHead>
                    <TableHead>课酬</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审核时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      暂无已审核记录
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 课酬统计 */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>课酬统计</CardTitle>
              <CardDescription>
                按导师统计本月课酬
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>导师</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>上课次数</TableHead>
                    <TableHead>总课时</TableHead>
                    <TableHead>应发课酬</TableHead>
                    <TableHead>奖金</TableHead>
                    <TableHead>扣款</TableHead>
                    <TableHead>实发课酬</TableHead>
                    <TableHead>支付状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      暂无统计数据
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 课酬统计页面组件
 * 
 * 功能模块：
 * 1. 按月份统计导师课酬
 * 2. 导师课酬排行
 * 3. 课酬趋势图表
 * 4. 导出报表
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Calendar,
} from 'lucide-react';

// 月份选择器
const months = [
  { value: '2024-01', label: '2024年1月' },
  { value: '2024-02', label: '2024年2月' },
  { value: '2024-03', label: '2024年3月' },
  { value: '2024-04', label: '2024年4月' },
  { value: '2024-05', label: '2024年5月' },
  { value: '2024-06', label: '2024年6月' },
];

// 模拟数据
const mockSalaryData = [
  {
    teacherId: '1',
    teacherName: '张导师',
    teacherType: '全职',
    totalClasses: 25,
    totalHours: 50,
    baseSalary: 750000, // 分
    bonusAmount: 50000,
    deductionAmount: 0,
    finalSalary: 800000,
    paymentStatus: 'paid',
  },
  {
    teacherId: '2',
    teacherName: '王导师',
    teacherType: '全职',
    totalClasses: 20,
    totalHours: 40,
    baseSalary: 600000,
    bonusAmount: 30000,
    deductionAmount: 10000,
    finalSalary: 620000,
    paymentStatus: 'pending',
  },
  {
    teacherId: '3',
    teacherName: '李导师',
    teacherType: '兼职',
    totalClasses: 15,
    totalHours: 30,
    baseSalary: 360000,
    bonusAmount: 0,
    deductionAmount: 0,
    finalSalary: 360000,
    paymentStatus: 'pending',
  },
];

// 格式化金额
const formatMoney = (cents: number) => {
  return `¥${(cents / 100).toLocaleString()}`;
};

export function SalaryPage() {
  const [selectedMonth, setSelectedMonth] = useState('2024-06');
  const [isLoading, setIsLoading] = useState(false);

  // 计算汇总数据
  const summary = mockSalaryData.reduce(
    (acc, item) => ({
      totalTeachers: acc.totalTeachers + 1,
      totalClasses: acc.totalClasses + item.totalClasses,
      totalHours: acc.totalHours + item.totalHours,
      totalSalary: acc.totalSalary + item.finalSalary,
      paidAmount: acc.paidAmount + (item.paymentStatus === 'paid' ? item.finalSalary : 0),
      pendingAmount: acc.pendingAmount + (item.paymentStatus === 'pending' ? item.finalSalary : 0),
    }),
    { totalTeachers: 0, totalClasses: 0, totalHours: 0, totalSalary: 0, paidAmount: 0, pendingAmount: 0 }
  );

  // 导出报表
  const handleExport = async () => {
    setIsLoading(true);
    try {
      // TODO: 调用导出API
      console.log('导出报表:', selectedMonth);
      alert('导出功能开发中...');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">课酬统计</h1>
          <p className="text-muted-foreground mt-1">
            导师课酬统计与报表管理
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            导出报表
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>授课导师</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              {summary.totalTeachers} 人
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              本月有课酬的导师数量
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总课时</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              {summary.totalHours} 小时
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              共 {summary.totalClasses} 次课
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已发放</CardDescription>
            <CardTitle className="text-2xl text-green-600 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {formatMoney(summary.paidAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              已完成支付的课酬
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待发放</CardDescription>
            <CardTitle className="text-2xl text-orange-600 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {formatMoney(summary.pendingAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              等待支付的课酬
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 课酬明细表 */}
      <Card>
        <CardHeader>
          <CardTitle>导师课酬明细</CardTitle>
          <CardDescription>
            {selectedMonth} 月各导师课酬统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>导师</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-center">上课次数</TableHead>
                <TableHead className="text-center">总课时</TableHead>
                <TableHead className="text-right">基础课酬</TableHead>
                <TableHead className="text-right">奖金</TableHead>
                <TableHead className="text-right">扣款</TableHead>
                <TableHead className="text-right">实发课酬</TableHead>
                <TableHead className="text-center">支付状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSalaryData.map((item) => (
                <TableRow key={item.teacherId}>
                  <TableCell className="font-medium">{item.teacherName}</TableCell>
                  <TableCell>
                    <Badge variant={item.teacherType === '全职' ? 'default' : 'secondary'}>
                      {item.teacherType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{item.totalClasses}</TableCell>
                  <TableCell className="text-center">{item.totalHours}h</TableCell>
                  <TableCell className="text-right">{formatMoney(item.baseSalary)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {item.bonusAmount > 0 ? `+${formatMoney(item.bonusAmount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {item.deductionAmount > 0 ? `-${formatMoney(item.deductionAmount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">
                    {formatMoney(item.finalSalary)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.paymentStatus === 'paid' ? 'default' : 'outline'}>
                      {item.paymentStatus === 'paid' ? '已发放' : '待发放'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 汇总行 */}
      <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">本月课酬总计</p>
              <p className="text-3xl font-bold text-orange-600">{formatMoney(summary.totalSalary)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                已发放: <span className="text-green-600 font-medium">{formatMoney(summary.paidAmount)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                待发放: <span className="text-orange-600 font-medium">{formatMoney(summary.pendingAmount)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

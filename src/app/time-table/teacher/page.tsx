/**
 * 导师时间表页面
 * 
 * 路由: /time-table/teacher
 */

import { TimeTableEditor } from '@/components/time-table/time-table-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Calendar, Clock, Copy, RefreshCw } from 'lucide-react';

export default async function TeacherTimeTablePage() {
  // 获取当前登录用户
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;
  
  // 未登录重定向到首页
  if (!userId) {
    redirect('/');
  }
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📅 我的时间表</h1>
        <p className="text-muted-foreground mt-1">
          管理您的授课时间，系统将根据您的可用时间进行自动排课
        </p>
      </div>

      {/* 流程说明 */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-semibold text-blue-800">导师时间表管理流程</h3>
              <ol className="mt-2 text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li><strong>设置默认模板</strong> - 填写您每周固定的可用时间</li>
                <li><strong>每周确认</strong> - 确认/调整本周实际可用时间</li>
                <li><strong>临时调整</strong> - 如有请假或加课需求，可临时修改</li>
                <li><strong>系统排课</strong> - 系统自动根据您的可用时间分配课程</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间表标签页 */}
      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            本周时间表
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            默认时间模板
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="template">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                设置默认时间模板
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                这是您每周固定的可用时间，系统每周会自动复制到本周时间表
              </p>
            </CardHeader>
            <CardContent>
              <TimeTableEditor
                mode="teacher"
                userId={userId}
                isWeekly={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weekly">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                本周时间表
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                本周实际可用时间，可在默认模板基础上调整。已排课的时间段显示为蓝色
              </p>
            </CardHeader>
            <CardContent>
              <TimeTableEditor
                mode="teacher"
                userId={userId}
                isWeekly={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 常见问题 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">❓ 常见问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Q: 默认模板和本周时间表有什么区别？</h4>
            <p className="text-muted-foreground mt-1">
              A: 默认模板是您每周固定的可用时间，本周时间表是当前周的实际可用时间。
              您可以从模板快速复制到本周，然后根据实际情况调整。
            </p>
          </div>
          <div>
            <h4 className="font-medium">Q: 蓝色格子是什么意思？</h4>
            <p className="text-muted-foreground mt-1">
              A: 蓝色格子表示该时间段已经有课程安排，无法直接修改。
              如需调整，请先联系规划顾问取消或调整排课。
            </p>
          </div>
          <div>
            <h4 className="font-medium">Q: 临时有事无法上课怎么办？</h4>
            <p className="text-muted-foreground mt-1">
              A: 点击"请假"按钮，选择日期和时间段提交请假申请。
              请提前通知学生和规划顾问。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

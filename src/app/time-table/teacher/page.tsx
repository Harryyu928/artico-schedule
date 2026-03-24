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
          <TabsTrigger value="template">默认时间模板</TabsTrigger>
          <TabsTrigger value="weekly">本周时间表</TabsTrigger>
        </TabsList>
        
        <TabsContent value="template">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">📝 设置默认时间模板</CardTitle>
              <p className="text-sm text-muted-foreground">
                这是您每周固定的可用时间，系统每周会自动复制到本周时间表
              </p>
            </CardHeader>
            <CardContent>
              <TimeTableEditor
                mode="teacher"
                userId={userId}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weekly">
          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">📆 本周时间表</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    本周实际可用时间，可在默认模板基础上调整
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  🔄 从模板复制
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TimeTableEditor
                mode="teacher"
                userId={userId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 本周统计 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">📊 本周统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-500">20</div>
              <div className="text-sm text-muted-foreground">可用时间段</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-500">40</div>
              <div className="text-sm text-muted-foreground">可排课时</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-500">12</div>
              <div className="text-sm text-muted-foreground">已排课时</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-500">28</div>
              <div className="text-sm text-muted-foreground">剩余课时</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">⚡ 快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">📝 请假申请</Button>
            <Button variant="outline">➕ 临时加课</Button>
            <Button variant="outline">📧 批量通知学生</Button>
            <Button variant="outline">📅 导出日程</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

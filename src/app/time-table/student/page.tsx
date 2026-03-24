/**
 * 学生时间表页面
 * 
 * 路由: /time-table/student
 */

import { TimeTableEditor } from '@/components/time-table/time-table-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function StudentTimeTablePage() {
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
          设置您每周可以上课的时间，系统将根据您的时间表为您安排课程
        </p>
      </div>

      {/* 流程说明 */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-semibold text-orange-800">时间表填写流程</h3>
              <ol className="mt-2 text-sm text-orange-700 space-y-1 list-decimal list-inside">
                <li>在下方表格中勾选您每周可以上课的时间段</li>
                <li>点击"保存时间表"保存您的设置</li>
                <li>确认时间表后，规划顾问将为您创建选课单</li>
                <li>系统自动匹配您的时间进行排课</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间表编辑器 */}
      <TimeTableEditor
        mode="student"
        userId={userId}
      />

      {/* 常见问题 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">❓ 常见问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Q: 时间表填写后可以修改吗？</h4>
            <p className="text-muted-foreground mt-1">
              A: 可以随时修改。但已排课的时间段需要先联系规划顾问调整排课。
            </p>
          </div>
          <div>
            <h4 className="font-medium">Q: 为什么需要至少选择5个时间段？</h4>
            <p className="text-muted-foreground mt-1">
              A: 为了增加匹配到导师的概率，建议提供更多可选时间。
            </p>
          </div>
          <div>
            <h4 className="font-medium">Q: 临时有事无法上课怎么办？</h4>
            <p className="text-muted-foreground mt-1">
              A: 请提前联系您的规划顾问，我们会帮您调整课程安排。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

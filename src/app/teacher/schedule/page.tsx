'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function TeacherSchedulePage() {
  const [currentWeek] = useState([
    { day: '周一', date: '03/25', courses: [
      { time: '10:00-12:00', student: '张三', course: 'F-GD 游戏设计基础', status: '待上课' },
      { time: '14:00-16:00', student: '李四', course: 'P-GA 游戏策划进阶', status: '待上课' },
    ]},
    { day: '周二', date: '03/26', courses: [
      { time: '18:00-20:00', student: '王五', course: 'F-AN 游戏动画基础', status: '待上课' },
    ]},
    { day: '周三', date: '03/27', courses: [] },
    { day: '周四', date: '03/28', courses: [
      { time: '13:00-15:00', student: '张三', course: 'F-GD 游戏设计基础', status: '待上课' },
    ]},
    { day: '周五', date: '03/29', courses: [
      { time: '15:00-17:00', student: '李四', course: 'P-GA 游戏策划进阶', status: '待上课' },
      { time: '18:00-20:00', student: '王五', course: 'F-AN 游戏动画基础', status: '待上课' },
    ]},
    { day: '周六', date: '03/30', courses: [] },
    { day: '周日', date: '03/31', courses: [] },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold">我的课程表</h1>
                <p className="text-xs text-muted-foreground">查看本周课程安排</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 周课程表 */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {currentWeek.map((day, index) => (
            <Card key={index} className={`${day.courses.length > 0 ? 'border-2 border-orange-100' : 'border border-gray-200'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{day.day}</span>
                  <span className="text-xs text-muted-foreground">{day.date}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {day.courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">无课程安排</p>
                ) : (
                  day.courses.map((course, courseIndex) => (
                    <div 
                      key={courseIndex}
                      className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-medium text-orange-600">{course.time}</span>
                      </div>
                      <p className="text-sm font-medium">{course.student}</p>
                      <p className="text-xs text-muted-foreground truncate">{course.course}</p>
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-xs bg-orange-100 text-orange-600 border-orange-200"
                      >
                        {course.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 课程统计 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {currentWeek.reduce((sum, day) => sum + day.courses.length, 0)}
                </div>
                <p className="text-sm text-muted-foreground">本周课程总数</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {currentWeek.reduce((sum, day) => sum + day.courses.length, 0) * 2}
                </div>
                <p className="text-sm text-muted-foreground">本周课时数</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">3</div>
                <p className="text-sm text-muted-foreground">学生数量</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

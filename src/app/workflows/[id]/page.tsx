'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardList,
  FileText,
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  User,
  Clock as ClockIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';

// 阶段图标映射
const stageIcons: Record<string, any> = {
  ClipboardList,
  FileText,
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle,
  CheckCircle2,
};

// 状态颜色映射
const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-600 border-blue-200',
  completed: 'bg-green-100 text-green-600 border-green-200',
  skipped: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  blocked: 'bg-red-100 text-red-600 border-red-200',
};

// 状态文本映射
const statusText: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
  blocked: '已阻塞',
};

interface Task {
  id: string;
  name: string;
  status: string;
  assigneeRole?: string;
  assigneeId?: string;
  completedAt?: string;
}

interface Stage {
  id: string;
  stageOrder: number;
  name: string;
  color: string;
  icon: string;
  status: string;
  completedTasks: number;
  totalTasks: number;
  tasks: Task[];
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  entityType: string;
  entityId: string;
  entityName: string;
  currentStageId: string;
  currentStageName: string;
  status: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  startedAt: string;
  dueDate?: string;
  stages: Stage[];
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowInstance();
  }, [params.id]);

  const fetchWorkflowInstance = async () => {
    try {
      const response = await fetch(`/api/workflows/instances/${params.id}`);
      const data = await response.json();
      setInstance(data);
    } catch (error) {
      console.error('获取工作流详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      await fetch(`/api/workflows/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      // 刷新数据
      fetchWorkflowInstance();
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">工作流不存在</div>
      </div>
    );
  }

  const IconComponent = stageIcons[instance.stages.find(s => s.id === instance.currentStageId)?.icon || 'Clock'] || Clock;

  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4">
        <Link href="/workflows">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{instance.entityName}</h1>
          <p className="text-gray-500 mt-1">{instance.workflowName}</p>
        </div>
        <Badge className={statusColors[instance.status]}>
          {statusText[instance.status]}
        </Badge>
      </div>

      {/* 进度概览 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">总体进度</p>
              <div className="flex items-center gap-3">
                <Progress value={instance.progress} className="flex-1 h-3" />
                <span className="text-lg font-semibold">{instance.progress}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">任务完成</p>
              <p className="text-lg font-semibold">
                {instance.completedTasks} / {instance.totalTasks}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">开始时间</p>
              <p className="text-lg font-semibold">
                {new Date(instance.startedAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">截止日期</p>
              <p className="text-lg font-semibold">
                {instance.dueDate ? new Date(instance.dueDate).toLocaleDateString('zh-CN') : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段时间线 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">流程阶段</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="relative">
            {instance.stages.map((stage, index) => {
              const StageIcon = stageIcons[stage.icon] || Clock;
              const isLast = index === instance.stages.length - 1;
              const isCompleted = stage.status === 'completed';
              const isCurrent = stage.id === instance.currentStageId;

              return (
                <div key={stage.id} className="flex gap-4">
                  {/* 左侧图标和连线 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StageIcon className="h-5 w-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-2 ${
                          isCompleted ? 'bg-green-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* 右侧内容 */}
                  <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      <Badge
                        variant="outline"
                        className={statusColors[stage.status]}
                      >
                        {statusText[stage.status]}
                      </Badge>
                      <span className="text-sm text-gray-500 ml-auto">
                        {stage.completedTasks}/{stage.totalTasks} 任务
                      </span>
                    </div>

                    {/* 任务列表 */}
                    {stage.tasks.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {stage.tasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              task.status === 'completed'
                                ? 'bg-green-50 border-green-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <Checkbox
                              checked={task.status === 'completed'}
                              onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                            />
                            <span
                              className={`flex-1 ${
                                task.status === 'completed'
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-700'
                              }`}
                            >
                              {task.name}
                            </span>
                            {task.assigneeRole && (
                              <Badge variant="secondary" className="text-xs">
                                {task.assigneeRole}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/students/${instance.entityId}`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">查看学生详情</p>
                <p className="text-sm text-gray-500">{instance.entityName}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/selection-forms">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">查看选课单</p>
                <p className="text-sm text-gray-500">管理课程规划</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/schedules">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">查看排课</p>
                <p className="text-sm text-gray-500">管理上课安排</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

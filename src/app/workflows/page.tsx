'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardList,
  FileText,
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle,
  CheckCircle2,
  MoreHorizontal,
  ChevronRight,
  Users,
  Filter,
  RefreshCw,
  Eye,
  KanbanSquare,
  ListTodo,
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
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  skipped: 'bg-yellow-100 text-yellow-600',
  blocked: 'bg-red-100 text-red-600',
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

export default function WorkflowsPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterStage, setFilterStage] = useState<string>('all');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows?includeInstances=true');
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('获取工作流失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取看板列数据
  const getKanbanColumns = () => {
    const columns: Record<string, { name: string; color: string; icon: string; items: WorkflowInstance[] }> = {
      pending: { name: '待处理', color: '#6B7280', icon: 'Clock', items: [] },
      in_progress: { name: '进行中', color: '#3B82F6', icon: 'PlayCircle', items: [] },
      completed: { name: '已完成', color: '#10B981', icon: 'CheckCircle', items: [] },
    };

    instances.forEach(instance => {
      if (columns[instance.status]) {
        columns[instance.status].items.push(instance);
      }
    });

    return columns;
  };

  // 看板视图
  const KanbanView = () => {
    const columns = getKanbanColumns();

    return (
      <div className="flex gap-6 overflow-x-auto pb-4">
        {Object.entries(columns).map(([key, column]) => (
          <div key={key} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="font-semibold text-gray-900">{column.name}</h3>
              <Badge variant="secondary" className="ml-auto">
                {column.items.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {column.items.map(instance => (
                <WorkflowCard key={instance.id} instance={instance} />
              ))}
              {column.items.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400">
                  暂无数据
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 工作流卡片
  const WorkflowCard = ({ instance }: { instance: WorkflowInstance }) => (
    <Link href={`/workflows/${instance.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{instance.entityName}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">{instance.workflowName}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  查看详情
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">当前阶段</span>
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: instance.stages.find(s => s.id === instance.currentStageId)?.color,
                  color: instance.stages.find(s => s.id === instance.currentStageId)?.color,
                }}
              >
                {instance.currentStageName}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>进度</span>
                <span>{instance.progress}%</span>
              </div>
              <Progress value={instance.progress} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>任务完成</span>
              <span>{instance.completedTasks}/{instance.totalTasks}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  // 列表视图
  const ListView = () => (
    <div className="space-y-4">
      {instances.map(instance => (
        <Link key={instance.id} href={`/workflows/${instance.id}`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{instance.entityName}</h3>
                    <Badge className={statusColors[instance.status]}>
                      {statusText[instance.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{instance.workflowName}</span>
                    <span>•</span>
                    <span>当前阶段：{instance.currentStageName}</span>
                    <span>•</span>
                    <span>任务：{instance.completedTasks}/{instance.totalTasks}</span>
                  </div>
                </div>
                <div className="w-32">
                  <Progress value={instance.progress} className="h-2" />
                  <p className="text-xs text-gray-500 text-center mt-1">{instance.progress}%</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流管理</h1>
          <p className="text-gray-500 mt-1">跟踪和管理所有业务流程</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchWorkflows}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待处理</p>
                <p className="text-2xl font-bold">
                  {instances.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">进行中</p>
                <p className="text-2xl font-bold">
                  {instances.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold">
                  {instances.filter(i => i.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总流程数</p>
                <p className="text-2xl font-bold">{instances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'kanban' | 'list')}>
          <TabsList>
            <TabsTrigger value="kanban">
              <KanbanSquare className="h-4 w-4 mr-2" />
              看板视图
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListTodo className="h-4 w-4 mr-2" />
              列表视图
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          筛选
        </Button>
      </div>

      {/* 内容区域 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <>
          {viewMode === 'kanban' ? <KanbanView /> : <ListView />}
        </>
      )}
    </div>
  );
}

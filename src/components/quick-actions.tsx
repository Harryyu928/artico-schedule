/**
 * 快捷操作面板组件
 * 提供常用功能的快速入口
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Calendar,
  FileText,
  Clock,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Zap,
  Star,
  History,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, usePermissions } from '@/hooks/use-permissions';
import { Show } from '@/components/permission-guard';

// 快捷操作配置
const quickActions = [
  {
    id: 'add-student',
    label: '添加学生',
    icon: Users,
    href: '/students?action=create',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    permission: 'student:create' as const,
  },
  {
    id: 'add-teacher',
    label: '添加导师',
    icon: GraduationCap,
    href: '/teachers?action=create',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    permission: 'teacher:create' as const,
  },
  {
    id: 'create-selection',
    label: '创建选课单',
    icon: FileText,
    href: '/selection-forms?action=create',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    permission: 'selection:create' as const,
  },
  {
    id: 'auto-schedule',
    label: '自动排课',
    icon: Calendar,
    href: '/schedules?action=auto',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    permission: 'schedule:auto_assign' as const,
  },
  {
    id: 'set-availability',
    label: '设置时间',
    icon: Clock,
    href: '/availability',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    permission: 'schedule:create' as const,
  },
  {
    id: 'review-settlement',
    label: '结课审核',
    icon: CheckCircle2,
    href: '/settlements',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    permission: 'record:update' as const,
  },
];

// 收藏功能（用户自定义）
interface FavoriteItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// 最近访问（模拟数据）
const recentItems = [
  { id: '1', label: '学生：张三', href: '/students/1', type: 'student' },
  { id: '2', label: '选课单 #SF-001', href: '/selection-forms/1', type: 'selection' },
  { id: '3', label: '排课管理', href: '/schedules', type: 'schedule' },
];

// 工作流状态（待办事项）
const pendingTasks = [
  { id: '1', label: '待审核选课单', count: 3, href: '/selection-forms?status=pending' },
  { id: '2', label: '待填写上课记录', count: 5, href: '/class-records?status=pending' },
  { id: '3', label: '待结课课程', count: 8, href: '/settlements?status=pending' },
];

interface QuickActionsPanelProps {
  trigger?: React.ReactNode;
}

export function QuickActionsPanel({ trigger }: QuickActionsPanelProps) {
  const router = useRouter();
  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // 执行快捷操作
  const handleAction = (href: string) => {
    router.push(href);
  };

  // 过滤有权限的操作
  const availableActions = quickActions.filter(action => 
    hasPermission(action.permission)
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">快捷操作</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            快捷操作
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 快捷操作按钮组 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              常用操作
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {availableActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors hover:bg-muted",
                      action.bgColor
                    )}
                  >
                    <Icon className={cn("w-6 h-6", action.color)} />
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* 待办事项 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              待办事项
            </h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleAction(task.href)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-orange-600">{task.count}</span>
                    </div>
                    <span className="text-sm">{task.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* 最近访问 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              最近访问
            </h3>
            <div className="space-y-1">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAction(item.href)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 用户信息 */}
          {user && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
                <Badge variant="outline">
                  {user.role === '管理员' ? '全部权限' : '部分权限'}
                </Badge>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 迷你快捷操作按钮组（放在顶部栏）
export function QuickActionButtons() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const mainActions = [
    {
      icon: Plus,
      label: '新增',
      href: '/students?action=create',
      permission: 'student:create' as const,
    },
    {
      icon: Calendar,
      label: '排课',
      href: '/schedules?action=auto',
      permission: 'schedule:create' as const,
    },
    {
      icon: FileText,
      label: '选课单',
      href: '/selection-forms?action=create',
      permission: 'selection:create' as const,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {mainActions.map((action, index) => {
        const Icon = action.icon;
        if (!hasPermission(action.permission)) return null;
        
        return (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => router.push(action.href)}
            className="hidden sm:flex gap-1"
          >
            <Icon className="w-4 h-4" />
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * 快捷操作组件
 * 
 * 精致简洁的快捷操作卡片
 * - 橙色主题配色
 * - 毛玻璃效果
 * - 简洁优雅的设计
 */

'use client';

import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Clock,
  FileText,
  Settings,
  Workflow,
  TrendingUp,
  Upload,
  Plus,
  Search,
  Bell,
  BarChart3,
  UserCheck,
  Sparkles,
  Zap,
  Target,
  CheckCircle,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 图标映射
const iconMap: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Settings,
  Workflow,
  TrendingUp,
  Upload,
  UserCheck,
  Plus,
  Search,
  Bell,
  BarChart3,
  Sparkles,
  Zap,
  Target,
  CheckCircle,
};

export interface QuickAction {
  label: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'warning' | 'success' | 'danger';
  color?: 'orange' | 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'pink' | 'cyan';
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  title?: string;
  showTitle?: boolean;
}

// 颜色配置 - 使用更柔和的渐变
const colorConfig = {
  orange: 'from-orange-400 to-orange-600',
  amber: 'from-amber-400 to-amber-600',
  blue: 'from-blue-400 to-blue-600',
  green: 'from-green-400 to-green-600',
  purple: 'from-purple-400 to-purple-600',
  red: 'from-red-400 to-red-600',
  pink: 'from-pink-400 to-pink-600',
  cyan: 'from-cyan-400 to-cyan-600',
};

/**
 * 单个快捷操作卡片 - 简洁设计
 */
function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const gradient = colorConfig[color];

  return (
    <Link href={action.href} className="group block">
      <div 
        className={cn(
          "relative flex flex-col items-center justify-center",
          "p-6 rounded-2xl",
          "bg-white",
          "border border-gray-100",
          "transition-all duration-300",
          "hover:shadow-xl hover:shadow-orange-500/10",
          "hover:border-orange-200",
          "hover:-translate-y-1",
        )}
      >
        {/* 图标 */}
        <div 
          className={cn(
            "w-14 h-14 rounded-2xl",
            "bg-gradient-to-br",
            gradient,
            "flex items-center justify-center",
            "shadow-lg shadow-orange-500/20",
            "transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-6",
            "group-hover:shadow-xl"
          )}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* 标题 */}
        <span 
          className={cn(
            "mt-4 font-semibold text-gray-800",
            "group-hover:text-orange-600",
            "transition-colors"
          )}
        >
          {action.label}
        </span>

        {/* 徽章 */}
        {action.badge !== undefined && (
          <span 
            className={cn(
              "absolute top-3 right-3",
              "min-w-[20px] h-5 px-1.5",
              "text-[11px] font-semibold rounded-full",
              "bg-orange-100 text-orange-600"
            )}
          >
            {action.badge}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * 快捷操作网格组件
 */
export function QuickActions({ 
  actions, 
  columns = 4, 
  title = '快捷操作',
  showTitle = true,
}: QuickActionsProps) {
  // 根据列数计算网格类名
  const getGridClass = (cols: number) => {
    const gridMap: Record<number, string> = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 sm:grid-cols-3',
      4: 'grid-cols-2 sm:grid-cols-4',
      5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
      6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
      8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8',
    };
    return gridMap[cols] || gridMap[4];
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      {showTitle && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
      )}

      {/* 操作网格 */}
      <div className={cn("grid gap-4", getGridClass(columns))}>
        {actions.map((action, index) => (
          <QuickActionCard 
            key={`${action.label}-${index}`}
            action={action}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 紧凑型快捷操作栏（横向滚动）
 */
export function QuickActionsBar({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
      {actions.map((action) => {
        const Icon = iconMap[action.icon] || Users;
        const color = action.color || 'orange';
        const gradient = colorConfig[color];
        
        return (
          <Link 
            key={action.label} 
            href={action.href}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                       bg-white border border-gray-100
                       hover:border-orange-200 hover:shadow-md
                       transition-all duration-200 whitespace-nowrap flex-shrink-0"
          >
            <div className={cn(
              "w-7 h-7 rounded-lg bg-gradient-to-br",
              gradient,
              "flex items-center justify-center",
              "transition-transform group-hover:scale-110"
            )}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
              {action.label}
            </span>
            {action.badge !== undefined && (
              <span className="min-w-[18px] h-4 px-1 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-600">
                {action.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * 浮动快捷操作按钮（FAB风格）
 */
export function FloatingQuickAction({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const gradient = colorConfig[color];

  return (
    <Link href={action.href}>
      <button
        className={cn(
          "group relative flex items-center justify-center",
          "w-12 h-12 rounded-xl",
          "bg-gradient-to-br",
          gradient,
          "shadow-lg shadow-orange-500/30",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl"
        )}
      >
        <Icon className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
        
        <span 
          className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded text-xs font-medium",
            "bg-gray-900 text-white opacity-0",
            "group-hover:opacity-100 transition-opacity",
            "whitespace-nowrap pointer-events-none"
          )}
        >
          {action.label}
        </span>
      </button>
    </Link>
  );
}

export default QuickActions;

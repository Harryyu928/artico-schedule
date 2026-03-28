/**
 * 快捷操作组件
 * 
 * 精致的快捷操作卡片，带有毛玻璃效果和流畅动画
 * - 橙色主题配色
 * - 毛玻璃效果 (backdrop-blur)
 * - 高对比度设计
 * - 优雅的hover动画
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
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  CheckCircle,
  LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  variant?: 'default' | 'compact' | 'expanded' | 'horizontal';
}

// 颜色配置
const colorConfig = {
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500',
    light: 'bg-orange-50',
    text: 'text-orange-600',
    ring: 'ring-orange-500/20',
  },
  amber: {
    gradient: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    ring: 'ring-amber-500/20',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-500/20',
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500',
    light: 'bg-green-50',
    text: 'text-green-600',
    ring: 'ring-green-500/20',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    ring: 'ring-purple-500/20',
  },
  red: {
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-600',
    ring: 'ring-red-500/20',
  },
  pink: {
    gradient: 'from-pink-500 to-rose-400',
    bg: 'bg-pink-500',
    light: 'bg-pink-50',
    text: 'text-pink-600',
    ring: 'ring-pink-500/20',
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-500',
    light: 'bg-cyan-50',
    text: 'text-cyan-600',
    ring: 'ring-cyan-500/20',
  },
};

// 徽章配置
const badgeConfig = {
  default: 'bg-gray-100 text-gray-700',
  warning: 'bg-yellow-100 text-yellow-700',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
};

/**
 * 单个快捷操作卡片 - 现代设计
 */
function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const config = colorConfig[color];

  return (
    <Link href={action.href} className="group block">
      <div 
        className={cn(
          // 基础布局
          "relative flex items-center gap-3 p-3 rounded-xl",
          // 毛玻璃背景
          "bg-white/70 backdrop-blur-sm",
          "border border-white/80",
          // 阴影
          "shadow-sm",
          // 过渡动画
          "transition-all duration-300 ease-out",
          // hover效果
          "hover:bg-white hover:shadow-lg",
          "hover:border-orange-200",
          "hover:-translate-y-0.5",
          // 焦点状态
          "focus-visible:ring-2 focus-visible:ring-orange-500",
        )}
      >
        {/* 图标 */}
        <div 
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg",
            "bg-gradient-to-br",
            config.gradient,
            "flex items-center justify-center",
            "shadow-sm",
            "transition-transform duration-300",
            "group-hover:scale-110 group-hover:rotate-3"
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className={cn(
                "font-medium text-sm",
                "text-gray-800",
                "group-hover:text-orange-600",
                "transition-colors"
              )}
            >
              {action.label}
            </span>
            {action.badge !== undefined && (
              <span 
                className={cn(
                  "inline-flex items-center justify-center",
                  "min-w-[18px] h-[18px] px-1",
                  "text-[10px] font-semibold rounded-full",
                  badgeConfig[action.badgeVariant || 'default']
                )}
              >
                {action.badge}
              </span>
            )}
          </div>
          {action.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {action.description}
            </p>
          )}
        </div>

        {/* 箭头 */}
        <ArrowRight 
          className={cn(
            "w-4 h-4 flex-shrink-0",
            "text-gray-300",
            "transition-all duration-300",
            "group-hover:text-orange-500",
            "group-hover:translate-x-0.5"
          )}
        />
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
  variant = 'default'
}: QuickActionsProps) {
  // 根据列数计算网格类名
  const getGridClass = (cols: number) => {
    const gridMap: Record<number, string> = {
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-2 lg:grid-cols-3',
      4: 'sm:grid-cols-2 lg:grid-cols-4',
      5: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
      8: 'sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8',
    };
    return gridMap[cols] || gridMap[4];
  };

  return (
    <div 
      className={cn(
        "relative rounded-2xl overflow-hidden",
        // 毛玻璃背景
        "bg-gradient-to-br from-orange-50/80 via-white/90 to-amber-50/60",
        "backdrop-blur-xl",
        "border border-orange-100/50",
        "shadow-xl shadow-orange-500/5"
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-300/20 rounded-full blur-3xl" />
      </div>

      {/* 标题栏 */}
      {showTitle && (
        <div className="relative px-5 py-4 border-b border-orange-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className={cn(
                "w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500",
                "flex items-center justify-center",
                "shadow-lg shadow-orange-500/30"
              )}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              {title}
            </h3>
          </div>
          <Badge 
            variant="outline" 
            className="border-orange-200 text-orange-600 bg-orange-50/50"
          >
            {actions.length} 项
          </Badge>
        </div>
      )}

      {/* 操作网格 */}
      <div className="relative p-4">
        <div className={cn(
          "grid grid-cols-1 gap-2.5",
          getGridClass(columns)
        )}>
          {actions.map((action, index) => (
            <QuickActionCard 
              key={`${action.label}-${index}`}
              action={action}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 紧凑型快捷操作栏（横向滚动）
 */
export function QuickActionsBar({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="relative">
      {/* 左侧渐变遮罩 */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      {/* 右侧渐变遮罩 */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-2 -mx-2 scrollbar-hide">
        {actions.map((action) => {
          const Icon = iconMap[action.icon] || Users;
          return (
            <Link 
              key={action.label} 
              href={action.href}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-white/80 backdrop-blur-sm border border-orange-100
                         hover:bg-orange-50 hover:border-orange-200
                         transition-all duration-200 whitespace-nowrap
                         shadow-sm hover:shadow-md flex-shrink-0"
            >
              <div className={cn(
                "w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500",
                "flex items-center justify-center",
                "transition-transform group-hover:scale-110"
              )}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
                {action.label}
              </span>
              {action.badge !== undefined && (
                <span 
                  className={cn(
                    "inline-flex items-center justify-center",
                    "min-w-[16px] h-4 px-1",
                    "text-[10px] font-semibold rounded-full",
                    badgeConfig[action.badgeVariant || 'default']
                  )}
                >
                  {action.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 浮动快捷操作按钮（FAB风格）
 */
export function FloatingQuickAction({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const config = colorConfig[color];

  return (
    <Link href={action.href}>
      <button
        className={cn(
          "group relative flex items-center justify-center",
          "w-12 h-12 rounded-xl",
          "bg-gradient-to-br",
          config.gradient,
          "shadow-lg shadow-orange-500/25",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl hover:shadow-orange-500/30"
        )}
      >
        <Icon className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
        
        {/* Tooltip */}
        <span 
          className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded-lg text-xs font-medium",
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

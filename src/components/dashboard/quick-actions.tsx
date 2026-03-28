/**
 * 快捷操作组件
 * 
 * 精致的快捷操作卡片，带有毛玻璃效果和流畅动画
 * - 橙色主题配色
 * - 毛玻璃效果 (backdrop-blur)
 * - 高对比度设计
 * - 优雅的hover动画
 * - 宽松舒适的布局
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
    light: 'bg-orange-50',
  },
  amber: {
    gradient: 'from-amber-500 to-yellow-500',
    light: 'bg-amber-50',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-500',
    light: 'bg-blue-50',
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    light: 'bg-green-50',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    light: 'bg-purple-50',
  },
  red: {
    gradient: 'from-red-500 to-rose-500',
    light: 'bg-red-50',
  },
  pink: {
    gradient: 'from-pink-500 to-rose-400',
    light: 'bg-pink-50',
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    light: 'bg-cyan-50',
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
 * 单个快捷操作卡片 - 宽松设计
 */
function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const config = colorConfig[color];

  return (
    <Link href={action.href} className="group block h-full">
      <div 
        className={cn(
          // 基础布局 - 增加内边距
          "relative flex items-center gap-4 p-4 sm:p-5",
          "rounded-2xl",
          // 毛玻璃背景
          "bg-white/80 backdrop-blur-sm",
          "border border-white",
          // 阴影
          "shadow-sm",
          // 过渡动画
          "transition-all duration-300 ease-out",
          // hover效果
          "hover:bg-white hover:shadow-xl hover:shadow-orange-500/10",
          "hover:border-orange-100",
          "hover:-translate-y-1",
        )}
      >
        {/* 图标 - 增大尺寸 */}
        <div 
          className={cn(
            "flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14",
            "rounded-xl",
            "bg-gradient-to-br",
            config.gradient,
            "flex items-center justify-center",
            "shadow-lg shadow-orange-500/20",
            "transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            "group-hover:shadow-xl group-hover:shadow-orange-500/30"
          )}
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>

        {/* 内容区 - 更宽松 */}
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className={cn(
                "font-semibold text-base sm:text-lg",
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
                  "min-w-[20px] h-5 px-1.5",
                  "text-[11px] font-semibold rounded-full",
                  badgeConfig[action.badgeVariant || 'default']
                )}
              >
                {action.badge}
              </span>
            )}
          </div>
          {action.description && (
            <p className="text-sm text-gray-500 line-clamp-1">
              {action.description}
            </p>
          )}
        </div>

        {/* 箭头 - 增大尺寸 */}
        <ArrowRight 
          className={cn(
            "w-5 h-5 flex-shrink-0",
            "text-gray-200",
            "transition-all duration-300",
            "group-hover:text-orange-500",
            "group-hover:translate-x-1"
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
}: QuickActionsProps) {
  // 根据列数计算网格类名 - 改为更宽松的布局
  const getGridClass = (cols: number) => {
    const gridMap: Record<number, string> = {
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-2 lg:grid-cols-3',
      4: 'sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4',
      5: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6',
      8: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    };
    return gridMap[cols] || gridMap[4];
  };

  return (
    <div 
      className={cn(
        "relative rounded-3xl overflow-hidden",
        // 毛玻璃背景
        "bg-gradient-to-br from-orange-50/90 via-white/95 to-amber-50/70",
        "backdrop-blur-xl",
        "border border-orange-100/60",
        "shadow-2xl shadow-orange-500/5"
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-300/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-amber-300/15 rounded-full blur-3xl" />
      </div>

      {/* 标题栏 - 增加内边距 */}
      {showTitle && (
        <div className="relative px-6 py-5 border-b border-orange-100/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500",
                "flex items-center justify-center",
                "shadow-lg shadow-orange-500/30"
              )}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {title}
            </h3>
          </div>
          <Badge 
            variant="outline" 
            className="border-orange-200 text-orange-600 bg-orange-50/80 px-3 py-1"
          >
            {actions.length} 项
          </Badge>
        </div>
      )}

      {/* 操作网格 - 增加间距 */}
      <div className="relative p-5 sm:p-6">
        <div className={cn(
          "grid grid-cols-1 gap-4 sm:gap-5",
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
    <div className="relative py-2">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1 scrollbar-hide">
        {actions.map((action) => {
          const Icon = iconMap[action.icon] || Users;
          const color = action.color || 'orange';
          const config = colorConfig[color];
          
          return (
            <Link 
              key={action.label} 
              href={action.href}
              className="group flex items-center gap-3 px-5 py-3 rounded-2xl
                         bg-white/80 backdrop-blur-sm border border-orange-100
                         hover:bg-orange-50 hover:border-orange-200
                         transition-all duration-200 whitespace-nowrap
                         shadow-sm hover:shadow-md flex-shrink-0"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg bg-gradient-to-br",
                config.gradient,
                "flex items-center justify-center",
                "shadow-sm",
                "transition-transform group-hover:scale-110"
              )}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
                {action.label}
              </span>
              {action.badge !== undefined && (
                <span 
                  className={cn(
                    "inline-flex items-center justify-center",
                    "min-w-[18px] h-5 px-1.5",
                    "text-[11px] font-semibold rounded-full",
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
          "w-14 h-14 rounded-2xl",
          "bg-gradient-to-br",
          config.gradient,
          "shadow-lg shadow-orange-500/25",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl hover:shadow-orange-500/30"
        )}
      >
        <Icon className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
        
        {/* Tooltip */}
        <span 
          className={cn(
            "absolute -bottom-10 left-1/2 -translate-x-1/2",
            "px-3 py-1.5 rounded-lg text-xs font-medium",
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

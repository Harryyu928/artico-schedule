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
import { Card, CardContent } from '@/components/ui/card';
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
  color?: 'orange' | 'amber' | 'blue' | 'green' | 'purple' | 'red';
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  title?: string;
  showTitle?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
}

// 颜色配置
const colorConfig = {
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-amber-500',
    light: 'bg-orange-100/80',
    text: 'text-orange-600',
    border: 'border-orange-300/50',
    glow: 'shadow-orange-500/20',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500 to-yellow-500',
    light: 'bg-amber-100/80',
    text: 'text-amber-600',
    border: 'border-amber-300/50',
    glow: 'shadow-amber-500/20',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    light: 'bg-blue-100/80',
    text: 'text-blue-600',
    border: 'border-blue-300/50',
    glow: 'shadow-blue-500/20',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    light: 'bg-green-100/80',
    text: 'text-green-600',
    border: 'border-green-300/50',
    glow: 'shadow-green-500/20',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    light: 'bg-purple-100/80',
    text: 'text-purple-600',
    border: 'border-purple-300/50',
    glow: 'shadow-purple-500/20',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-500',
    light: 'bg-red-100/80',
    text: 'text-red-600',
    border: 'border-red-300/50',
    glow: 'shadow-red-500/20',
  },
};

// 徽章配置
const badgeConfig = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  success: 'bg-green-100 text-green-700 border-green-300',
  danger: 'bg-red-100 text-red-700 border-red-300',
};

/**
 * 单个快捷操作卡片
 */
function QuickActionCard({ 
  action, 
  variant = 'default' 
}: { 
  action: QuickAction;
  variant?: 'default' | 'compact' | 'expanded';
}) {
  const Icon = iconMap[action.icon] || Users;
  const color = action.color || 'orange';
  const config = colorConfig[color];
  
  const isExpanded = variant === 'expanded';
  const isCompact = variant === 'compact';

  return (
    <Link href={action.href} className="group block h-full">
      <Card 
        className={cn(
          // 基础样式
          "relative overflow-hidden transition-all duration-300 cursor-pointer h-full",
          "border-2 border-white/50",
          // 毛玻璃效果
          "bg-white/70 backdrop-blur-md",
          // hover效果
          "hover:bg-white/90 hover:border-orange-300/70",
          "hover:shadow-xl hover:shadow-orange-500/10",
          "hover:-translate-y-1",
          // 动画
          "group-hover:scale-[1.02]",
        )}
      >
        {/* 顶部渐变装饰条 */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 h-1 opacity-80",
            "transition-all duration-300",
            "group-hover:h-1.5",
            config.bg
          )} 
        />
        
        {/* 光晕效果 */}
        <div 
          className={cn(
            "absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-0",
            "transition-opacity duration-300",
            "group-hover:opacity-30 blur-2xl",
            config.light
          )} 
        />

        <CardContent 
          className={cn(
            "relative p-4 flex flex-col items-center justify-center text-center",
            isExpanded && "p-6",
            isCompact && "p-3"
          )}
        >
          {/* 图标容器 */}
          <div 
            className={cn(
              "relative rounded-xl flex items-center justify-center mb-3",
              "transition-all duration-300",
              "shadow-lg",
              config.bg,
              config.glow,
              isExpanded ? "w-14 h-14 group-hover:w-16 group-hover:h-16" : "w-11 h-11 group-hover:w-12 group-hover:h-12",
              isCompact && "w-9 h-9 mb-2"
            )}
          >
            <Icon 
              className={cn(
                "text-white transition-transform duration-300",
                "group-hover:scale-110 group-hover:rotate-3",
                isExpanded ? "w-7 h-7" : "w-5 h-5",
                isCompact && "w-4 h-4"
              )} 
            />
            
            {/* 脉冲动画（仅在hover时） */}
            <div 
              className={cn(
                "absolute inset-0 rounded-xl opacity-0",
                "group-hover:animate-ping",
                config.bg
              )} 
              style={{ animationDuration: '1.5s' }}
            />
          </div>

          {/* 标签 */}
          <div 
            className={cn(
              "font-semibold transition-colors duration-200",
              "text-gray-800 group-hover:text-orange-700",
              isExpanded ? "text-base" : "text-sm",
              isCompact && "text-xs"
            )}
          >
            {action.label}
          </div>

          {/* 描述（仅expanded模式） */}
          {isExpanded && action.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
              {action.description}
            </p>
          )}

          {/* 徽章 */}
          {action.badge !== undefined && (
            <Badge 
              variant="outline"
              className={cn(
                "mt-2 text-[10px] px-2 py-0.5 font-medium",
                "transition-all duration-200",
                "group-hover:scale-105",
                badgeConfig[action.badgeVariant || 'default']
              )}
            >
              {action.badge}
            </Badge>
          )}

          {/* 箭头指示器（hover时显示） */}
          <ArrowRight 
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "w-4 h-4 text-orange-400",
              "opacity-0 translate-x-2",
              "transition-all duration-300",
              "group-hover:opacity-100 group-hover:translate-x-0"
            )} 
          />
        </CardContent>
      </Card>
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
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    8: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8',
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden",
        // 毛玻璃效果背景
        "bg-gradient-to-br from-white/80 via-orange-50/50 to-amber-50/30",
        "backdrop-blur-lg",
        "border border-orange-200/50",
        "shadow-xl shadow-orange-500/5"
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 渐变光晕 */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
        
        {/* 网格背景 */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #f97316 1px, transparent 1px),
              linear-gradient(to bottom, #f97316 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {showTitle && (
        <div className="relative px-6 py-4 border-b border-orange-100/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {title}
            </h3>
          </div>
        </div>
      )}

      <div className="relative p-4">
        <div className={cn("grid gap-3", gridCols[columns])}>
          {actions.map((action, index) => (
            <QuickActionCard 
              key={action.label} 
              action={action} 
              variant={variant}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

/**
 * 紧凑型快捷操作栏（用于顶部导航等位置）
 */
export function QuickActionsBar({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {actions.map((action) => {
        const Icon = iconMap[action.icon] || Users;
        return (
          <Link 
            key={action.label} 
            href={action.href}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg
                       bg-white/60 backdrop-blur-sm border border-white/50
                       hover:bg-orange-50/80 hover:border-orange-200
                       transition-all duration-200 whitespace-nowrap
                       shadow-sm hover:shadow-md"
          >
            <Icon className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
              {action.label}
            </span>
            {action.badge !== undefined && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  badgeConfig[action.badgeVariant || 'default']
                )}
              >
                {action.badge}
              </Badge>
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
  const config = colorConfig[color];

  return (
    <Link href={action.href}>
      <button
        className={cn(
          "group relative flex items-center justify-center",
          "w-14 h-14 rounded-2xl",
          "shadow-lg shadow-orange-500/25",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl hover:shadow-orange-500/30",
          config.bg
        )}
      >
        <Icon className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
        
        {/* Tooltip */}
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

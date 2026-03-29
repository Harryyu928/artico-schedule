/**
 * 角色选择组件
 * 
 * 傻瓜式的角色登录引导界面
 * - 大卡片设计，清晰直观
 * - 每个角色有明确的功能说明
 * - 醒目的视觉层次
 */

'use client';

import { useState } from 'react';
import { 
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-permissions';

type UserRole = '管理员' | '规划顾问' | '全职导师' | '兼职导师' | '学生';

interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  features: string[];
  permission: string;
}

const roleConfigs: RoleConfig[] = [
  {
    role: '管理员',
    label: '管理员',
    description: '系统全局管理与配置',
    icon: Shield,
    color: 'red',
    gradient: 'from-red-500 to-rose-600',
    features: ['数据看板', '用户管理', '系统设置', '权限配置'],
    permission: '最高权限',
  },
  {
    role: '规划顾问',
    label: '规划顾问',
    description: '学生管理与选课指导',
    icon: Users,
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    features: ['学生档案', '选课指导', '选课单处理', '预约管理'],
    permission: '管理学生数据',
  },
  {
    role: '全职导师',
    label: '全职导师',
    description: '课程安排与学生指导',
    icon: GraduationCap,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    features: ['课程表', '学生进度', '上课记录', '课酬结算'],
    permission: '管理自己课程',
  },
  {
    role: '兼职导师',
    label: '兼职导师',
    description: '简化版课程管理',
    icon: BookOpen,
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    features: ['我的课程', '上课记录', '时间表'],
    permission: '管理自己课程',
  },
  {
    role: '学生',
    label: '学生',
    description: '个人学习进度查看',
    icon: Target,
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    features: ['我的课程', '学习进度', '课程表', '上课记录'],
    permission: '查看个人数据',
  },
];

export function RoleSelector() {
  const [switching, setSwitching] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const { switchRole } = useUser();

  const handleRoleSwitch = async (role: UserRole) => {
    setSwitching(role);
    try {
      switchRole(role);
      
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', role }),
        credentials: 'include',
      });
      
      window.location.reload();
    } catch (err) {
      console.error('切换角色失败:', err);
      setSwitching(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* 顶部装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
        {/* 标题区 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl shadow-orange-500/30 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            欢迎使用 ARTiCO 教务系统
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            请选择您的角色进入系统，不同角色拥有不同的功能权限
          </p>
        </div>

        {/* 角色选择卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {roleConfigs.map((config) => {
            const Icon = config.icon;
            const isLoading = switching === config.role;
            const isHovered = hoveredRole === config.role;

            return (
              <button
                key={config.role}
                onClick={() => handleRoleSwitch(config.role)}
                disabled={switching !== null}
                onMouseEnter={() => setHoveredRole(config.role)}
                onMouseLeave={() => setHoveredRole(null)}
                className={cn(
                  "group relative text-left",
                  "p-6 sm:p-8 rounded-3xl",
                  "bg-white border-2 border-gray-100",
                  "transition-all duration-300",
                  "hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-500/10",
                  "hover:-translate-y-2",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-4 focus:ring-orange-500/20"
                )}
              >
                {/* 图标 */}
                <div 
                  className={cn(
                    "w-16 h-16 rounded-2xl mb-5",
                    "bg-gradient-to-br",
                    config.gradient,
                    "flex items-center justify-center",
                    "shadow-lg",
                    "transition-transform duration-300",
                    "group-hover:scale-110 group-hover:rotate-3"
                  )}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* 标题 */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                  {config.label}
                </h3>

                {/* 描述 */}
                <p className="text-gray-500 mb-4">
                  {config.description}
                </p>

                {/* 功能列表 */}
                <div className="space-y-2 mb-5">
                  {config.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* 权限标签 */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full",
                    "bg-gray-100 text-gray-600"
                  )}>
                    {config.permission}
                  </span>
                  <ArrowRight 
                    className={cn(
                      "w-5 h-5 text-gray-300",
                      "transition-all duration-300",
                      "group-hover:text-orange-500 group-hover:translate-x-1"
                    )} 
                  />
                </div>

                {/* 加载状态 */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      <span className="font-medium text-gray-700">正在登录...</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            点击角色卡片即可进入对应的仪表盘
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoleSelector;

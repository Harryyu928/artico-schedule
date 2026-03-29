'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Settings,
  Menu,
  X,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Workflow,
  Receipt,
  CheckCircle2,
  Zap,
  History,
  Shield,
  Sparkles,
  Upload,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserProvider, useUser } from '@/hooks/use-permissions';
import { GlobalSearch, SearchButton } from '@/components/global-search';
import { QuickActionsPanel, QuickActionButtons } from '@/components/quick-actions';
import { RoleSwitcher, Show } from '@/components/permission-guard';
import { SyncStatusIndicator } from '@/components/sync-status-indicator';
import type { UserRole } from '@/types/permissions';

/**
 * 系统核心工作流程：
 * 学生/导师 → 课程配置 → 选课指导 → 时间设置 → 自动排课 → 上课记录 → 结课审核 → 课酬统计
 */

// 导航项类型
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  minRole?: UserRole; // 最低角色要求
  permission?: string; // 权限要求
}

interface NavGroup {
  title: string;
  items: NavItem[];
  minRole?: UserRole; // 整个分组的最低角色要求
}

// 导航分组配置（带权限控制）
const navigationGroups: NavGroup[] = [
  {
    title: '概览',
    items: [
      { name: '仪表盘', href: '/', icon: LayoutDashboard, description: '系统数据概览' },
    ]
  },
  {
    title: '工作流',
    items: [
      { name: '工作流管理', href: '/workflows', icon: Workflow, description: '流程跟踪与任务管理' },
    ]
  },
  {
    title: '基础数据',
    items: [
      { name: '学生管理', href: '/students', icon: Users, description: '学生信息管理' },
      { name: '导师管理', href: '/teachers', icon: GraduationCap, description: '导师信息管理' },
      { name: '课程管理', href: '/courses', icon: BookOpen, description: '课程库管理' },
    ]
  },
  {
    title: '选课规划',
    items: [
      { name: '选课单管理', href: '/selection-forms', icon: FileText, description: '选课单生成、签字、归档' },
    ],
    minRole: '规划顾问',
  },
  {
    title: '排课安排',
    items: [
      { name: '学生时间表', href: '/time-table/student', icon: CalendarDays, description: '学生每周可用时间' },
      { name: '导师时间表', href: '/time-table/teacher', icon: CalendarDays, description: '导师每周可用时间' },
      { name: '排课管理', href: '/schedules', icon: Calendar, description: '自动/手动排课' },
    ]
  },
  {
    title: '上课管理',
    items: [
      { name: '上课记录', href: '/class-records', icon: ClipboardList, description: '填写上课记录' },
      { name: '结课审核', href: '/settlements', icon: CheckCircle2, description: '课程结课审核与课酬管理' },
    ]
  },
  {
    title: '财务管理',
    items: [
      { name: '课酬统计', href: '/salary', icon: Receipt, description: '导师课酬统计与报表' },
    ],
    minRole: '规划顾问',
  },
  {
    title: '数据集成',
    items: [
      { name: '数据导入', href: '/import', icon: Upload, description: '批量导入学生/导师/课程' },
      { name: '飞书集成', href: '/feishu', icon: MessageSquare, description: '飞书消息/日历/多维表格同步' },
    ]
  },
  {
    title: '系统管理',
    items: [
      { name: '操作日志', href: '/logs', icon: History, description: '系统操作记录', minRole: '管理员' },
      { name: '系统设置', href: '/settings', icon: Settings, description: '系统配置', minRole: '管理员' },
    ],
    minRole: '管理员',
  },
];

// 角色层级
const ROLE_HIERARCHY: Record<UserRole, number> = {
  '管理员': 100,
  '规划顾问': 60,
  '全职导师': 40,
  '兼职导师': 20,
  '学生': 10,
};

// 检查角色层级
function isRoleAtLeast(role: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// 过滤导航项
function filterNavItems(items: NavItem[], userRole: UserRole): NavItem[] {
  return items.filter(item => {
    if (item.minRole && !isRoleAtLeast(userRole, item.minRole)) {
      return false;
    }
    return true;
  });
}

// 过滤导航分组
function filterNavGroups(groups: NavGroup[], userRole: UserRole): NavGroup[] {
  return groups
    .filter(group => !group.minRole || isRoleAtLeast(userRole, group.minRole))
    .map(group => ({
      ...group,
      items: filterNavItems(group.items, userRole),
    }))
    .filter(group => group.items.length > 0);
}

// 动画变体
const sidebarVariants = {
  open: {
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
  },
  closed: {
    x: '-100%',
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
  }
};

const navItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 }
};

const contentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

// 主布局组件
function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navigationGroups.map(g => g.title)
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  // 根据用户角色过滤导航
  const visibleNavGroups = user ? filterNavGroups(navigationGroups, user.role) : [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* 移动端侧边栏遮罩 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 侧边栏 - 毛玻璃效果优化 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r transition-transform duration-300 ease-in-out",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
          "border-slate-300/80 dark:border-slate-700/80",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_20px_rgba(0,0,0,0.05)]",
          "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_20px_rgba(0,0,0,0.15)]",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between h-16 px-6 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50"
          >
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, oklch(0.65 0.22 50), oklch(0.6 0.2 45))',
                  boxShadow: '0 4px 15px oklch(0.65 0.22 50 / 0.35)'
                }}
              >
                <span className="text-white font-bold text-base">A</span>
              </motion.div>
              <div className="flex flex-col">
                <span className="font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  ARTiCO
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  教务管理系统
                </span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* 用户信息条 */}
          {user && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-orange-100/80 to-amber-50/80 dark:from-slate-800/80 dark:to-slate-800/80 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                  >
                    <span className="text-sm font-semibold text-white">
                      {user.name.charAt(0)}
                    </span>
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
                  </div>
                </div>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
            </motion.div>
          )}

          {/* 飞书同步状态 */}
          <div className="px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <SyncStatusIndicator />
          </div>

          {/* 导航菜单 - 分组显示 */}
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {visibleNavGroups.map((group, groupIndex) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + groupIndex * 0.05 }}
                className="space-y-1"
              >
                {/* 分组标题 */}
                <motion.button
                  onClick={() => toggleGroup(group.title)}
                  whileHover={{ x: 2 }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  <span>{group.title}</span>
                  <motion.div
                    animate={{ rotate: expandedGroups.includes(group.title) ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </motion.div>
                </motion.button>
                
                {/* 分组内的导航项 */}
                <AnimatePresence>
                  {expandedGroups.includes(group.title) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {group.items.map((item, itemIndex) => {
                        const isActive = pathname === item.href;
                        return (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.03 }}
                          >
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              )}
                              onClick={() => setSidebarOpen(false)}
                              title={item.description}
                            >
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <item.icon className="w-5 h-5" />
                              </motion.div>
                              <span>{item.name}</span>
                              {isActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </motion.div>
                              )}
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </nav>

          {/* 底部信息 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"
              />
              <span className="font-medium">系统运行正常</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              © 2025 ARTiCO 教务管理系统 v1.0.0
            </p>
          </motion.div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="lg:pl-64">
        {/* 顶部栏 - 毛玻璃效果优化 */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 border-b backdrop-blur-xl bg-white/92 dark:bg-slate-900/92 border-slate-300/80 dark:border-slate-700/80 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* 左侧：移动端菜单按钮 + 快捷操作 */}
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </motion.div>
              
              {/* 快捷操作按钮 - 桌面端 */}
              <QuickActionButtons />
            </div>

            {/* 中间：移动端标题 */}
            <div className="flex-1 lg:flex-none lg:hidden">
              <h1 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                ARTiCO
              </h1>
            </div>

            {/* 右侧：搜索 + 工具 */}
            <div className="flex items-center gap-3">
              {/* 全局搜索 */}
              <SearchButton onClick={() => setSearchOpen(true)} />
              
              {/* 快捷操作面板 */}
              <div suppressHydrationWarning>
                <QuickActionsPanel
                  trigger={
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button variant="outline" size="sm" className="gap-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="hidden sm:inline">快捷操作</span>
                      </Button>
                    </motion.div>
                  }
                />
              </div>

              {/* 角色切换器（演示用） */}
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>
          </div>
          
          {/* 工作流程提示条 - 移动端隐藏 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:block border-t border-slate-200/60 dark:border-slate-700/60 px-4 sm:px-6 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                工作流程：
              </span>
              <span className="font-medium">选课单 → 排课 → 上课记录 → 结课审核 → 课酬统计</span>
            </div>
          </motion.div>
        </motion.header>

        {/* 页面内容 */}
        <motion.main 
          key={pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={contentVariants}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-6 lg:p-8"
        >
          {children}
        </motion.main>
      </div>

      {/* 全局搜索弹窗 */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

// 导出带 Provider 的布局组件
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </UserProvider>
  );
}

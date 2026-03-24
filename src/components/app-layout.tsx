'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Clock,
  Settings,
  Menu,
  X,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 导航分组配置
const navigationGroups = [
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
      { name: '选课单管理', href: '/selection-forms', icon: FileText, description: '创建和管理选课单' },
    ]
  },
  {
    title: '排课安排',
    items: [
      { name: '时间设置', href: '/availability', icon: Clock, description: '设置可用时间段' },
      { name: '排课管理', href: '/schedules', icon: Calendar, description: '自动/手动排课' },
    ]
  },
  {
    title: '上课记录',
    items: [
      { name: '上课记录', href: '/class-records', icon: ClipboardList, description: '填写上课记录' },
    ]
  },
  {
    title: '系统',
    items: [
      { name: '系统设置', href: '/settings', icon: Settings, description: '系统配置' },
    ]
  },
];

// 扁平化导航（用于移动端等场景）
const flatNavigation = navigationGroups.flatMap(group => group.items);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navigationGroups.map(g => g.title) // 默认全部展开
  );
  const pathname = usePathname();

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-orange rounded-xl flex items-center justify-center shadow-orange">
                <span className="text-white font-bold text-base">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-gray-900 dark:text-white leading-tight">
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
          </div>

          {/* 导航菜单 - 分组显示 */}
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {/* 分组标题 */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-400"
                >
                  <span>{group.title}</span>
                  {expandedGroups.includes(group.title) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                
                {/* 分组内的导航项 */}
                {expandedGroups.includes(group.title) && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-l-2 border-orange-500"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          )}
                          onClick={() => setSidebarOpen(false)}
                          title={item.description}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* 底部信息 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>系统运行正常</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © 2025 ARTiCO 教务管理系统 v1.0.0
            </p>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="lg:pl-64">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:hidden">
                ARTiCO 教务管理系统
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* 工作流程提示 */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                <span className="text-orange-500 font-medium">工作流程：</span>
                <span>创建选课单 → 设置时间 → 自动排课 → 上课记录</span>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

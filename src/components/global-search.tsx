/**
 * 全局搜索组件
 * 支持搜索学生、导师、课程等
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText,
  Calendar,
  Clock,
  Command,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 搜索结果类型
interface SearchResult {
  id: string;
  type: 'student' | 'teacher' | 'course' | 'schedule' | 'selection';
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badges?: string[];
}

// 模拟搜索数据（实际应从API获取）
const mockSearchData: SearchResult[] = [
  { id: '1', type: 'student', title: '张三', subtitle: '游戏设计 · 美国', href: '/students/1', icon: Users, badges: ['基础阶段'] },
  { id: '2', type: 'student', title: '李四', subtitle: '动画 · 英国', href: '/students/2', icon: Users, badges: ['项目阶段'] },
  { id: '3', type: 'teacher', title: '王导师', subtitle: '全职导师', href: '/teachers/1', icon: GraduationCap, badges: ['游戏设计', '3D游戏美术'] },
  { id: '4', type: 'teacher', title: '赵导师', subtitle: '兼职导师', href: '/teachers/2', icon: GraduationCap, badges: ['动画'] },
  { id: '5', type: 'course', title: 'AP艺术基础', subtitle: '基础课 · 4周', href: '/courses/1', icon: BookOpen },
  { id: '6', type: 'course', title: '作品集指导', subtitle: '项目课 · 2个月', href: '/courses/2', icon: BookOpen },
  { id: '7', type: 'schedule', title: '2024-03-15 排课', subtitle: '张三 · 王导师', href: '/schedules', icon: Calendar, badges: ['已确认'] },
  { id: '8', type: 'selection', title: '选课单 #SF-001', subtitle: '张三的选课单', href: '/selection-forms/1', icon: FileText, badges: ['执行中'] },
];

// 类型图标和颜色
const typeConfig = {
  student: { icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  teacher: { icon: GraduationCap, color: 'text-green-500', bgColor: 'bg-green-50' },
  course: { icon: BookOpen, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  schedule: { icon: Calendar, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  selection: { icon: FileText, color: 'text-cyan-500', bgColor: 'bg-cyan-50' },
};

// 类型标签
const typeLabels = {
  student: '学生',
  teacher: '导师',
  course: '课程',
  schedule: '排课',
  selection: '选课单',
};

interface GlobalSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearch({ open: controlledOpen, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // 支持受控和非受控模式
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      
      // ESC 关闭
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  // 搜索逻辑
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = mockSearchData.filter(
      item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle?.toLowerCase().includes(lowerQuery) ||
        item.badges?.some(b => b.toLowerCase().includes(lowerQuery))
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setOpen(false);
      setQuery('');
    }
  }, [results, selectedIndex, router, setOpen]);

  // 点击结果
  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* 搜索输入框 */}
        <div className="flex items-center border-b px-4">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <Input
            placeholder="搜索学生、导师、课程..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded">ESC</kbd>
          </div>
        </div>

        {/* 搜索结果 */}
        {query.trim() && (
          <ScrollArea className="max-h-[400px]">
            {results.length > 0 ? (
              <div className="p-2">
                <div className="text-xs text-muted-foreground px-2 py-1.5 mb-1">
                  找到 {results.length} 个结果
                </div>
                {results.map((result, index) => {
                  const Icon = result.icon;
                  const config = typeConfig[result.type];
                  
                  return (
                    <div
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                        index === selectedIndex
                          ? "bg-orange-50 dark:bg-orange-900/20"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[result.type]}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      {result.badges && (
                        <div className="flex gap-1">
                          {result.badges.map((badge, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>未找到相关结果</p>
                <p className="text-sm mt-1">尝试其他关键词</p>
              </div>
            )}
          </ScrollArea>
        )}

        {/* 提示信息 */}
        {!query.trim() && (
          <div className="py-8 px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <kbd className="px-3 py-1.5 bg-muted rounded-lg flex items-center gap-2">
                <Command className="w-3 h-3" />
                <span>K</span>
              </kbd>
              <span className="text-muted-foreground">快速打开搜索</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↓</kbd>
                选择
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                打开
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 搜索按钮组件（放在导航栏）
export function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">搜索...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background rounded text-xs">
        <Command className="w-3 h-3" />K
      </kbd>
    </button>
  );
}

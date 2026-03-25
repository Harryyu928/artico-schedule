/**
 * 月视图日历组件
 * 支持：拖拽选择日期范围、不同类型颜色区分、周末背景色
 */

'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CalendarX2, 
  AlertCircle,
  Users,
  Briefcase,
  GraduationCap,
  MoreHorizontal,
  Check,
} from 'lucide-react';

// 类型定义
export type BlockType = 'temporary_unavailable' | 'meeting' | 'leave' | 'training' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'time_block' | 'schedule' | 'makeup';
  blockType?: BlockType;
  status?: string;
  detail?: string;
}

interface MonthCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date, events: CalendarEvent[]) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  className?: string;
}

// 星期标题
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// 类型颜色配置
const BLOCK_TYPE_COLORS: Record<BlockType, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  temporary_unavailable: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: <CalendarX2 className="h-3 w-3" />,
  },
  meeting: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: <Users className="h-3 w-3" />,
  },
  leave: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  training: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: <GraduationCap className="h-3 w-3" />,
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: <MoreHorizontal className="h-3 w-3" />,
  },
};

export default function MonthCalendar({
  events = [],
  onDateClick,
  onEventClick,
  onDateRangeSelect,
  className,
}: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // 拖拽选择状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // 生成日历日期
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // 获取某一天的事件
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, day);
    });
  };

  // 判断日期是否在拖拽范围内
  const isInDragRange = (day: Date): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;
    return isWithinInterval(day, { start, end });
  };

  // 鼠标按下
  const handleMouseDown = useCallback((day: Date) => {
    if (!onDateRangeSelect) return;
    setIsDragging(true);
    setDragStart(day);
    setDragEnd(day);
  }, [onDateRangeSelect]);

  // 鼠标移动
  const handleMouseMove = useCallback((day: Date) => {
    if (!isDragging || !dragStart) return;
    setDragEnd(day);
  }, [isDragging, dragStart]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd && onDateRangeSelect) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      onDateRangeSelect(start, end);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onDateRangeSelect]);

  // 上个月
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // 下个月
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // 返回今天
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 点击日期
  const handleDateClick = (day: Date) => {
    if (isDragging) return;
    setSelectedDate(day);
    const dayEvents = getEventsForDay(day);
    if (onDateClick) {
      onDateClick(day, dayEvents);
    }
  };

  // 点击事件
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  };

  // 获取事件样式
  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === 'time_block' && event.blockType) {
      // 安全获取样式，如果 blockType 不在预定义键中则使用 other 样式
      return BLOCK_TYPE_COLORS[event.blockType] || BLOCK_TYPE_COLORS.other;
    }
    if (event.type === 'schedule') {
      return {
        bg: event.status === '取消' ? 'bg-gray-100' : 'bg-orange-100',
        text: event.status === '取消' ? 'text-gray-400 line-through' : 'text-orange-700',
        border: event.status === '取消' ? 'border-gray-300' : 'border-orange-300',
        icon: <Clock className="h-3 w-3" />,
      };
    }
    if (event.type === 'makeup') {
      return {
        bg: 'bg-cyan-100',
        text: 'text-cyan-700',
        border: 'border-cyan-300',
        icon: <Check className="h-3 w-3" />,
      };
    }
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200',
      icon: <Clock className="h-3 w-3" />,
    };
  };

  const isToday = (day: Date) => isSameDay(day, new Date());
  const isSelected = (day: Date) => selectedDate && isSameDay(day, selectedDate);
  const isWeekend = (day: Date) => {
    const dayOfWeek = day.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return (
    <div className={cn('bg-white', className)} ref={calendarRef}>
      {/* 日历头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={previousMonth}
            className="h-9 w-9 hover:bg-orange-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold min-w-[160px] text-center text-gray-800">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-9 w-9 hover:bg-orange-100"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="hover:bg-orange-50">
          今天
        </Button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-3 text-center text-sm font-semibold',
              index === 0 || index === 6 ? 'text-red-500 bg-red-50/50' : 'text-gray-700'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div 
        className="grid grid-cols-7 select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayIsWeekend = isWeekend(day);
          const dayIsInDragRange = isInDragRange(day);

          return (
            <div
              key={day.toISOString()}
              onMouseDown={() => handleMouseDown(day)}
              onMouseMove={() => handleMouseMove(day)}
              onClick={() => handleDateClick(day)}
              className={cn(
                'min-h-[110px] border-b border-r p-1 cursor-pointer transition-all relative',
                'hover:bg-gray-50',
                // 非本月日期
                !isCurrentMonth && 'bg-gray-100/50 opacity-60',
                // 周末背景
                isCurrentMonth && dayIsWeekend && 'bg-red-50/30',
                // 今天
                isToday(day) && 'bg-orange-50',
                // 选中
                isSelected(day) && 'ring-2 ring-inset ring-orange-400 bg-orange-50',
                // 拖拽范围
                dayIsInDragRange && 'bg-orange-100 ring-1 ring-inset ring-orange-300',
                // 第一列加左边框
                index % 7 === 0 && 'border-l'
              )}
            >
              {/* 日期数字 */}
              <div
                className={cn(
                  'text-sm font-semibold mb-1 w-8 h-8 flex items-center justify-center rounded-full transition-all',
                  isToday(day) && 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md',
                  isSelected(day) && !isToday(day) && 'bg-orange-200 text-orange-800',
                  !isToday(day) && !isSelected(day) && isCurrentMonth && dayIsWeekend && 'text-red-600',
                  !isCurrentMonth && 'text-gray-400'
                )}
              >
                {format(day, 'd')}
              </div>

              {/* 事件列表 */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  const style = getEventStyle(event);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(e, event)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer',
                        'flex items-center gap-1 border shadow-sm hover:shadow-md transition-shadow',
                        style.bg,
                        style.text,
                        style.border
                      )}
                      title={`${event.title}${event.detail ? `: ${event.detail}` : ''}`}
                    >
                      {style.icon}
                      <span className="truncate font-medium">{event.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1.5 font-medium">
                    +{dayEvents.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center flex-wrap gap-4 p-4 border-t bg-gray-50 text-sm">
        <span className="font-medium text-gray-600">图例：</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600" />
          <span className="text-gray-600">今天</span>
        </div>
        {Object.entries(BLOCK_TYPE_COLORS).map(([type, style]) => {
          const labels: Record<BlockType, string> = {
            temporary_unavailable: '临时不可用',
            meeting: '会议',
            leave: '请假',
            training: '培训',
            other: '其他',
          };
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn('w-4 h-4 rounded border', style.bg, style.border)} />
              <span className="text-gray-600">{labels[type as BlockType]}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" />
          <span className="text-gray-600">可排课</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-cyan-100 border border-cyan-300" />
          <span className="text-gray-600">补课</span>
        </div>
      </div>

      {/* 拖拽提示 */}
      {onDateRangeSelect && (
        <div className="px-4 pb-3 text-xs text-gray-500 text-center">
          💡 按住鼠标拖拽可选择日期范围
        </div>
      )}
    </div>
  );
}

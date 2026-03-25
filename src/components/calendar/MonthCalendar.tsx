/**
 * 月视图日历组件
 * 显示导师的时间调整和课程安排
 */

'use client';

import React, { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Clock, CalendarX2, AlertCircle } from 'lucide-react';

// 类型定义
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'time_block' | 'schedule' | 'makeup';
  status?: string;
  detail?: string;
}

interface MonthCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date, events: CalendarEvent[]) => void;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

// 星期标题
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function MonthCalendar({
  events = [],
  onDateClick,
  onEventClick,
  className,
}: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // 判断日期是否在时间调整范围内
  const isDateBlocked = (day: Date): { blocked: boolean; reason?: string } => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const timeBlock = events.find(e => 
      e.type === 'time_block' && 
      e.date === dayStr &&
      e.status === 'confirmed'
    );
    
    if (timeBlock) {
      return { blocked: true, reason: timeBlock.title };
    }
    return { blocked: false };
  };

  // 上个月
  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // 下个月
  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // 返回今天
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 点击日期
  const handleDateClick = (day: Date) => {
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

  // 获取事件颜色
  const getEventColor = (event: CalendarEvent) => {
    switch (event.type) {
      case 'time_block':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'schedule':
        return event.status === '取消' 
          ? 'bg-gray-100 text-gray-400 line-through' 
          : 'bg-orange-100 text-orange-700 border-orange-300';
      case 'makeup':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 获取事件图标
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'time_block':
        return <CalendarX2 className="h-3 w-3" />;
      case 'makeup':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const isToday = (day: Date) => isSameDay(day, new Date());
  const isSelected = (day: Date) => selectedDate && isSameDay(day, selectedDate);

  return (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* 日历头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          今天
        </Button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-sm font-medium',
              index === 0 || index === 6 ? 'text-red-500' : 'text-gray-600'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const { blocked } = isDateBlocked(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isWeekend = index % 7 === 0 || index % 7 === 6;

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={cn(
                'min-h-[100px] border-b border-r p-1 cursor-pointer transition-colors',
                'hover:bg-gray-50',
                !isCurrentMonth && 'bg-gray-50/50',
                isSelected(day) && 'bg-orange-50 ring-2 ring-inset ring-orange-300',
                isToday(day) && 'bg-blue-50/50',
                blocked && 'bg-red-50/30'
              )}
            >
              {/* 日期数字 */}
              <div
                className={cn(
                  'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday(day) && 'bg-orange-500 text-white',
                  isSelected(day) && !isToday(day) && 'bg-orange-100 text-orange-700',
                  !isToday(day) && !isSelected(day) && isCurrentMonth && isWeekend && 'text-red-500',
                  !isCurrentMonth && 'text-gray-400'
                )}
              >
                {format(day, 'd')}
              </div>

              {/* 事件列表 */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => handleEventClick(e, event)}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer',
                      'flex items-center gap-1 border',
                      getEventColor(event)
                    )}
                    title={event.title}
                  >
                    {getEventIcon(event.type)}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1.5">
                    +{dayEvents.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-6 p-4 border-t text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>今天</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300" />
          <span>不可排课</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
          <span>已排课程</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
          <span>补课</span>
        </div>
      </div>
    </div>
  );
}

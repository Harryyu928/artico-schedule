/**
 * 骨架屏组件
 * 用于加载状态展示
 */

import { cn } from '@/lib/utils';
import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
      style={style}
      {...props}
    />
  );
}

// 时间表骨架屏
export function TimeTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-50 w-24">
                <Skeleton className="h-4 w-12 mx-auto" />
              </th>
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="p-2 border bg-gray-50">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="p-2 border bg-gray-50">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </td>
                {Array.from({ length: 7 }).map((_, colIndex) => (
                  <td key={colIndex} className="p-1 border">
                    <Skeleton className="h-12 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 月历骨架屏
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>
      
      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-4 w-4 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[110px] border-r border-b p-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="mt-2 space-y-1">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      
      {/* 图例 */}
      <div className="flex gap-4 p-4 border-t">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 用户选择骨架屏
export function UserSelectSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// 卡片骨架屏
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

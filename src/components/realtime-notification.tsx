/**
 * 实时通知组件
 * 显示实时事件通知
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRealtime, type ConnectionStatus } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { Toast, ToastAction } from '@/components/ui/toast';

// 通知数据类型
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

// Context 类型
interface RealtimeContextType {
  status: ConnectionStatus;
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

// Context
const RealtimeContext = createContext<RealtimeContextType | null>(null);

// Provider Props
interface RealtimeProviderProps {
  userId: string | null;
  children: React.ReactNode;
  showToasts?: boolean;
}

/**
 * 实时通知 Provider
 */
export function RealtimeProvider({ 
  userId, 
  children, 
  showToasts = true 
}: RealtimeProviderProps) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const { toast } = useToast();

  // 处理通知事件
  const handleNotification = useCallback((data: any) => {
    const notification: RealtimeNotification = {
      id: `notif-${Date.now()}`,
      type: data.type || 'info',
      title: data.title || '新通知',
      message: data.content || data.message || '',
      timestamp: new Date(),
      read: false,
      link: data.link,
    };

    setNotifications(prev => [notification, ...prev].slice(0, 50)); // 最多保留50条

    // 显示 Toast
    if (showToasts) {
      toast({
        title: notification.title,
        description: notification.message,
      });
    }
  }, [showToasts, toast]);

  // 处理工作流更新
  const handleWorkflowUpdate = useCallback((data: any) => {
    if (data.message) {
      handleNotification({
        type: 'workflow',
        title: '工作流更新',
        content: data.message,
        link: `/workflows/${data.instanceId}`,
      });
    }
  }, [handleNotification]);

  // 处理任务更新
  const handleTaskUpdate = useCallback((data: any) => {
    if (data.message) {
      handleNotification({
        type: 'task',
        title: '任务更新',
        content: data.message,
        link: `/workflows/${data.instanceId}`,
      });
    }
  }, [handleNotification]);

  // 处理排课更新
  const handleScheduleUpdate = useCallback((data: any) => {
    handleNotification({
      type: 'schedule',
      title: '排课更新',
      content: data.message || `排课已${data.action === 'created' ? '创建' : data.action === 'cancelled' ? '取消' : '更新'}`,
      link: data.studentId ? `/students/${data.studentId}` : undefined,
    });
  }, [handleNotification]);

  // 处理上课记录更新
  const handleClassRecordUpdate = useCallback((data: any) => {
    if (data.message) {
      handleNotification({
        type: 'class_record',
        title: '上课记录更新',
        content: data.message,
        link: `/class-records/${data.recordId}`,
      });
    }
  }, [handleNotification]);

  // 建立 SSE 连接
  const { status } = useRealtime({
    userId,
    onNotification: handleNotification,
    onWorkflowUpdate: handleWorkflowUpdate,
    onTaskUpdate: handleTaskUpdate,
    onScheduleUpdate: handleScheduleUpdate,
    onClassRecordUpdate: handleClassRecordUpdate,
  });

  // 标记为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // 全部标记为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // 清空通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 未读数量
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <RealtimeContext.Provider
      value={{
        status,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * 使用实时通知 Hook
 */
export function useRealtimeNotifications() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeNotifications must be used within a RealtimeProvider');
  }
  return context;
}

/**
 * 连接状态指示器组件
 */
export function ConnectionIndicator() {
  const { status } = useRealtimeNotifications();

  const statusConfig = {
    connecting: { color: 'bg-yellow-500', text: '连接中...' },
    connected: { color: 'bg-green-500', text: '已连接' },
    disconnected: { color: 'bg-gray-500', text: '已断开' },
    error: { color: 'bg-red-500', text: '连接错误' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.text}</span>
    </div>
  );
}

/**
 * 通知铃铛组件
 */
export function NotificationBell() {
  const { unreadCount, notifications, markAllAsRead } = useRealtimeNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">通知</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  全部已读
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  暂无通知
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b hover:bg-accent/50 cursor-pointer ${
                      !notification.read ? 'bg-accent/30' : ''
                    }`}
                    onClick={() => {
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 相对时间格式化
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}

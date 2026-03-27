'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  createdAt: Date;
}

interface NotificationBellProps {
  teacherId: string;
  unreadCount: number;
  onRefresh: () => void;
}

export function NotificationBell({ teacherId, unreadCount, onRefresh }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teacher/notifications?teacherId=${teacherId}`);
      const result = await response.json();
      
      if (result.success) {
        setNotifications(result.data.notifications);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/teacher/notifications/${notificationId}`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
        );
        onRefresh();
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    // 根据通知类型跳转
    if (notification.entityType === 'schedule' && notification.entityId) {
      router.push('/teacher/schedule');
    } else if (notification.entityType === 'class_record_reminder' && notification.entityId) {
      router.push(`/teacher/records/new?scheduleId=${notification.entityId}`);
    }
    
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'schedule_cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      case 'schedule_rescheduled':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const isUnread = (status: string) => status !== 'read';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-gray-500 hover:text-orange-600"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">通知中心</h3>
            {unreadCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {unreadCount} 条未读
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-orange-50 ${
                    isUnread(notification.status) ? 'bg-orange-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${isUnread(notification.status) ? 'text-orange-500' : 'text-gray-400'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${
                          isUnread(notification.status) ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title}
                        </p>
                        {isUnread(notification.status) && (
                          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {format(new Date(notification.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={() => {
                // 标记所有为已读
                notifications.forEach(n => {
                  if (isUnread(n.status)) {
                    handleMarkAsRead(n.id);
                  }
                });
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              全部已读
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 实时事件 Hook
 * 提供客户端实时事件订阅功能
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { EventType } from '@/lib/realtime-service';

// 事件数据类型
export interface RealtimeEventData {
  type: EventType | 'connected';
  payload: unknown;
  timestamp: string;
}

// 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Hook 配置
export interface UseRealtimeOptions {
  userId: string | null;
  onEvent?: (event: RealtimeEventData) => void;
  onWorkflowUpdate?: (data: any) => void;
  onTaskUpdate?: (data: any) => void;
  onScheduleUpdate?: (data: any) => void;
  onClassRecordUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// Hook 返回值
export interface UseRealtimeReturn {
  status: ConnectionStatus;
  lastEvent: RealtimeEventData | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * 实时事件订阅 Hook
 */
export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
  const {
    userId,
    onEvent,
    onWorkflowUpdate,
    onTaskUpdate,
    onScheduleUpdate,
    onClassRecordUpdate,
    onNotification,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEventData | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理事件
  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const data: RealtimeEventData = JSON.parse(event.data);
      setLastEvent(data);
      
      // 触发通用回调
      onEvent?.(data);
      
      // 根据事件类型触发特定回调
      switch (data.type) {
        case 'workflow_update':
          onWorkflowUpdate?.(data.payload);
          break;
        case 'task_update':
          onTaskUpdate?.(data.payload);
          break;
        case 'schedule_update':
          onScheduleUpdate?.(data.payload);
          break;
        case 'class_record_update':
          onClassRecordUpdate?.(data.payload);
          break;
        case 'notification':
          onNotification?.(data.payload);
          break;
        case 'connected':
          setStatus('connected');
          reconnectAttemptsRef.current = 0;
          break;
      }
    } catch (error) {
      console.error('[Realtime] Failed to parse event:', error);
    }
  }, [onEvent, onWorkflowUpdate, onTaskUpdate, onScheduleUpdate, onClassRecordUpdate, onNotification]);

  // 连接
  const connect = useCallback(() => {
    if (!userId) {
      return;
    }

    // 清理现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    
    const eventSource = new EventSource(`/api/realtime/events?userId=${userId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = handleEvent;

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
      
      // 尝试重连
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`[Realtime] Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      } else {
        console.error('[Realtime] Max reconnect attempts reached');
        setStatus('disconnected');
      }
    };
  }, [userId, handleEvent, reconnectInterval, maxReconnectAttempts]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // 重连
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // 自动连接/断开
  useEffect(() => {
    if (userId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // 页面可见性变化时重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId && status === 'disconnected') {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, status, reconnect]);

  return {
    status,
    lastEvent,
    reconnect,
    disconnect,
  };
}

/**
 * 简化版 Hook - 仅订阅特定类型事件
 */
export function useRealtimeEvents(
  userId: string | null,
  eventTypes: EventType[],
  callback: (data: any) => void
): ConnectionStatus {
  const { status } = useRealtime({
    userId,
    onEvent: (event) => {
      if (eventTypes.includes(event.type as EventType)) {
        callback(event.payload);
      }
    },
  });

  return status;
}

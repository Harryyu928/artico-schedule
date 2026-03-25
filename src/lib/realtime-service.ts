/**
 * 实时事件服务
 * 使用 Server-Sent Events (SSE) 实现服务器到客户端的实时推送
 * 
 * 支持的事件类型：
 * - workflow_update: 工作流状态更新
 * - task_update: 任务状态更新
 * - schedule_update: 排课更新
 * - notification: 新通知
 */

// 事件类型定义
export type EventType = 
  | 'workflow_update'
  | 'task_update'
  | 'schedule_update'
  | 'class_record_update'
  | 'notification';

// 事件数据接口
export interface RealtimeEvent {
  type: EventType;
  payload: unknown;
  timestamp: Date;
  userId?: string; // 目标用户ID，undefined表示广播
}

// 客户端连接管理
interface ClientConnection {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  lastHeartbeat: Date;
}

// 全局连接存储（单例模式）
class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, ClientConnection[]> = new Map();
  
  private constructor() {}
  
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }
  
  /**
   * 添加客户端连接
   */
  addConnection(userId: string, connection: ClientConnection): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push(connection);
    console.log(`[Realtime] User ${userId} connected, total connections: ${this.connections.get(userId)!.length}`);
  }
  
  /**
   * 移除客户端连接
   */
  removeConnection(userId: string, connectionId: string): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.findIndex(c => c.id === connectionId);
      if (index !== -1) {
        userConnections.splice(index, 1);
        console.log(`[Realtime] Connection ${connectionId} removed for user ${userId}, remaining: ${userConnections.length}`);
      }
      if (userConnections.length === 0) {
        this.connections.delete(userId);
      }
    }
  }
  
  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId: string): ClientConnection[] {
    return this.connections.get(userId) || [];
  }
  
  /**
   * 获取所有连接数
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(conns => {
      total += conns.length;
    });
    return total;
  }
  
  /**
   * 获取在线用户数
   */
  getOnlineUserCount(): number {
    return this.connections.size;
  }
  
  /**
   * 清理超时连接
   */
  cleanupStaleConnections(timeoutMs: number = 60000): void {
    const now = new Date();
    this.connections.forEach((conns, userId) => {
      const activeConns = conns.filter(conn => {
        const elapsed = now.getTime() - conn.lastHeartbeat.getTime();
        if (elapsed > timeoutMs) {
          console.log(`[Realtime] Cleaning up stale connection ${conn.id} for user ${userId}`);
          try {
            conn.controller.close();
          } catch (e) {
            // 忽略关闭错误
          }
          return false;
        }
        return true;
      });
      
      if (activeConns.length === 0) {
        this.connections.delete(userId);
      } else if (activeConns.length !== conns.length) {
        this.connections.set(userId, activeConns);
      }
    });
  }
}

export const connectionManager = ConnectionManager.getInstance();

/**
 * 发送事件给指定用户
 */
export function sendEventToUser(userId: string, event: RealtimeEvent): boolean {
  const connections = connectionManager.getUserConnections(userId);
  
  if (connections.length === 0) {
    return false;
  }
  
  const eventData = `data: ${JSON.stringify({
    type: event.type,
    payload: event.payload,
    timestamp: event.timestamp.toISOString(),
  })}\n\n`;
  
  let sent = false;
  connections.forEach(conn => {
    try {
      conn.controller.enqueue(conn.encoder.encode(eventData));
      sent = true;
    } catch (error) {
      console.error(`[Realtime] Failed to send event to connection ${conn.id}:`, error);
    }
  });
  
  return sent;
}

/**
 * 广播事件给所有在线用户
 */
export function broadcastEvent(event: RealtimeEvent): number {
  const eventData = `data: ${JSON.stringify({
    type: event.type,
    payload: event.payload,
    timestamp: event.timestamp.toISOString(),
  })}\n\n`;
  
  let sentCount = 0;
  connectionManager.getUserConnections('').forEach(conn => {
    try {
      conn.controller.enqueue(conn.encoder.encode(eventData));
      sentCount++;
    } catch (error) {
      console.error(`[Realtime] Failed to broadcast to connection ${conn.id}:`, error);
    }
  });
  
  return sentCount;
}

/**
 * 发送工作流更新事件
 */
export function notifyWorkflowUpdate(
  userId: string,
  data: {
    instanceId: string;
    status?: string;
    progress?: number;
    currentStage?: string;
    message?: string;
  }
): void {
  sendEventToUser(userId, {
    type: 'workflow_update',
    payload: data,
    timestamp: new Date(),
    userId,
  });
}

/**
 * 发送任务更新事件
 */
export function notifyTaskUpdate(
  userId: string,
  data: {
    taskId: string;
    instanceId: string;
    status?: string;
    message?: string;
  }
): void {
  sendEventToUser(userId, {
    type: 'task_update',
    payload: data,
    timestamp: new Date(),
    userId,
  });
}

/**
 * 发送排课更新事件
 */
export function notifyScheduleUpdate(
  userId: string,
  data: {
    scheduleId: string;
    studentId?: string;
    teacherId?: string;
    action: 'created' | 'updated' | 'cancelled';
    message?: string;
  }
): void {
  sendEventToUser(userId, {
    type: 'schedule_update',
    payload: data,
    timestamp: new Date(),
    userId,
  });
}

/**
 * 发送上课记录更新事件
 */
export function notifyClassRecordUpdate(
  userId: string,
  data: {
    recordId: string;
    studentId: string;
    teacherId: string;
    status?: string;
    message?: string;
  }
): void {
  sendEventToUser(userId, {
    type: 'class_record_update',
    payload: data,
    timestamp: new Date(),
    userId,
  });
}

/**
 * 发送通知事件
 */
export function notifyUser(
  userId: string,
  data: {
    title: string;
    content: string;
    type: string;
    link?: string;
  }
): void {
  sendEventToUser(userId, {
    type: 'notification',
    payload: data,
    timestamp: new Date(),
    userId,
  });
}

/**
 * 创建SSE连接
 */
export function createSSEConnection(userId: string): ReadableStream {
  const encoder = new TextEncoder();
  const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let lastHeartbeat = new Date();
  
  const stream = new ReadableStream({
    start(controller) {
      const connection: ClientConnection = {
        id: connectionId,
        userId,
        controller,
        encoder,
        lastHeartbeat,
      };
      
      connectionManager.addConnection(userId, connection);
      
      // 发送连接成功消息
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        payload: { connectionId },
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));
      
      // 心跳定时器
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
          lastHeartbeat = new Date();
        } catch (error) {
          clearInterval(heartbeatInterval);
          connectionManager.removeConnection(userId, connectionId);
        }
      }, 30000); // 每30秒发送心跳
      
      // 清理定时器
      const cleanupInterval = setInterval(() => {
        connectionManager.cleanupStaleConnections();
      }, 60000); // 每分钟清理超时连接
    },
    
    cancel() {
      connectionManager.removeConnection(userId, connectionId);
    },
  });
  
  return stream;
}

/**
 * 获取连接统计信息
 */
export function getConnectionStats(): {
  onlineUsers: number;
  totalConnections: number;
} {
  return {
    onlineUsers: connectionManager.getOnlineUserCount(),
    totalConnections: connectionManager.getTotalConnections(),
  };
}

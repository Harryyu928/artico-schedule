/**
 * 飞书集成适配器
 * 
 * 功能说明：
 * - 多维表格：同步学生信息、课程安排、上课记录
 * - 日历服务：同步课程日程、导师日历
 * - 消息通知：发送课程提醒、审批通知
 * 
 * 启用条件：
 * 设置环境变量 FEISHU_ENABLED=true 并配置飞书应用凭证
 */

// 飞书配置接口
export interface FeishuConfig {
  enabled: boolean;
  appId?: string;
  appSecret?: string;
  appToken?: string; // 多维表格 App Token
}

// 从环境变量获取配置
export function getFeishuConfig(): FeishuConfig {
  return {
    enabled: process.env.FEISHU_ENABLED === 'true',
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    appToken: process.env.FEISHU_APP_TOKEN,
  };
}

// 多维表格接口
export interface BitableRecord {
  recordId: string;
  fields: Record<string, unknown>;
}

export interface BitableService {
  // 同步学生信息
  syncStudent(studentId: string, data: Record<string, unknown>): Promise<BitableRecord | null>;
  
  // 同步课程安排
  syncSchedule(scheduleId: string, data: Record<string, unknown>): Promise<BitableRecord | null>;
  
  // 同步上课记录
  syncRecord(recordId: string, data: Record<string, unknown>): Promise<BitableRecord | null>;
  
  // 查询记录
  queryRecords(tableId: string, filter?: string): Promise<BitableRecord[]>;
}

// 日历服务接口
export interface CalendarEvent {
  eventId?: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: string[]; // 飞书用户ID列表
}

export interface CalendarService {
  // 创建日程
  createEvent(event: CalendarEvent): Promise<string | null>;
  
  // 更新日程
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<boolean>;
  
  // 删除日程
  deleteEvent(eventId: string): Promise<boolean>;
  
  // 查询日程
  queryEvents(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]>;
}

// 消息通知接口
export interface NotificationMessage {
  title: string;
  content: string;
  recipients: string[]; // 飞书用户ID列表
  type?: 'text' | 'card';
}

export interface NotificationService {
  // 发送消息
  sendMessage(message: NotificationMessage): Promise<boolean>;
  
  // 发送课程提醒
  sendCourseReminder(userId: string, courseInfo: {
    courseName: string;
    studentName: string;
    time: string;
    location?: string;
  }): Promise<boolean>;
  
  // 发送审批通知
  sendApprovalNotification(userId: string, approvalInfo: {
    type: string;
    applicant: string;
    status: string;
    link?: string;
  }): Promise<boolean>;
}

// 飞书集成适配器（空实现，预留接口）
export class FeishuAdapter {
  private config: FeishuConfig;
  
  constructor(config?: FeishuConfig) {
    this.config = config || getFeishuConfig();
  }
  
  get isEnabled(): boolean {
    return this.config.enabled;
  }
  
  // 获取多维表格服务
  getBitableService(): BitableService | null {
    if (!this.config.enabled) {
      console.log('[Feishu] 飞书集成未启用，跳过多维表格同步');
      return null;
    }
    
    // TODO: 实现真实的飞书多维表格服务
    return {
      syncStudent: async (studentId, data) => {
        console.log('[Feishu] 同步学生信息:', { studentId, data });
        return null;
      },
      syncSchedule: async (scheduleId, data) => {
        console.log('[Feishu] 同步课程安排:', { scheduleId, data });
        return null;
      },
      syncRecord: async (recordId, data) => {
        console.log('[Feishu] 同步上课记录:', { recordId, data });
        return null;
      },
      queryRecords: async (tableId, filter) => {
        console.log('[Feishu] 查询记录:', { tableId, filter });
        return [];
      },
    };
  }
  
  // 获取日历服务
  getCalendarService(): CalendarService | null {
    if (!this.config.enabled) {
      console.log('[Feishu] 飞书集成未启用，跳过日历同步');
      return null;
    }
    
    // TODO: 实现真实的飞书日历服务
    return {
      createEvent: async (event) => {
        console.log('[Feishu] 创建日程:', event);
        return null;
      },
      updateEvent: async (eventId, event) => {
        console.log('[Feishu] 更新日程:', { eventId, event });
        return false;
      },
      deleteEvent: async (eventId) => {
        console.log('[Feishu] 删除日程:', eventId);
        return false;
      },
      queryEvents: async (userId, startDate, endDate) => {
        console.log('[Feishu] 查询日程:', { userId, startDate, endDate });
        return [];
      },
    };
  }
  
  // 获取消息通知服务
  getNotificationService(): NotificationService | null {
    if (!this.config.enabled) {
      console.log('[Feishu] 飞书集成未启用，跳过消息通知');
      return null;
    }
    
    // TODO: 实现真实的飞书消息服务
    return {
      sendMessage: async (message) => {
        console.log('[Feishu] 发送消息:', message);
        return false;
      },
      sendCourseReminder: async (userId, courseInfo) => {
        console.log('[Feishu] 发送课程提醒:', { userId, courseInfo });
        return false;
      },
      sendApprovalNotification: async (userId, approvalInfo) => {
        console.log('[Feishu] 发送审批通知:', { userId, approvalInfo });
        return false;
      },
    };
  }
  
  // 获取用户飞书 Open ID（通过绑定关系）
  async getUserFeishuId(userId: string): Promise<string | null> {
    if (!this.config.enabled) {
      return null;
    }
    
    // TODO: 从数据库查询用户的飞书 ID
    console.log('[Feishu] 获取用户飞书 ID:', userId);
    return null;
  }
}

// 全局单例
let feishuAdapter: FeishuAdapter | null = null;

export function getFeishuAdapter(): FeishuAdapter {
  if (!feishuAdapter) {
    feishuAdapter = new FeishuAdapter();
  }
  return feishuAdapter;
}

// 导出便捷对象（兼容旧代码）
export const feishuCalendar = {
  createEvent: async (event: CalendarEvent) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getCalendarService();
    if (!service) return null;
    return service.createEvent(event);
  },
  updateEvent: async (eventId: string, event: Partial<CalendarEvent>) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getCalendarService();
    if (!service) return false;
    return service.updateEvent(eventId, event);
  },
  deleteEvent: async (eventId: string) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getCalendarService();
    if (!service) return false;
    return service.deleteEvent(eventId);
  },
  queryEvents: async (userId: string, startDate: string, endDate: string) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getCalendarService();
    if (!service) return [];
    return service.queryEvents(userId, startDate, endDate);
  },
};

export const feishuMessage = {
  sendMessage: async (message: NotificationMessage) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getNotificationService();
    if (!service) return false;
    return service.sendMessage(message);
  },
  sendCourseReminder: async (userId: string, courseInfo: Parameters<NotificationService['sendCourseReminder']>[1]) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getNotificationService();
    if (!service) return false;
    return service.sendCourseReminder(userId, courseInfo);
  },
  sendApprovalNotification: async (userId: string, approvalInfo: Parameters<NotificationService['sendApprovalNotification']>[1]) => {
    const adapter = getFeishuAdapter();
    const service = adapter.getNotificationService();
    if (!service) return false;
    return service.sendApprovalNotification(userId, approvalInfo);
  },
  // 排课通知学生
  sendScheduleNotificationToStudent: async (
    studentName: string,
    courseName: string,
    teacherName: string,
    timeStr: string
  ) => {
    console.log('[Feishu] 发送排课通知给学生:', { studentName, courseName, teacherName, timeStr });
    // TODO: 实现真实的飞书消息发送
    return true;
  },
  // 排课通知导师
  sendScheduleNotificationToTeacher: async (
    teacherName: string,
    studentName: string,
    courseName: string,
    timeStr: string
  ) => {
    console.log('[Feishu] 发送排课通知给导师:', { teacherName, studentName, courseName, timeStr });
    // TODO: 实现真实的飞书消息发送
    return true;
  },
};

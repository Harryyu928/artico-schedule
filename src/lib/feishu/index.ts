/**
 * 飞书集成模块
 * 
 * 提供完整的飞书集成能力：
 * - 用户认证（飞书登录）
 * - 消息通知（课程提醒、审批通知等）
 * - 日历同步（课程安排同步到飞书日历）
 * - 多维表格同步（数据同步到飞书多维表格）
 */

// 核心客户端
export { FeishuClient, getFeishuClient, isFeishuEnabled } from './client';
export type { FeishuConfig } from './client';

// 消息通知服务
export { FeishuNotificationService, feishuNotificationService } from './notification';
export type {
  CourseReminderData,
  ApprovalNotificationData,
  ScheduleChangeData,
  ClassRecordData,
} from './notification';

// 日历同步服务
export { FeishuCalendarService, feishuCalendarService } from './calendar';
export type { CalendarEventData } from './calendar';

// 多维表格同步服务
export { FeishuBitableService, feishuBitableService } from './bitable';
export type { SyncResult } from './bitable';

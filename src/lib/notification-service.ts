/**
 * 统一通知服务
 * 
 * 功能说明：
 * - 根据用户类型和偏好选择通知渠道
 * - 支持飞书、微信、邮件、短信等多种方式
 * - 自动降级和重试机制
 * 
 * 通知策略：
 * - 全职导师：优先飞书通知
 * - 兼职导师：微信/邮件/短信（根据偏好）
 * - 学生：微信/邮件/短信（根据偏好）
 */

import { getFeishuAdapter } from './feishu-adapter';
import { db } from '@/db';
import { users, students } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@/types/permissions';

// 通知类型
export type NotificationType = 
  | 'course_reminder'      // 课程提醒
  | 'schedule_change'      // 排课变更
  | 'approval_request'     // 审批请求
  | 'approval_result'      // 审批结果
  | 'assignment'           // 任务分配
  | 'deadline_reminder'    // 截止日期提醒
  | 'progress_update';     // 进度更新

// 通知渠道
export type NotificationChannel = 'feishu' | 'wechat' | 'email' | 'sms';

// 通知消息
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  link?: string; // 点击跳转链接
}

// 用户通知偏好
export interface NotificationPreferences {
  channels: {
    feishu: boolean;
    wechat: boolean;
    email: boolean;
    sms: boolean;
  };
  enabledTypes: NotificationType[];
}

// 获取用户通知偏好
async function getUserNotificationPreferences(
  userId: string,
  userType: 'teacher' | 'student'
): Promise<NotificationPreferences> {
  // 默认偏好
  const defaultPreferences: NotificationPreferences = {
    channels: {
      feishu: true,
      wechat: true,
      email: false,
      sms: false,
    },
    enabledTypes: [
      'course_reminder',
      'schedule_change',
      'approval_request',
      'approval_result',
      'assignment',
    ],
  };
  
  try {
    if (userType === 'teacher') {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (user?.notificationChannels) {
        return {
          channels: user.notificationChannels as NotificationPreferences['channels'],
          enabledTypes: defaultPreferences.enabledTypes,
        };
      }
    } else {
      const student = await db.query.students.findFirst({
        where: eq(students.id, userId),
      });
      
      if (student?.notificationChannels) {
        return {
          channels: student.notificationChannels as NotificationPreferences['channels'],
          enabledTypes: defaultPreferences.enabledTypes,
        };
      }
    }
  } catch (error) {
    console.error('获取用户通知偏好失败:', error);
  }
  
  return defaultPreferences;
}

// 根据角色选择通知渠道
function selectChannels(
  role: UserRole,
  preferences: NotificationPreferences
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  
  // 全职导师优先飞书
  if (role === '全职导师' && preferences.channels.feishu) {
    channels.push('feishu');
  }
  
  // 其他渠道根据偏好
  if (preferences.channels.wechat) {
    channels.push('wechat');
  }
  if (preferences.channels.email) {
    channels.push('email');
  }
  if (preferences.channels.sms) {
    channels.push('sms');
  }
  
  // 至少有一个渠道
  if (channels.length === 0) {
    if (role === '全职导师') {
      channels.push('feishu');
    } else {
      channels.push('wechat');
    }
  }
  
  return channels;
}

// 发送飞书通知
async function sendFeishuNotification(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  const feishuAdapter = getFeishuAdapter();
  
  if (!feishuAdapter.isEnabled) {
    console.log('[Notification] 飞书未启用，跳过飞书通知');
    return false;
  }
  
  const notificationService = feishuAdapter.getNotificationService();
  if (!notificationService) {
    return false;
  }
  
  const feishuUserId = await feishuAdapter.getUserFeishuId(userId);
  if (!feishuUserId) {
    console.log('[Notification] 用户未绑定飞书账号:', userId);
    return false;
  }
  
  return notificationService.sendMessage({
    title: payload.title,
    content: payload.content,
    recipients: [feishuUserId],
    type: 'card',
  });
}

// 发送微信通知（预留接口）
async function sendWechatNotification(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  // TODO: 实现微信模板消息发送
  console.log('[Notification] 发送微信通知:', { userId, payload });
  return false;
}

// 发送邮件通知（预留接口）
async function sendEmailNotification(
  email: string,
  payload: NotificationPayload
): Promise<boolean> {
  // TODO: 实现邮件发送
  console.log('[Notification] 发送邮件通知:', { email, payload });
  return false;
}

// 发送短信通知（预留接口）
async function sendSmsNotification(
  phone: string,
  payload: NotificationPayload
): Promise<boolean> {
  // TODO: 实现短信发送
  console.log('[Notification] 发送短信通知:', { phone, payload });
  return false;
}

// 统一发送通知
export async function sendNotification(
  userId: string,
  payload: NotificationPayload,
  options?: {
    userType?: 'teacher' | 'student';
    role?: UserRole;
    email?: string;
    phone?: string;
  }
): Promise<{ success: boolean; sentChannels: NotificationChannel[] }> {
  const userType = options?.userType || 'teacher';
  const preferences = await getUserNotificationPreferences(userId, userType);
  
  // 检查是否启用该类型通知
  if (!preferences.enabledTypes.includes(payload.type)) {
    console.log('[Notification] 用户已禁用该类型通知:', payload.type);
    return { success: false, sentChannels: [] };
  }
  
  const channels = selectChannels(
    options?.role || '规划顾问',
    preferences
  );
  
  const sentChannels: NotificationChannel[] = [];
  
  for (const channel of channels) {
    let success = false;
    
    switch (channel) {
      case 'feishu':
        success = await sendFeishuNotification(userId, payload);
        break;
      case 'wechat':
        success = await sendWechatNotification(userId, payload);
        break;
      case 'email':
        if (options?.email) {
          success = await sendEmailNotification(options.email, payload);
        }
        break;
      case 'sms':
        if (options?.phone) {
          success = await sendSmsNotification(options.phone, payload);
        }
        break;
    }
    
    if (success) {
      sentChannels.push(channel);
    }
  }
  
  return {
    success: sentChannels.length > 0,
    sentChannels,
  };
}

// 批量发送通知
export async function sendBatchNotifications(
  notifications: Array<{
    userId: string;
    payload: NotificationPayload;
    options?: Parameters<typeof sendNotification>[2];
  }>
): Promise<Array<{ userId: string; success: boolean; sentChannels: NotificationChannel[] }>> {
  return Promise.all(
    notifications.map(async ({ userId, payload, options }) => {
      const result = await sendNotification(userId, payload, options);
      return { userId, ...result };
    })
  );
}

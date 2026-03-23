# 混合工作流设计方案

## 📊 用户群体分析

### 全职导师（有飞书账号）
- ✅ 可使用飞书全部功能
- ✅ 日历同步、消息推送、审批流程
- ✅ 机器人交互、多维表格协作

### 兼职导师（无飞书账号）
- ❌ 无法使用飞书功能
- ✅ 需要通过微信/邮件/短信接收通知
- ✅ 通过Web系统进行操作

### 学生（无飞书账号）
- ❌ 无法使用飞书功能
- ✅ 需要通过微信/邮件/短信接收通知
- ✅ 通过Web系统或小程序进行操作

---

## 🎯 核心设计原则

### 1. 多渠道通知机制
系统支持多种通知方式，根据用户的配置自动选择：

```typescript
// 用户通知配置
interface UserNotificationConfig {
  userId: string;
  userType: 'student' | 'teacher';
  
  // 飞书（仅全职导师）
  feishuEnabled: boolean;
  feishuOpenId?: string;
  
  // 微信（所有用户）
  wechatEnabled: boolean;
  wechatOpenId?: string;
  
  // 邮件（所有用户）
  emailEnabled: boolean;
  email?: string;
  
  // 短信（所有用户）
  smsEnabled: boolean;
  phone?: string;
  
  // 通知偏好
  preferredChannel: 'feishu' | 'wechat' | 'email' | 'sms';
}
```

### 2. 适配器模式
为不同通知渠道创建统一接口：

```typescript
// 通知适配器接口
interface NotificationAdapter {
  send(userId: string, message: NotificationMessage): Promise<void>;
  sendBatch(userIds: string[], message: NotificationMessage): Promise<void>;
}

// 通知消息结构
interface NotificationMessage {
  title: string;
  content: string;
  type: 'schedule' | 'reminder' | 'approval' | 'alert';
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

// 通知动作（用于卡片消息）
interface NotificationAction {
  label: string;
  url?: string;
  callback?: string;
}
```

---

## 🔧 实现方案

### 一、数据表设计

```sql
-- 用户通知配置表
CREATE TABLE user_notification_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- student/teacher
  
  -- 飞书配置（仅全职导师）
  feishu_enabled BOOLEAN DEFAULT FALSE,
  feishu_open_id VARCHAR(100),
  feishu_email VARCHAR(100),
  
  -- 微信配置（所有用户）
  wechat_enabled BOOLEAN DEFAULT FALSE,
  wechat_open_id VARCHAR(100),
  wechat_union_id VARCHAR(100),
  
  -- 邮件配置（所有用户）
  email_enabled BOOLEAN DEFAULT FALSE,
  email VARCHAR(100),
  
  -- 短信配置（所有用户）
  sms_enabled BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  
  -- 通知偏好
  preferred_channel VARCHAR(20), -- feishu/wechat/email/sms
  reminder_settings JSONB, -- 提醒设置
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, user_type)
);

-- 修改导师表，增加类型和通知配置
ALTER TABLE teachers ADD COLUMN teacher_type VARCHAR(20) DEFAULT 'full_time'; -- full_time/part_time
ALTER TABLE teachers ADD COLUMN notification_config_id VARCHAR(36);

-- 修改学生表，增加通知配置
ALTER TABLE students ADD COLUMN notification_config_id VARCHAR(36);

-- 通知历史表
CREATE TABLE notification_history (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- feishu/wechat/email/sms
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  content TEXT,
  status VARCHAR(20), -- pending/sent/failed
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 二、通知服务架构

```typescript
// src/lib/notification-service.ts

import { feishuMessage } from './feishu-adapter';
import { wechatMessage } from './wechat-adapter';
import { emailService } from './email-adapter';
import { smsService } from './sms-adapter';

/**
 * 统一通知服务
 */
export class NotificationService {
  /**
   * 发送通知（自动选择渠道）
   */
  async send(userId: string, userType: 'student' | 'teacher', message: NotificationMessage): Promise<void> {
    // 获取用户通知配置
    const config = await this.getUserNotificationConfig(userId, userType);
    
    if (!config) {
      console.warn(`用户 ${userId} 未配置通知方式`);
      return;
    }
    
    // 根据优先级尝试发送
    const channels = this.getChannelPriority(config);
    
    for (const channel of channels) {
      try {
        await this.sendByChannel(channel, config, message);
        await this.recordNotification(userId, userType, channel, message, 'sent');
        return; // 发送成功，退出
      } catch (error) {
        console.error(`通过 ${channel} 发送失败:`, error);
        await this.recordNotification(userId, userType, channel, message, 'failed', error.message);
        // 继续尝试下一个渠道
      }
    }
    
    throw new Error('所有通知渠道都发送失败');
  }
  
  /**
   * 批量发送通知
   */
  async sendBatch(
    users: Array<{ id: string; type: 'student' | 'teacher' }>,
    message: NotificationMessage
  ): Promise<void> {
    // 按通知渠道分组
    const groups = await this.groupUsersByChannel(users);
    
    // 并行发送
    await Promise.all([
      // 飞书组
      this.sendFeishuBatch(groups.feishu, message),
      // 微信组
      this.sendWechatBatch(groups.wechat, message),
      // 邮件组
      this.sendEmailBatch(groups.email, message),
      // 短信组
      this.sendSmsBatch(groups.sms, message),
    ]);
  }
  
  /**
   * 获取用户通知配置
   */
  private async getUserNotificationConfig(userId: string, userType: string): Promise<UserNotificationConfig | null> {
    try {
      const result = await db
        .select()
        .from(userNotificationConfigs)
        .where(and(
          eq(userNotificationConfigs.userId, userId),
          eq(userNotificationConfigs.userType, userType)
        ))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('获取用户通知配置失败:', error);
      return null;
    }
  }
  
  /**
   * 获取渠道优先级
   */
  private getChannelPriority(config: UserNotificationConfig): string[] {
    const channels: string[] = [];
    
    // 首选渠道
    if (config.preferredChannel) {
      channels.push(config.preferredChannel);
    }
    
    // 备选渠道（按优先级）
    if (config.feishuEnabled && config.feishuOpenId) {
      if (!channels.includes('feishu')) channels.push('feishu');
    }
    if (config.wechatEnabled && config.wechatOpenId) {
      if (!channels.includes('wechat')) channels.push('wechat');
    }
    if (config.emailEnabled && config.email) {
      if (!channels.includes('email')) channels.push('email');
    }
    if (config.smsEnabled && config.phone) {
      if (!channels.includes('sms')) channels.push('sms');
    }
    
    return channels;
  }
  
  /**
   * 通过指定渠道发送
   */
  private async sendByChannel(
    channel: string,
    config: UserNotificationConfig,
    message: NotificationMessage
  ): Promise<void> {
    switch (channel) {
      case 'feishu':
        if (!config.feishuOpenId) throw new Error('未配置飞书ID');
        await feishuMessage.sendCardMessage(config.feishuOpenId, this.buildFeishuCard(message));
        break;
        
      case 'wechat':
        if (!config.wechatOpenId) throw new Error('未配置微信OpenID');
        await wechatMessage.sendTemplate(config.wechatOpenId, message);
        break;
        
      case 'email':
        if (!config.email) throw new Error('未配置邮箱');
        await emailService.send(config.email, message.title, message.content);
        break;
        
      case 'sms':
        if (!config.phone) throw new Error('未配置手机号');
        await smsService.send(config.phone, message.content);
        break;
        
      default:
        throw new Error(`不支持的通知渠道: ${channel}`);
    }
  }
  
  /**
   * 构建飞书卡片消息
   */
  private buildFeishuCard(message: NotificationMessage): any {
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: message.title },
          template: this.getCardColor(message.type)
        },
        elements: [
          {
            tag: 'div',
            text: { tag: 'lark_md', content: message.content }
          },
          ...(message.actions ? [{
            tag: 'action',
            actions: message.actions.map(action => ({
              tag: 'button',
              text: { tag: 'plain_text', content: action.label },
              type: 'primary',
              url: action.url
            }))
          }] : [])
        ]
      }
    };
  }
  
  /**
   * 记录通知历史
   */
  private async recordNotification(
    userId: string,
    userType: string,
    channel: string,
    message: NotificationMessage,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(notificationHistory).values({
        id: generateId(),
        userId,
        userType,
        channel,
        type: message.type,
        title: message.title,
        content: message.content,
        status,
        errorMessage,
        sentAt: status === 'sent' ? new Date() : null
      });
    } catch (error) {
      console.error('记录通知历史失败:', error);
    }
  }
}

// 导出单例
export const notificationService = new NotificationService();
```

---

### 三、微信集成方案

```typescript
// src/lib/wechat-adapter.ts

/**
 * 微信公众号/小程序消息适配器
 * 支持模板消息推送
 */
export class WechatMessageAdapter {
  private appId: string;
  private appSecret: string;
  
  constructor() {
    this.appId = process.env.WECHAT_APP_ID || '';
    this.appSecret = process.env.WECHAT_APP_SECRET || '';
  }
  
  /**
   * 发送模板消息（公众号）
   */
  async sendTemplate(openId: string, message: NotificationMessage): Promise<void> {
    const accessToken = await this.getAccessToken();
    
    const templateId = this.getTemplateId(message.type);
    
    const data = {
      touser: openId,
      template_id: templateId,
      url: message.actions?.[0]?.url,
      data: {
        first: { value: message.title },
        keyword1: { value: message.content.substring(0, 20) },
        keyword2: { value: new Date().toLocaleString() },
        remark: { value: '点击查看详情' }
      }
    };
    
    const response = await fetch('https://api.weixin.qq.com/cgi-bin/message/template/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(`微信消息发送失败: ${result.errmsg}`);
    }
  }
  
  /**
   * 发送订阅消息（小程序）
   */
  async sendSubscribeMessage(openId: string, message: NotificationMessage): Promise<void> {
    const accessToken = await this.getAccessToken();
    
    const templateId = this.getSubscribeTemplateId(message.type);
    
    const data = {
      touser: openId,
      template_id: templateId,
      page: message.actions?.[0]?.url?.replace('https://your-domain.com', ''),
      data: {
        thing1: { value: message.title },
        thing2: { value: message.content.substring(0, 20) },
        time3: { value: new Date().toLocaleString() }
      }
    };
    
    const response = await fetch('https://api.weixin.qq.com/cgi-bin/message/subscribe/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(`微信订阅消息发送失败: ${result.errmsg}`);
    }
  }
  
  /**
   * 获取Access Token
   */
  private async getAccessToken(): Promise<string> {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
    );
    
    const result = await response.json();
    if (result.errcode) {
      throw new Error(`获取微信Access Token失败: ${result.errmsg}`);
    }
    
    return result.access_token;
  }
  
  /**
   * 获取模板ID
   */
  private getTemplateId(type: string): string {
    const templates: Record<string, string> = {
      schedule: process.env.WECHAT_TEMPLATE_SCHEDULE || '',
      reminder: process.env.WECHAT_TEMPLATE_REMINDER || '',
      approval: process.env.WECHAT_TEMPLATE_APPROVAL || '',
      alert: process.env.WECHAT_TEMPLATE_ALERT || ''
    };
    
    return templates[type] || templates.alert;
  }
}

export const wechatMessage = new WechatMessageAdapter();
```

---

### 四、具体业务场景实现

#### 场景1: 排课成功通知

```typescript
// src/lib/schedule-notification.ts

import { notificationService } from './notification-service';

/**
 * 排课成功通知
 */
export async function notifyScheduleCreated(schedule: ScheduleResult): Promise<void> {
  const student = await getStudent(schedule.studentId);
  const teacher = await getTeacher(schedule.teacherId);
  const course = await getCourse(schedule.courseId);
  
  // 通知学生
  await notificationService.send(student.id, 'student', {
    title: '📚 课程已安排',
    content: `课程：${course.name}\n导师：${teacher.name}\n时间：${schedule.date} ${schedule.timeSlot}\n时长：${schedule.hours}小时`,
    type: 'schedule',
    data: {
      scheduleId: schedule.id,
      courseId: course.id
    },
    actions: [
      {
        label: '查看详情',
        url: `https://your-domain.com/schedules/${schedule.id}`
      }
    ]
  });
  
  // 通知导师
  await notificationService.send(teacher.id, 'teacher', {
    title: '📅 新课程安排',
    content: `学生：${student.name}\n课程：${course.name}\n时间：${schedule.date} ${schedule.timeSlot}\n时长：${schedule.hours}小时`,
    type: 'schedule',
    data: {
      scheduleId: schedule.id,
      studentId: student.id
    },
    actions: [
      {
        label: '查看详情',
        url: `https://your-domain.com/schedules/${schedule.id}`
      }
    ]
  });
  
  // 如果是全职导师，额外创建日历事件
  if (teacher.teacherType === 'full_time' && teacher.notificationConfig?.feishuOpenId) {
    await createFeishuCalendarEvent(schedule);
  }
}
```

#### 场景2: 上课提醒

```typescript
/**
 * 上课提醒（课前1小时/1天）
 */
export async function sendClassReminder(scheduleId: string, timing: '1day' | '1hour'): Promise<void> {
  const schedule = await getSchedule(scheduleId);
  const student = await getStudent(schedule.studentId);
  const teacher = await getTeacher(schedule.teacherId);
  const course = await getCourse(schedule.courseId);
  
  const timingText = timing === '1day' ? '明天' : '1小时后';
  
  // 通知学生
  await notificationService.send(student.id, 'student', {
    title: '⏰ 课程提醒',
    content: `${timingText}有课程安排\n课程：${course.name}\n导师：${teacher.name}\n时间：${schedule.timeSlot}`,
    type: 'reminder',
    data: {
      scheduleId: schedule.id
    }
  });
  
  // 通知导师
  await notificationService.send(teacher.id, 'teacher', {
    title: '⏰ 课程提醒',
    content: `${timingText}有课程安排\n学生：${student.name}\n课程：${course.name}\n时间：${schedule.timeSlot}`,
    type: 'reminder',
    data: {
      scheduleId: schedule.id
    },
    actions: [
      {
        label: '查看课程详情',
        url: `https://your-domain.com/schedules/${schedule.id}`
      }
    ]
  });
}
```

#### 场景3: 上课记录填写提醒

```typescript
/**
 * 上课记录填写提醒
 */
export async function sendClassRecordReminder(scheduleId: string): Promise<void> {
  const schedule = await getSchedule(scheduleId);
  const student = await getStudent(schedule.studentId);
  const teacher = await getTeacher(schedule.teacherId);
  const course = await getCourse(schedule.courseId);
  
  // 只通知导师
  await notificationService.send(teacher.id, 'teacher', {
    title: '📝 上课记录待填写',
    content: `学生：${student.name}\n课程：${course.name}\n时间：${schedule.date} ${schedule.timeSlot}`,
    type: 'reminder',
    data: {
      scheduleId: schedule.id
    },
    actions: [
      {
        label: '立即填写',
        url: `https://your-domain.com/class-records/new?scheduleId=${schedule.id}`
      }
    ]
  });
}
```

#### 场景4: 选课单审批通知

```typescript
/**
 * 选课单审批通知（仅通知全职导师）
 */
export async function notifySelectionFormApproval(formId: string): Promise<void> {
  const form = await getSelectionForm(formId);
  const student = await getStudent(form.studentId);
  const teacher = await getTeacher(form.consultationTeacherId);
  
  // 只有全职导师才能在飞书中审批
  if (teacher.teacherType === 'full_time' && teacher.notificationConfig?.feishuOpenId) {
    // 使用飞书审批流程
    await createFeishuApproval(form, teacher);
  } else {
    // 兼职导师通过Web系统审批
    await notificationService.send(teacher.id, 'teacher', {
      title: '📋 选课单待审批',
      content: `学生：${student.name}\n总课时：${form.totalPlannedHours}\n预计周期：${form.estimatedStartDate} ~ ${form.estimatedEndDate}`,
      type: 'approval',
      data: {
        formId: form.id
      },
      actions: [
        {
          label: '立即审批',
          url: `https://your-domain.com/selection-forms/${form.id}/approve`
        }
      ]
    });
  }
}
```

---

### 五、定时任务设计

```typescript
// src/lib/scheduled-tasks.ts

import cron from 'node-cron';

/**
 * 定时任务：上课提醒
 */
export function setupReminderTasks(): void {
  // 每小时检查是否有1小时后的课程
  cron.schedule('0 * * * *', async () => {
    const schedules = await getSchedulesAfter(1, 'hour');
    for (const schedule of schedules) {
      await sendClassReminder(schedule.id, '1hour');
    }
  });
  
  // 每天8点检查明天的课程
  cron.schedule('0 8 * * *', async () => {
    const schedules = await getSchedulesAfter(1, 'day');
    for (const schedule of schedules) {
      await sendClassReminder(schedule.id, '1day');
    }
  });
  
  // 每小时检查未填写的上课记录
  cron.schedule('0 * * * *', async () => {
    const unrecordedSchedules = await getUnrecordedSchedules(24); // 24小时前
    for (const schedule of unrecordedSchedules) {
      await sendClassRecordReminder(schedule.id);
    }
  });
  
  // 每周一早上生成学习进度报告
  cron.schedule('0 9 * * 1', async () => {
    const students = await getAllActiveStudents();
    for (const student of students) {
      await generateProgressReport(student.id, 'weekly');
    }
  });
}
```

---

## 📱 用户端优化

### 一、Web系统优化

为兼职导师和学生提供更好的Web体验：

#### 1. 个人中心 - 通知设置

```typescript
// src/app/settings/notifications/page.tsx

export default function NotificationSettingsPage() {
  const [config, setConfig] = useState<UserNotificationConfig>();
  
  return (
    <div className="space-y-6">
      <h1>通知设置</h1>
      
      {/* 微信绑定 */}
      <Card>
        <CardHeader>
          <CardTitle>微信通知</CardTitle>
          <CardDescription>绑定微信后，可通过微信接收课程通知</CardDescription>
        </CardHeader>
        <CardContent>
          {config?.wechatOpenId ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              <span>已绑定微信</span>
              <Button variant="link" onClick={handleUnbindWechat}>解绑</Button>
            </div>
          ) : (
            <Button onClick={handleBindWechat}>
              <MessageCircle className="mr-2 h-4 w-4" />
              绑定微信
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* 邮件通知 */}
      <Card>
        <CardHeader>
          <CardTitle>邮件通知</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config?.emailEnabled}
                onCheckedChange={handleEmailToggle}
              />
              <Label>启用邮件通知</Label>
            </div>
            {config?.emailEnabled && (
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={config?.email || ''}
                onChange={handleEmailChange}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 短信通知 */}
      <Card>
        <CardHeader>
          <CardTitle>短信通知</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config?.smsEnabled}
                onCheckedChange={handleSmsToggle}
              />
              <Label>启用短信通知</Label>
            </div>
            {config?.smsEnabled && (
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={config?.phone || ''}
                onChange={handlePhoneChange}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 通知偏好 */}
      <Card>
        <CardHeader>
          <CardTitle>通知偏好</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={config?.preferredChannel} onValueChange={handlePreferredChannelChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="wechat" id="wechat" />
              <Label htmlFor="wechat">微信（推荐）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email">邮件</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sms" id="sms" />
              <Label htmlFor="sms">短信</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* 提醒设置 */}
      <Card>
        <CardHeader>
          <CardTitle>提醒设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>课前1天提醒</Label>
              <Switch
                checked={config?.reminderSettings?.oneDayBefore}
                onCheckedChange={(checked) => handleReminderChange('oneDayBefore', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>课前1小时提醒</Label>
              <Switch
                checked={config?.reminderSettings?.oneHourBefore}
                onCheckedChange={(checked) => handleReminderChange('oneHourBefore', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>上课记录填写提醒</Label>
              <Switch
                checked={config?.reminderSettings?.classRecord}
                onCheckedChange={(checked) => handleReminderChange('classRecord', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2. 我的课表页面

```typescript
// src/app/schedules/my/page.tsx

export default function MySchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>我的课表</h1>
        <div className="flex gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            列表视图
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
          >
            日历视图
          </Button>
        </div>
      </div>
      
      {view === 'list' ? (
        <ScheduleList schedules={schedules} />
      ) : (
        <ScheduleCalendar schedules={schedules} />
      )}
      
      {/* 导出功能 */}
      <Card>
        <CardHeader>
          <CardTitle>导出课表</CardTitle>
          <CardDescription>导出到其他日历应用</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={exportToGoogle}>
            导出到 Google 日历
          </Button>
          <Button onClick={exportToOutlook}>
            导出到 Outlook
          </Button>
          <Button onClick={exportToICS}>
            下载 .ics 文件
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 二、微信小程序（可选）

为学生和兼职导师提供更便捷的移动端体验：

#### 小程序功能模块

1. **我的课表**
   - 查看今日/本周课程
   - 课程详情
   - 导航到上课地点

2. **学习进度**
   - 查看各课程进度
   - 已完成课时统计
   - 学习报告查看

3. **消息通知**
   - 接收课程通知
   - 查看历史消息
   - 点击跳转到详情页

4. **个人中心**
   - 个人信息管理
   - 通知设置
   - 联系客服

---

## 🔄 工作流程总结

### 完整的通知流程

```
用户触发事件（如：排课成功）
        ↓
系统判断用户类型和通知配置
        ↓
    ┌───────────────────┐
    │   全职导师        │ → 飞书通知 + 日历同步
    └───────────────────┘
    
    ┌───────────────────┐
    │   兼职导师        │ → 检查通知配置
    │   ├─ 微信已绑定   │ → 微信模板消息
    │   ├─ 邮件已配置   │ → 邮件通知
    │   └─ 短信已配置   │ → 短信通知
    └───────────────────┘
    
    ┌───────────────────┐
    │   学生            │ → 检查通知配置
    │   ├─ 微信已绑定   │ → 微信模板消息
    │   ├─ 邮件已配置   │ → 邮件通知
    │   └─ 短信已配置   │ → 短信通知
    └───────────────────┘
        ↓
记录通知历史
```

---

## 💰 成本对比

### 飞书方案（全职导师）
- ✅ 无额外费用（企业版已包含）
- ✅ 功能最完整
- ✅ 体验最佳

### 微信方案（兼职导师+学生）
- ⚠️ 需要认证公众号（300元/年）
- ⚠️ 模板消息需要用户关注公众号
- ✅ 触达率高，用户习惯好

### 邮件方案（备选）
- ✅ 基本免费（使用SendGrid等免费额度）
- ⚠️ 打开率较低
- ✅ 适合非紧急通知

### 短信方案（兜底）
- ⚠️ 按条收费（约0.05元/条）
- ✅ 触达率最高
- ⚠️ 成本较高，仅用于重要通知

---

## 🎯 实施建议

### 阶段一：基础通知（1-2周）
1. 实现通知服务架构
2. 完成飞书通知（全职导师）
3. 完成邮件通知（所有用户）

### 阶段二：微信集成（2-3周）
1. 申请微信公众号
2. 实现微信绑定功能
3. 实现模板消息推送
4. （可选）开发微信小程序

### 阶段三：短信集成（1周）
1. 接入短信服务商（阿里云/腾讯云）
2. 实现短信发送
3. 仅用于重要通知

### 阶段四：优化体验（持续）
1. Web端通知设置页面
2. 课表导出功能
3. 定时任务优化
4. 用户反馈收集

---

## 📊 预期效果

### 全职导师（飞书）
- ✅ 完整的飞书体验
- ✅ 日历自动同步
- ✅ 卡片消息交互

### 兼职导师
- ✅ 微信/邮件及时通知
- ✅ Web端完整功能
- ✅ 不影响正常工作

### 学生
- ✅ 微信/邮件及时通知
- ✅ Web/小程序查看课表
- ✅ 学习进度可视化

---

**这个方案既充分利用了全职导师的飞书能力，又为兼职导师和学生提供了便捷的替代方案，确保所有用户都能及时接收到重要通知！**

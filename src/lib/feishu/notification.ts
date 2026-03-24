/**
 * 飞书消息通知服务
 * 
 * 提供课程提醒、审批通知、系统通知等功能
 */

import { getFeishuClient, isFeishuEnabled } from './client';

// 消息类型定义
export interface CourseReminderData {
  courseName: string;
  studentName: string;
  teacherName: string;
  time: string;
  location?: string;
  scheduleId: string;
}

export interface ApprovalNotificationData {
  type: '选课单审批' | '时间调整审批' | '请假审批' | '课程变更审批';
  applicant: string;
  status: '待审批' | '已通过' | '已拒绝';
  link?: string;
  comment?: string;
}

export interface ScheduleChangeData {
  changeType: '新增' | '修改' | '取消';
  courseName: string;
  studentName: string;
  teacherName: string;
  oldTime?: string;
  newTime?: string;
  reason?: string;
}

export interface ClassRecordData {
  courseName: string;
  studentName: string;
  teacherName: string;
  time: string;
  duration: number;
  content: string;
  homework?: string;
}

/**
 * 飞书消息通知服务
 */
export class FeishuNotificationService {
  /**
   * 发送课程提醒（上课前N分钟）
   */
  async sendCourseReminder(
    openId: string,
    data: CourseReminderData,
    reminderType: '1小时前' | '1天前' | '自定义'
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      console.log('[Feishu] 飞书未启用，跳过课程提醒');
      return false;
    }

    try {
      const card = {
        config: {
          wide_screen_mode: true,
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '📚 课程提醒',
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            fields: [
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**提醒时间**\n${reminderType}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**课程名称**\n${data.courseName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**学生**\n${data.studentName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**导师**\n${data.teacherName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**上课时间**\n${data.time}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**上课地点**\n${data.location || '线上'}`,
                },
              },
            ],
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '查看详情',
                },
                type: 'primary',
                url: `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/schedule/${data.scheduleId}`,
              },
            ],
          },
        ],
      };

      await client.sendCardMessage(openId, 'open_id', card);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送课程提醒失败:', error);
      return false;
    }
  }

  /**
   * 发送排课成功通知
   */
  async sendScheduleCreatedNotification(
    openId: string,
    data: {
      courseName: string;
      studentName: string;
      teacherName: string;
      time: string;
      scheduleId: string;
    }
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      const card = {
        config: {
          wide_screen_mode: true,
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '✅ 新课程已安排',
          },
          template: 'green',
        },
        elements: [
          {
            tag: 'div',
            fields: [
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**课程**\n${data.courseName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**学生**\n${data.studentName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**导师**\n${data.teacherName}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**时间**\n${data.time}`,
                },
              },
            ],
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '确认参加',
                },
                type: 'primary',
                value: {
                  schedule_id: data.scheduleId,
                  action: 'confirm',
                },
              },
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '申请调整',
                },
                type: 'default',
                value: {
                  schedule_id: data.scheduleId,
                  action: 'adjust',
                },
              },
            ],
          },
        ],
      };

      await client.sendCardMessage(openId, 'open_id', card);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送排课通知失败:', error);
      return false;
    }
  }

  /**
   * 发送课程变更通知
   */
  async sendScheduleChangeNotification(
    openId: string,
    data: ScheduleChangeData
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      const templateMap = {
        '新增': 'green',
        '修改': 'orange',
        '取消': 'red',
      };

      const cardElements: unknown[] = [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**课程**\n${data.courseName}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**学生**\n${data.studentName}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**导师**\n${data.teacherName}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**变更类型**\n${data.changeType}`,
              },
            },
          ],
        },
      ];

      // 如果是修改，显示新旧时间
      if (data.changeType === '修改' && data.oldTime && data.newTime) {
        cardElements.push({
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**原时间**\n${data.oldTime}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**新时间**\n${data.newTime}`,
              },
            },
          ],
        });
      }

      // 如果有原因
      if (data.reason) {
        cardElements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**原因**\n${data.reason}`,
          },
        });
      }

      const card = {
        config: {
          wide_screen_mode: true,
        },
        header: {
          title: {
            tag: 'plain_text',
            content: `📅 课程${data.changeType}通知`,
          },
          template: templateMap[data.changeType],
        },
        elements: cardElements,
      };

      await client.sendCardMessage(openId, 'open_id', card);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送课程变更通知失败:', error);
      return false;
    }
  }

  /**
   * 发送审批通知
   */
  async sendApprovalNotification(
    openId: string,
    data: ApprovalNotificationData
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      const statusTemplateMap = {
        '待审批': 'blue',
        '已通过': 'green',
        '已拒绝': 'red',
      };

      const statusIconMap = {
        '待审批': '⏳',
        '已通过': '✅',
        '已拒绝': '❌',
      };

      const cardElements: unknown[] = [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**申请人**\n${data.applicant}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**状态**\n${data.status}`,
              },
            },
          ],
        },
      ];

      // 如果有审批意见
      if (data.comment) {
        cardElements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**审批意见**\n${data.comment}`,
          },
        });
      }

      // 如果有链接
      if (data.link) {
        cardElements.push({
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '查看详情',
              },
              type: 'primary',
              url: data.link,
            },
          ],
        });
      }

      const card = {
        config: {
          wide_screen_mode: true,
        },
        header: {
          title: {
            tag: 'plain_text',
            content: `${statusIconMap[data.status]} ${data.type}`,
          },
          template: statusTemplateMap[data.status],
        },
        elements: cardElements,
      };

      await client.sendCardMessage(openId, 'open_id', card);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送审批通知失败:', error);
      return false;
    }
  }

  /**
   * 发送上课记录通知
   */
  async sendClassRecordNotification(
    openId: string,
    data: ClassRecordData,
    type: '学生' | '导师'
  ): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      const cardElements: unknown[] = [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**课程**\n${data.courseName}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**时长**\n${data.duration}小时`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**时间**\n${data.time}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: type === '学生' ? `**导师**\n${data.teacherName}` : `**学生**\n${data.studentName}`,
              },
            },
          ],
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**上课内容**\n${data.content}`,
          },
        },
      ];

      // 如果有作业
      if (data.homework) {
        cardElements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**课后作业**\n${data.homework}`,
          },
        });
      }

      const card = {
        config: {
          wide_screen_mode: true,
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '📝 上课记录已更新',
          },
          template: 'purple',
        },
        elements: cardElements,
      };

      await client.sendCardMessage(openId, 'open_id', card);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送上课记录通知失败:', error);
      return false;
    }
  }

  /**
   * 发送简单文本消息
   */
  async sendTextMessage(openId: string, text: string): Promise<boolean> {
    const client = getFeishuClient();
    if (!client) {
      return false;
    }

    try {
      await client.sendTextMessage(openId, 'open_id', text);
      return true;
    } catch (error) {
      console.error('[Feishu] 发送文本消息失败:', error);
      return false;
    }
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(
    openIds: string[],
    messageFactory: (openId: string) => Promise<boolean>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const openId of openIds) {
      try {
        const result = await messageFactory(openId);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }
}

// 导出单例
export const feishuNotificationService = new FeishuNotificationService();

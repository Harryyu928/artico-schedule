/**
 * 飞书Webhook事件处理 API
 * 
 * POST /api/feishu/webhook
 * 接收并处理飞书推送的事件消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeishuClient, isFeishuEnabled, feishuNotificationService } from '@/lib/feishu';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/feishu/webhook
 * 处理飞书事件推送
 */
export async function POST(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.json({ error: '飞书集成未启用' }, { status: 400 });
  }

  const body = await request.text();
  const timestamp = request.headers.get('X-Lark-Request-Timestamp') || '';
  const nonce = request.headers.get('X-Lark-Request-Nonce') || '';
  const signature = request.headers.get('X-Lark-Signature') || '';

  const client = getFeishuClient();
  if (!client) {
    return NextResponse.json({ error: '飞书客户端初始化失败' }, { status: 500 });
  }

  // 验证签名（可选，增强安全性）
  // if (!client.verifyEventSignature(timestamp, nonce, body, signature)) {
  //   return NextResponse.json({ error: '签名验证失败' }, { status: 401 });
  // }

  try {
    const event = JSON.parse(body);

    // 处理URL验证请求
    if (event.type === 'url_verification') {
      return NextResponse.json({ challenge: event.challenge });
    }

    // 处理不同类型的事件
    const { header, event: eventData } = event;

    if (!header || !eventData) {
      return NextResponse.json({ error: '无效的事件格式' }, { status: 400 });
    }

    const eventType = header.event_type;
    console.log(`[Feishu] 收到事件: ${eventType}`);

    // 根据事件类型分发处理
    switch (eventType) {
      case 'im.message.receive_v1':
        await handleMessageReceived(eventData);
        break;
      
      case 'contact.user.created_v3':
        await handleUserCreated(eventData);
        break;
      
      case 'contact.user.updated_v3':
        await handleUserUpdated(eventData);
        break;
      
      case 'approval.instance':
        await handleApprovalInstance(eventData);
        break;
      
      case 'calendar.event.created_v4':
        await handleCalendarEventCreated(eventData);
        break;
      
      case 'calendar.event.updated_v4':
        await handleCalendarEventUpdated(eventData);
        break;
      
      case 'calendar.event.deleted_v4':
        await handleCalendarEventDeleted(eventData);
        break;
      
      default:
        console.log(`[Feishu] 未处理的事件类型: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feishu] 处理事件失败:', error);
    return NextResponse.json(
      { error: '处理事件失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理消息接收事件
 */
async function handleMessageReceived(eventData: any) {
  const { message } = eventData;
  if (!message) return;

  const { message_id, content, message_type, sender } = message;
  const senderId = sender?.sender_id?.open_id;

  console.log(`[Feishu] 收到消息: ${message_id}, 类型: ${message_type}`);

  // 处理卡片消息回调
  if (message_type === 'interactive') {
    await handleCardCallback(message_id, content, senderId);
    return;
  }

  // 处理文本消息
  if (message_type === 'text') {
    const textContent = JSON.parse(content).text || '';
    console.log(`[Feishu] 消息内容: ${textContent}`);

    // 查找用户
    const user = await db.query.users.findFirst({
      where: eq(users.feishuOpenId, senderId),
    });

    if (!user) {
      // 用户未绑定，提示绑定
      const client = getFeishuClient();
      if (client) {
        await client.replyMessage(message_id, 'text', {
          text: '您好！您尚未绑定ARTiCO系统账号，请先登录系统完成绑定。',
        });
      }
      return;
    }

    // 处理指令
    const lowerText = textContent.toLowerCase().trim();
    
    if (lowerText === '帮助' || lowerText === 'help') {
      await sendHelpMessage(message_id);
    } else if (lowerText === '课程' || lowerText === 'schedule') {
      await sendScheduleSummary(message_id, user.id);
    } else if (lowerText === '进度' || lowerText === 'progress') {
      await sendProgressSummary(message_id, user.id);
    } else {
      // 默认回复
      const client = getFeishuClient();
      if (client) {
        await client.replyMessage(message_id, 'text', {
          text: `收到您的消息: "${textContent}"\n\n输入"帮助"查看可用指令。`,
        });
      }
    }
  }
}

/**
 * 处理卡片消息回调
 */
async function handleCardCallback(messageId: string, content: string, senderId: string) {
  try {
    const cardContent = JSON.parse(content);
    const action = cardContent?.action;
    const value = cardContent?.value || {};

    console.log(`[Feishu] 卡片回调: action=${action}, value=`, value);

    const client = getFeishuClient();
    if (!client) return;

    switch (action) {
      case 'confirm':
        // 确认参加课程
        await client.replyMessage(messageId, 'text', {
          text: '已确认参加课程，期待您的到来！',
        });
        break;
      
      case 'adjust':
        // 申请调整课程
        await client.replyMessage(messageId, 'text', {
          text: '已收到您的调整申请，请等待顾问处理。',
        });
        break;
      
      case 'approve':
        // 审批通过
        await client.replyMessage(messageId, 'text', {
          text: '审批已通过，系统将自动处理后续流程。',
        });
        break;
      
      case 'reject':
        // 审批拒绝
        await client.replyMessage(messageId, 'text', {
          text: '审批已拒绝，相关方将收到通知。',
        });
        break;
      
      default:
        console.log(`[Feishu] 未知的卡片动作: ${action}`);
    }
  } catch (error) {
    console.error('[Feishu] 处理卡片回调失败:', error);
  }
}

/**
 * 处理用户创建事件
 */
async function handleUserCreated(eventData: any) {
  const { user } = eventData;
  console.log(`[Feishu] 新用户创建: ${user?.name}`);
  // 可以在这里自动同步用户信息
}

/**
 * 处理用户更新事件
 */
async function handleUserUpdated(eventData: any) {
  const { user } = eventData;
  console.log(`[Feishu] 用户信息更新: ${user?.name}`);
  // 可以在这里同步用户信息更新
}

/**
 * 处理审批实例事件
 */
async function handleApprovalInstance(eventData: any) {
  const { instance_code, status } = eventData;
  console.log(`[Feishu] 审批实例: ${instance_code}, 状态: ${status}`);
  // 同步审批状态到系统
}

/**
 * 处理日历事件创建
 */
async function handleCalendarEventCreated(eventData: any) {
  const { event_id, summary } = eventData;
  console.log(`[Feishu] 日历事件创建: ${event_id}, ${summary}`);
}

/**
 * 处理日历事件更新
 */
async function handleCalendarEventUpdated(eventData: any) {
  const { event_id, summary } = eventData;
  console.log(`[Feishu] 日历事件更新: ${event_id}, ${summary}`);
}

/**
 * 处理日历事件删除
 */
async function handleCalendarEventDeleted(eventData: any) {
  const { event_id } = eventData;
  console.log(`[Feishu] 日历事件删除: ${event_id}`);
}

/**
 * 发送帮助消息
 */
async function sendHelpMessage(messageId: string) {
  const client = getFeishuClient();
  if (!client) return;

  await client.replyMessage(messageId, 'text', {
    text: `📚 ARTiCO智能助手

可用指令:
• 帮助/help - 查看帮助信息
• 课程/schedule - 查看近期课程安排
• 进度/progress - 查看学习进度

如有其他问题，请联系您的规划顾问。`,
  });
}

/**
 * 发送课程安排摘要
 */
async function sendScheduleSummary(messageId: string, userId: string) {
  const client = getFeishuClient();
  if (!client) return;

  // TODO: 查询用户的课程安排
  await client.replyMessage(messageId, 'text', {
    text: `📅 近期课程安排

暂无近期课程安排，请联系您的规划顾问。`,
  });
}

/**
 * 发送学习进度摘要
 */
async function sendProgressSummary(messageId: string, userId: string) {
  const client = getFeishuClient();
  if (!client) return;

  // TODO: 查询用户的学习进度
  await client.replyMessage(messageId, 'text', {
    text: `📊 学习进度

暂无学习进度数据，请联系您的规划顾问。`,
  });
}

/**
 * GET /api/feishu/webhook
 * 用于验证webhook URL
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({ status: 'ok', message: '飞书Webhook端点已就绪' });
}

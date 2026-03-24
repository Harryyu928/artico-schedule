/**
 * 飞书测试消息 API
 * 
 * POST /api/feishu/test-message
 * 发送测试消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeishuEnabled, getFeishuClient } from '@/lib/feishu';

/**
 * POST /api/feishu/test-message
 * 发送测试消息到指定用户
 */
export async function POST(request: NextRequest) {
  if (!isFeishuEnabled()) {
    return NextResponse.json({ 
      success: false, 
      error: '飞书集成未启用' 
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { openId, message } = body as { openId: string; message: string };

    if (!openId) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少接收者ID' 
      }, { status: 400 });
    }

    const client = getFeishuClient();
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: '飞书客户端初始化失败' 
      }, { status: 500 });
    }

    // 发送测试卡片消息
    const card = {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '🧪 ARTiCO 测试消息',
        },
        template: 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: message,
          },
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `_发送时间: ${new Date().toLocaleString('zh-CN')}_`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '访问系统',
              },
              type: 'primary',
              url: process.env.COZE_PROJECT_DOMAIN_DEFAULT,
            },
          ],
        },
      ],
    };

    const messageId = await client.sendCardMessage(openId, 'open_id', card);

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error('[Feishu] 发送测试消息失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

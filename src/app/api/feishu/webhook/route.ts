/**
 * 飞书多维表格变更事件Webhook
 * 
 * 当飞书多维表格数据变更时，会推送到此接口
 * 需要在飞书开放平台配置事件订阅
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncTeachersFromFeishu, syncStudentsFromFeishu, syncClassRecordsFromFeishu } from '@/lib/feishu-sync-service';
import crypto from 'crypto';

// 飞书事件订阅验证Token（可在飞书开放平台配置）
const VERIFY_TOKEN = process.env.FEISHU_VERIFY_TOKEN || 'artico_feishu_token';
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY || '';

// 事件处理记录（防重复）
const processedEvents = new Set<string>();
const MAX_EVENTS = 1000;

/**
 * POST /api/feishu/webhook
 * 
 * 接收飞书事件推送
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Webhook] 收到飞书事件:', JSON.stringify(body).substring(0, 500));

    // 处理URL验证
    if (body.type === 'url_verification') {
      console.log('[Webhook] URL验证请求');
      return NextResponse.json({
        challenge: body.challenge,
      });
    }

    // 处理事件回调
    if (body.header?.event_type) {
      const eventId = body.header.event_id;
      
      // 防重复处理
      if (processedEvents.has(eventId)) {
        console.log('[Webhook] 事件已处理，跳过:', eventId);
        return NextResponse.json({ code: 0, msg: 'success' });
      }
      
      // 记录事件ID
      processedEvents.add(eventId);
      if (processedEvents.size > MAX_EVENTS) {
        // 清理旧事件
        const arr = Array.from(processedEvents);
        arr.slice(0, arr.length - MAX_EVENTS).forEach(id => processedEvents.delete(id));
      }

      // 异步处理事件
      handleEvent(body).catch(err => {
        console.error('[Webhook] 事件处理失败:', err);
      });

      return NextResponse.json({ code: 0, msg: 'success' });
    }

    return NextResponse.json({ code: 0, msg: 'unknown event' });

  } catch (error) {
    console.error('[Webhook] 处理失败:', error);
    return NextResponse.json(
      { code: -1, msg: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 处理飞书事件
 */
async function handleEvent(body: any) {
  const eventType = body.header?.event_type;
  const event = body.event;

  console.log('[Webhook] 处理事件:', eventType);

  switch (eventType) {
    // 多维表格记录变更事件
    case 'bitable.record.created':
    case 'bitable.record.updated':
    case 'bitable.record.deleted':
      await handleBitableRecordChange(event);
      break;

    // 其他事件
    default:
      console.log('[Webhook] 未处理的事件类型:', eventType);
  }
}

/**
 * 处理多维表格记录变更
 */
async function handleBitableRecordChange(event: any) {
  if (!event?.app_token || !event?.table_id) {
    console.log('[Webhook] 事件缺少表格信息');
    return;
  }

  const tableId = event.table_id;
  const appToken = event.app_token;

  console.log(`[Webhook] 多维表格变更: ${appToken}/${tableId}`);

  // 获取配置的表格ID
  const tableIds = {
    teachers: process.env.FEISHU_TABLE_TEACHERS,
    students: process.env.FEISHU_TABLE_STUDENTS,
    classRecords: process.env.FEISHU_TABLE_CLASS_RECORDS,
  };

  // 判断是哪个表变更，执行对应同步
  if (tableId === tableIds.teachers) {
    console.log('[Webhook] 同步导师数据...');
    await syncTeachersFromFeishu();
  } else if (tableId === tableIds.students) {
    console.log('[Webhook] 同步学生数据...');
    await syncStudentsFromFeishu();
  } else if (tableId === tableIds.classRecords) {
    console.log('[Webhook] 同步上课记录...');
    await syncClassRecordsFromFeishu();
  } else {
    console.log('[Webhook] 未知表格，跳过同步');
  }
}

/**
 * GET /api/feishu/webhook
 * 
 * 获取Webhook配置信息
 */
export async function GET() {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  
  return NextResponse.json({
    message: '飞书Webhook端点',
    webhookUrl: `${domain}/api/feishu/webhook`,
    config: {
      verifyToken: VERIFY_TOKEN ? '已配置' : '未配置',
      encryptKey: ENCRYPT_KEY ? '已配置' : '未配置',
    },
    instructions: {
      step1: '访问飞书开放平台 → 你的应用 → 事件订阅',
      step2: '添加事件订阅地址',
      step3: '添加以下事件权限：',
      events: [
        'bitable:record:created - 多维表格记录创建',
        'bitable:record:updated - 多维表格记录更新', 
        'bitable:record:deleted - 多维表格记录删除',
      ],
    },
  });
}

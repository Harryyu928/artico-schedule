/**
 * 排课飞书同步服务
 * 负责排课数据与飞书多维表格和日历的双向同步
 */

import { db } from '@/db';
import { scheduleResults, students, teachers, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getBitableService } from './feishu-bitable-service';

// 内置默认配置
const DEFAULT_FEISHU_CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
};

// 飞书配置（优先使用环境变量，否则使用内置默认值）
const FEISHU_CONFIG = {
  appId: process.env.FEISHU_APP_ID || DEFAULT_FEISHU_CONFIG.appId,
  appSecret: process.env.FEISHU_APP_SECRET || DEFAULT_FEISHU_CONFIG.appSecret,
  appToken: process.env.FEISHU_APP_TOKEN || DEFAULT_FEISHU_CONFIG.appToken,
  scheduleTableId: process.env.FEISHU_TABLE_SCHEDULES || '',
};

// 缓存访问令牌
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取飞书访问令牌
 */
async function getAccessToken(): Promise<string> {
  // 检查缓存
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_CONFIG.appId,
      app_secret: FEISHU_CONFIG.appSecret,
    }),
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`获取访问令牌失败: ${data.msg}`);
  }

  // 缓存令牌（提前5分钟过期）
  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return data.tenant_access_token;
}

/**
 * 将排课同步到飞书多维表格
 */
export async function syncScheduleToFeishu(scheduleId: string): Promise<string | null> {
  if (!FEISHU_CONFIG.scheduleTableId) {
    console.log('[ScheduleSync] 排课安排表未配置，跳过同步');
    return null;
  }

  try {
    // 获取排课详情
    const [schedule] = await db.select()
      .from(scheduleResults)
      .where(eq(scheduleResults.id, scheduleId))
      .limit(1);

    if (!schedule) {
      throw new Error('排课不存在');
    }

    // 获取关联的学生、导师、课程信息
    const [student] = await db.select().from(students).where(eq(students.id, schedule.studentId)).limit(1);
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, schedule.teacherId)).limit(1);
    const [course] = await db.select().from(courses).where(eq(courses.id, schedule.courseId)).limit(1);

    const token = await getAccessToken();

    // 准备飞书记录字段
    const fields: Record<string, any> = {
      '排课编号': schedule.scheduleId,
      '学生': student?.name || '',
      '导师': teacher?.name || '',
      '课程类别': course?.category || '',
      '计划日期': schedule.date ? Math.floor(new Date(schedule.date).getTime() / 1000) : null,
      '年份': new Date(schedule.date).getFullYear(),
      '月份': new Date(schedule.date).getMonth() + 1,
      '星期': schedule.weekDay,
      '开始时间': schedule.timeSlot,
      '时长分钟': (schedule.hours || 2) * 60,
      '状态': schedule.status,
      '备注': schedule.notes || '',
    };

    // 如果已有飞书记录ID，更新记录
    if (schedule.feishuEventId) {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.scheduleTableId}/records/${schedule.feishuEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`更新飞书记录失败: ${result.msg}`);
      }

      console.log(`[ScheduleSync] 更新排课到飞书成功: ${schedule.scheduleId}`);
      return schedule.feishuEventId;
    } else {
      // 创建新记录
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.scheduleTableId}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`创建飞书记录失败: ${result.msg}`);
      }

      const recordId = result.data?.record?.record_id;

      // 更新本地记录的飞书ID
      await db.update(scheduleResults)
        .set({ feishuEventId: recordId, updatedAt: new Date() })
        .where(eq(scheduleResults.id, scheduleId));

      console.log(`[ScheduleSync] 创建排课到飞书成功: ${schedule.scheduleId}, recordId: ${recordId}`);
      return recordId;
    }
  } catch (error) {
    console.error('[ScheduleSync] 同步排课到飞书失败:', error);
    throw error;
  }
}

/**
 * 从飞书多维表格同步排课
 */
export async function syncSchedulesFromFeishu(): Promise<{ total: number; synced: number; failed: number }> {
  if (!FEISHU_CONFIG.scheduleTableId) {
    console.log('[ScheduleSync] 排课安排表未配置，跳过同步');
    return { total: 0, synced: 0, failed: 0 };
  }

  try {
    const token = await getAccessToken();
    
    // 获取所有飞书记录
    let allRecords: any[] = [];
    let hasMore = true;
    let pageToken: string | undefined;

    while (hasMore) {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.scheduleTableId}/records`
      );
      
      url.searchParams.set('page_size', '100');
      if (pageToken) {
        url.searchParams.set('page_token', pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`获取飞书记录失败: ${result.msg}`);
      }

      allRecords = allRecords.concat(result.data?.items || []);
      hasMore = result.data?.has_more;
      pageToken = result.data?.page_token;
    }

    console.log(`[ScheduleSync] 从飞书获取 ${allRecords.length} 条排课记录`);

    let synced = 0;
    let failed = 0;

    // 获取学生和导师映射
    const allStudents = await db.select().from(students);
    const allTeachers = await db.select().from(teachers);
    const studentMap = new Map(allStudents.map(s => [s.name, s]));
    const teacherMap = new Map(allTeachers.map(t => [t.name, t]));

    for (const record of allRecords) {
      try {
        const fields = record.fields;
        const scheduleNo = fields['排课编号'] as string;

        if (!scheduleNo) {
          failed++;
          continue;
        }

        // 检查是否已存在
        const existing = await db.select()
          .from(scheduleResults)
          .where(eq(scheduleResults.scheduleId, scheduleNo))
          .limit(1);

        const studentName = fields['学生'] as string;
        const teacherName = fields['导师'] as string;
        const student = studentMap.get(studentName);
        const teacher = teacherMap.get(teacherName);

        // 解析日期
        const timestamp = fields['计划日期'] as number;
        const date = timestamp ? new Date(timestamp * 1000).toISOString().split('T')[0] : null;

        if (existing.length > 0) {
          // 更新现有记录
          await db.update(scheduleResults)
            .set({
              status: fields['状态'] as any,
              notes: fields['备注'] as string || null,
              feishuEventId: record.record_id,
              updatedAt: new Date(),
            })
            .where(eq(scheduleResults.id, existing[0].id));
        } else {
          // 创建新记录
          await db.insert(scheduleResults).values({
            id: crypto.randomUUID(),
            scheduleId: scheduleNo,
            studentId: student?.id || '00000000-0000-0000-0000-000000000000',
            teacherId: teacher?.id || '00000000-0000-0000-0000-000000000000',
            courseId: '00000000-0000-0000-0000-000000000000',
            date: date || new Date().toISOString().split('T')[0],
            weekDay: fields['星期'] as any,
            timeSlot: fields['开始时间'] as any,
            hours: fields['时长分钟'] ? Math.round(Number(fields['时长分钟']) / 60) : 2,
            status: fields['状态'] as any || '待确认',
            notes: fields['备注'] as string || null,
            feishuEventId: record.record_id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        synced++;
      } catch (error) {
        console.error('[ScheduleSync] 同步单条记录失败:', error);
        failed++;
      }
    }

    console.log(`[ScheduleSync] 排课同步完成: ${synced} 成功, ${failed} 失败`);
    return { total: allRecords.length, synced, failed };
  } catch (error) {
    console.error('[ScheduleSync] 从飞书同步排课失败:', error);
    throw error;
  }
}

/**
 * 创建飞书日历事件
 */
export async function createFeishuCalendarEvent(scheduleId: string): Promise<string | null> {
  try {
    // 获取排课详情
    const [schedule] = await db.select()
      .from(scheduleResults)
      .where(eq(scheduleResults.id, scheduleId))
      .limit(1);

    if (!schedule) {
      throw new Error('排课不存在');
    }

    // 获取关联信息
    const [student] = await db.select().from(students).where(eq(students.id, schedule.studentId)).limit(1);
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, schedule.teacherId)).limit(1);
    const [course] = await db.select().from(courses).where(eq(courses.id, schedule.courseId)).limit(1);

    // 计算开始和结束时间
    const dateStr = schedule.date;
    const startTime = parseTimeSlot(schedule.timeSlot);
    const startDateTime = new Date(`${dateStr}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (schedule.hours || 2) * 60 * 60 * 1000);

    const token = await getAccessToken();

    // 创建日历事件
    const response = await fetch(
      'https://open.feishu.cn/open-apis/calendar/v4/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            summary: `ARTiCO课程 - ${course?.name || '课程'}`,
            description: `学生：${student?.name || '未知'}\n导师：${teacher?.name || '未知'}\n课程：${course?.name || '未知'}`,
            start_time: {
              timestamp: Math.floor(startDateTime.getTime() / 1000),
            },
            end_time: {
              timestamp: Math.floor(endDateTime.getTime() / 1000),
            },
            reminders: [
              { minutes: 30 },
            ],
          },
        }),
      }
    );

    const result = await response.json();
    if (result.code !== 0) {
      console.warn(`[ScheduleSync] 创建日历事件失败: ${result.msg}`);
      return null;
    }

    const eventId = result.data?.event?.event_id;
    console.log(`[ScheduleSync] 创建日历事件成功: ${eventId}`);
    return eventId;
  } catch (error) {
    console.error('[ScheduleSync] 创建日历事件失败:', error);
    return null;
  }
}

/**
 * 解析时间段为小时
 */
function parseTimeSlot(timeSlot: string): string {
  const timeMap: Record<string, string> = {
    '10:00': '10:00',
    '13:00': '13:00',
    '15:00': '15:00',
    '18:00': '18:00',
    '20:00': '20:00',
  };
  return timeMap[timeSlot] || '10:00';
}

/**
 * 发送排课通知到飞书
 */
export async function sendScheduleNotification(
  scheduleId: string,
  type: 'created' | 'updated' | 'cancelled' | 'reminder'
): Promise<void> {
  try {
    // 获取排课详情
    const [schedule] = await db.select()
      .from(scheduleResults)
      .where(eq(scheduleResults.id, scheduleId))
      .limit(1);

    if (!schedule) return;

    // 获取关联信息
    const [student] = await db.select().from(students).where(eq(students.id, schedule.studentId)).limit(1);
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, schedule.teacherId)).limit(1);
    const [course] = await db.select().from(courses).where(eq(courses.id, schedule.courseId)).limit(1);

    const token = await getAccessToken();

    // 构建消息内容
    const typeMessages = {
      created: '新排课通知',
      updated: '排课变更通知',
      cancelled: '排课取消通知',
      reminder: '上课提醒',
    };

    const message = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: typeMessages[type] },
          template: type === 'cancelled' ? 'red' : 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**学生：** ${student?.name || '未知'}\n**导师：** ${teacher?.name || '未知'}\n**课程：** ${course?.name || '未知'}\n**时间：** ${schedule.date} ${schedule.weekDay} ${schedule.timeSlot}\n**课时：** ${schedule.hours}小时`,
            },
          },
        ],
      },
    };

    // 发送到飞书群聊或个人
    // TODO: 实现具体的消息发送逻辑
    console.log(`[ScheduleSync] 发送通知: ${type}`, message);
  } catch (error) {
    console.error('[ScheduleSync] 发送通知失败:', error);
  }
}

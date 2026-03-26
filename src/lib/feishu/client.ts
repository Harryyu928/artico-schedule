/**
 * 飞书API客户端
 * 
 * 官方文档: https://open.feishu.cn/document/
 */

// 飞书API基础URL
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// 飞书配置
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken?: string; // 多维表格 App Token
  encryptKey?: string; // 事件加密密钥
  verificationToken?: string; // 事件验证令牌
  calendarId?: string; // 日历ID
}

// 访问令牌缓存
interface TokenCache {
  accessToken: string;
  expiresAt: number; // 过期时间戳
}

// API响应类型
interface FeishuResponse<T> {
  code: number;
  msg: string;
  data?: T;
}

/**
 * 飞书API客户端
 */
export class FeishuClient {
  private config: FeishuConfig;
  private tokenCache: TokenCache | null = null;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  /**
   * 获取访问令牌（tenant_access_token）
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存是否有效（提前5分钟刷新）
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
      return this.tokenCache.accessToken;
    }

    const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const result = await response.json() as FeishuResponse<{
      tenant_access_token: string;
      expire: number;
    }>;

    if (result.code !== 0) {
      throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
    }

    // 缓存令牌
    this.tokenCache = {
      accessToken: result.data!.tenant_access_token,
      expiresAt: Date.now() + result.data!.expire * 1000,
    };

    return this.tokenCache.accessToken;
  }

  /**
   * 发送API请求
   */
  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      params?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    let url = `${FEISHU_API_BASE}${path}`;
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const result = await response.json() as FeishuResponse<T>;

    if (result.code !== 0) {
      throw new Error(`飞书API请求失败 [${path}]: ${result.msg} (code: ${result.code})`);
    }

    return result.data!;
  }

  // ============ 用户相关 API ============

  /**
   * 通过授权码获取用户信息
   */
  async getUserInfoByCode(code: string): Promise<{
    open_id: string;
    union_id: string;
    name: string;
    en_name?: string;
    avatar_url?: string;
    email?: string;
    mobile?: string;
    user_id?: string;
  }> {
    return this.request('/authen/v1/access_token', {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        code,
      },
    });
  }

  /**
   * 通过手机号获取用户ID
   */
  async getUserIdByPhone(phone: string): Promise<{
    user_id: string;
    open_id: string;
  } | null> {
    try {
      const result = await this.request<{
        user_list: Array<{ user_id: string; open_id: string }>;
      }>('/user/v1/get_user_id_by_phone', {
        method: 'POST',
        body: {
          mobiles: [phone],
        },
      });
      return result.user_list?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * 批量获取用户信息
   */
  async getUsers(userIds: string[]): Promise<Array<{
    open_id: string;
    union_id: string;
    name: string;
    en_name?: string;
    avatar_url?: string;
    email?: string;
    mobile?: string;
  }>> {
    const result = await this.request<{
      items: Array<{
        open_id: string;
        union_id: string;
        name: string;
        en_name?: string;
        avatar_url?: string;
        email?: string;
        mobile?: string;
      }>;
    }>('/user/v1/batch_get', {
      params: {
        user_ids: userIds.join(','),
      },
    });
    return result.items || [];
  }

  // ============ 消息相关 API ============

  /**
   * 发送文本消息
   */
  async sendTextMessage(
    receiveId: string,
    receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id',
    text: string
  ): Promise<string> {
    const result = await this.request<{ message_id: string }>('/im/v1/messages', {
      method: 'POST',
      params: {
        receive_id_type: receiveIdType,
      },
      body: {
        receive_id: receiveId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    return result.message_id;
  }

  /**
   * 发送卡片消息
   */
  async sendCardMessage(
    receiveId: string,
    receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id',
    card: Record<string, unknown>
  ): Promise<string> {
    const result = await this.request<{ message_id: string }>('/im/v1/messages', {
      method: 'POST',
      params: {
        receive_id_type: receiveIdType,
      },
      body: {
        receive_id: receiveId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    });
    return result.message_id;
  }

  /**
   * 回复消息
   */
  async replyMessage(
    messageId: string,
    msgType: 'text' | 'interactive',
    content: unknown
  ): Promise<string> {
    const result = await this.request<{ message_id: string }>(`/im/v1/messages/${messageId}/reply`, {
      method: 'POST',
      body: {
        msg_type: msgType,
        content: JSON.stringify(content),
      },
    });
    return result.message_id;
  }

  // ============ 日历相关 API ============

  /**
   * 创建日历事件
   */
  async createCalendarEvent(event: {
    summary: string;
    description?: string;
    start_time: {
      date?: string; // YYYY-MM-DD
      timestamp?: number; // Unix时间戳（秒）
    };
    end_time: {
      date?: string;
      timestamp?: number;
    };
    attendee_ability?: 'can_edit' | 'can_see' | 'none';
    reminders?: Array<{
      minutes: number;
    }>;
  }): Promise<string> {
    const calendarId = this.config.calendarId;
    if (!calendarId) {
      throw new Error('未配置飞书日历ID');
    }

    const result = await this.request<{ event_id: string }>(`/calendar/v4/calendars/${calendarId}/events`, {
      method: 'POST',
      body: event,
    });
    return result.event_id;
  }

  /**
   * 更新日历事件
   */
  async updateCalendarEvent(eventId: string, event: {
    summary?: string;
    description?: string;
    start_time?: {
      date?: string;
      timestamp?: number;
    };
    end_time?: {
      date?: string;
      timestamp?: number;
    };
  }): Promise<boolean> {
    const calendarId = this.config.calendarId;
    if (!calendarId) {
      throw new Error('未配置飞书日历ID');
    }

    await this.request(`/calendar/v4/calendars/${calendarId}/events/${eventId}`, {
      method: 'PUT',
      body: event,
    });
    return true;
  }

  /**
   * 删除日历事件
   */
  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    const calendarId = this.config.calendarId;
    if (!calendarId) {
      throw new Error('未配置飞书日历ID');
    }

    await this.request(`/calendar/v4/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
    });
    return true;
  }

  /**
   * 邀请事件参与者
   */
  async addEventAttendees(eventId: string, attendeeIds: string[]): Promise<boolean> {
    const calendarId = this.config.calendarId;
    if (!calendarId) {
      throw new Error('未配置飞书日历ID');
    }

    await this.request(`/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees`, {
      method: 'POST',
      body: {
        attendee_ids: attendeeIds,
      },
    });
    return true;
  }

  // ============ 多维表格相关 API ============

  /**
   * 获取多维表格记录
   */
  async getBitableRecords(
    tableId: string,
    options?: {
      viewId?: string;
      fieldNames?: string[];
      filter?: string;
      sort?: Array<{ field_name: string; desc: boolean }>;
      page_size?: number;
      page_token?: string;
    }
  ): Promise<{
    items: Array<{
      record_id: string;
      fields: Record<string, unknown>;
    }>;
    page_token?: string;
    total: number;
  }> {
    return this.request(`/bitable/v1/apps/${this.config.appToken}/tables/${tableId}/records`, {
      method: 'POST',
      body: options || {},
    });
  }

  /**
   * 创建多维表格记录
   */
  async createBitableRecord(
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<{
    record_id: string;
    fields: Record<string, unknown>;
  }> {
    const result = await this.request<{
      record: {
        record_id: string;
        fields: Record<string, unknown>;
      };
    }>(`/bitable/v1/apps/${this.config.appToken}/tables/${tableId}/records`, {
      method: 'POST',
      body: {
        records: [{ fields }],
      },
    });
    return result.record;
  }

  /**
   * 更新多维表格记录
   */
  async updateBitableRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<{
    record_id: string;
    fields: Record<string, unknown>;
  }> {
    const result = await this.request<{
      record: {
        record_id: string;
        fields: Record<string, unknown>;
      };
    }>(`/bitable/v1/apps/${this.config.appToken}/tables/${tableId}/records/${recordId}`, {
      method: 'PUT',
      body: { fields },
    });
    return result.record;
  }

  /**
   * 删除多维表格记录
   */
  async deleteBitableRecord(tableId: string, recordId: string): Promise<boolean> {
    await this.request(`/bitable/v1/apps/${this.config.appToken}/tables/${tableId}/records/${recordId}`, {
      method: 'DELETE',
    });
    return true;
  }

  /**
   * 批量创建多维表格记录
   */
  async batchCreateBitableRecords(
    tableId: string,
    recordsList: Array<Record<string, unknown>>
  ): Promise<Array<{
    record_id: string;
    fields: Record<string, unknown>;
  }>> {
    const result = await this.request<{
      records: Array<{
        record_id: string;
        fields: Record<string, unknown>;
      }>;
    }>(`/bitable/v1/apps/${this.config.appToken}/tables/${tableId}/records/batch_create`, {
      method: 'POST',
      body: {
        records: recordsList.map(fields => ({ fields })),
      },
    });
    return result.records;
  }

  // ============ 审批相关 API ============

  /**
   * 创建审批实例
   */
  async createApprovalInstance(params: {
    approval_code: string;
    open_id: string; // 发起人
    form: string; // 表单内容JSON字符串
  }): Promise<string> {
    const result = await this.request<{ instance_code: string }>('/approval/v4/instances/create', {
      method: 'POST',
      body: params,
    });
    return result.instance_code;
  }

  // ============ 机器人相关 API ============

  /**
   * 获取机器人信息
   */
  async getBotInfo(): Promise<{
    activate_status: boolean;
    open_id: string;
    name: string;
  }> {
    return this.request('/bot/v3/info');
  }

  // ============ 工具方法 ============

  /**
   * 验证事件签名
   */
  verifyEventSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    if (!this.config.encryptKey) {
      return true; // 未配置加密密钥时跳过验证
    }
    
    const crypto = require('crypto');
    const token = this.config.verificationToken || '';
    const expectedSignature = crypto
      .createHash('sha256')
      .update(timestamp + nonce + token + body)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * 解密事件数据
   */
  decryptEventData(encrypt: string): string {
    if (!this.config.encryptKey) {
      return encrypt;
    }

    const crypto = require('crypto');
    const key = Buffer.from(this.config.encryptKey, 'base64');
    const encryptBuffer = Buffer.from(encrypt, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, key.slice(0, 16));
    decipher.setAutoPadding(false);
    
    let decrypted = decipher.update(encryptBuffer).toString('utf8');
    decrypted += decipher.final('utf8');
    
    // 去除填充
    const pad = decrypted.charCodeAt(decrypted.length - 1);
    return decrypted.slice(0, -pad);
  }
}

// 单例实例
let feishuClient: FeishuClient | null = null;

/**
 * 获取飞书客户端实例
 */
export function getFeishuClient(): FeishuClient | null {
  const enabled = process.env.FEISHU_ENABLED === 'true';
  
  if (!enabled) {
    return null;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('[Feishu] 飞书配置不完整，请检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    return null;
  }

  if (!feishuClient) {
    feishuClient = new FeishuClient({
      appId,
      appSecret,
      appToken: process.env.FEISHU_APP_TOKEN,
      encryptKey: process.env.FEISHU_ENCRYPT_KEY,
      verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
      calendarId: process.env.FEISHU_CALENDAR_ID,
    });
  }

  return feishuClient;
}

/**
 * 检查飞书是否启用
 */
export function isFeishuEnabled(): boolean {
  return process.env.FEISHU_ENABLED === 'true';
}

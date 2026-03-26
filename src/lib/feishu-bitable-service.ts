/**
 * 飞书多维表格服务
 * 
 * 用于与飞书多维表格进行数据同步
 * 官方文档：https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview
 */

import * as lark from '@larksuiteoapi/node-sdk';

// 飞书配置
interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken: string;
  tableIds: {
    consultants: string;
    teachers: string;
    students: string;
    courses: string;
    selectionForms: string;
    classRecords: string;
    contracts: string;
    applicationSchools: string;
  };
}

// 从环境变量获取配置
function getFeishuConfig(): FeishuConfig {
  return {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    appToken: process.env.FEISHU_APP_TOKEN || '',
    tableIds: {
      consultants: process.env.FEISHU_TABLE_CONSULTANTS || '',
      teachers: process.env.FEISHU_TABLE_TEACHERS || '',
      students: process.env.FEISHU_TABLE_STUDENTS || '',
      courses: process.env.FEISHU_TABLE_COURSES || '',
      selectionForms: process.env.FEISHU_TABLE_SELECTION_FORMS || '',
      classRecords: process.env.FEISHU_TABLE_CLASS_RECORDS || '',
      contracts: process.env.FEISHU_TABLE_CONTRACTS || '',
      applicationSchools: process.env.FEISHU_TABLE_APPLICATION_SCHOOLS || '',
    },
  };
}

// 多维表格记录类型
export interface BitableRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface BitableField {
  field_id: string;
  field_name: string;
  type: number;
  property?: Record<string, unknown>;
}

/**
 * 飞书多维表格服务类
 */
export class FeishuBitableService {
  private client: lark.Client;
  private config: FeishuConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config?: Partial<FeishuConfig>) {
    const envConfig = getFeishuConfig();
    this.config = { ...envConfig, ...config } as FeishuConfig;
    
    // 初始化飞书客户端
    this.client = new lark.Client({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }

  /**
   * 检查配置是否完整
   */
  get isConfigured(): boolean {
    return !!(
      this.config.appId &&
      this.config.appSecret &&
      this.config.appToken
    );
  }

  /**
   * 获取访问令牌（内部使用，client会自动处理）
   */
  private async ensureAccessToken(): Promise<void> {
    // lark SDK 会自动处理 token，这里仅做检查
    if (!this.isConfigured) {
      throw new Error('飞书配置不完整，请检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; tables?: string[] }> {
    try {
      await this.ensureAccessToken();
      
      // 获取多维表格元数据
      const response = await (this.client as any).bitable.appTable.listWithPage({
        path: {
          app_token: this.config.appToken,
        },
      });

      if (response.code !== 0) {
        return {
          success: false,
          message: `获取多维表格失败: ${response.msg}`,
        };
      }

      const tables = (response.data?.items || []).map((t: any) => t.name || '') || [];
      
      return {
        success: true,
        message: '连接成功',
        tables,
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 获取表格字段信息
   */
  async getTableFields(tableId: string): Promise<BitableField[]> {
    try {
      const response = await (this.client as any).bitable.appTableField.listWithPage({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
        },
      });

      if (response.code !== 0) {
        console.error('[Feishu] 获取字段失败:', response.msg);
        return [];
      }

      return ((response.data?.items || []) as any[]).map((item: any) => ({
        field_id: item.field_id || '',
        field_name: item.field_name || '',
        type: item.type || 0,
        property: item.property as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      console.error('[Feishu] 获取字段异常:', error);
      return [];
    }
  }

  /**
   * 查询记录
   */
  async listRecords(
    tableId: string,
    options?: {
      viewId?: string;
      fieldNames?: string[];
      filter?: string;
      sort?: Array<{ field_name: string; desc: boolean }>;
      pageToken?: string;
      pageSize?: number;
    }
  ): Promise<{ records: BitableRecord[]; hasMore: boolean; pageToken?: string }> {
    try {
      const response = await (this.client as any).bitable.appTableRecord.listWithPage({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
        },
        params: {
          view_id: options?.viewId,
          field_names: options?.fieldNames ? JSON.stringify(options.fieldNames) : undefined,
          filter: options?.filter,
          sort: options?.sort ? JSON.stringify(options.sort) : undefined,
          page_token: options?.pageToken,
          page_size: options?.pageSize || 100,
        },
      });

      if (response.code !== 0) {
        console.error('[Feishu] 查询记录失败:', response.msg);
        return { records: [], hasMore: false };
      }

      const records = ((response.data?.items || []) as any[]).map((item: any) => ({
        record_id: item.record_id || '',
        fields: (item.fields || {}) as Record<string, unknown>,
      }));

      return {
        records,
        hasMore: response.data?.has_more || false,
        pageToken: response.data?.page_token,
      };
    } catch (error) {
      console.error('[Feishu] 查询记录异常:', error);
      return { records: [], hasMore: false };
    }
  }

  /**
   * 创建记录
   */
  async createRecord(tableId: string, fields: Record<string, unknown>): Promise<BitableRecord | null> {
    try {
      const response = await this.client.bitable.appTableRecord.create({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
        },
        data: {
          fields: fields as any,
        },
      } as any);

      if (response.code !== 0) {
        console.error('[Feishu] 创建记录失败:', response.msg);
        return null;
      }

      return {
        record_id: (response.data as any)?.record?.record_id || '',
        fields: ((response.data as any)?.record?.fields || {}) as Record<string, unknown>,
      };
    } catch (error) {
      console.error('[Feishu] 创建记录异常:', error);
      return null;
    }
  }

  /**
   * 批量创建记录
   */
  async batchCreateRecords(
    tableId: string,
    recordsList: Array<Record<string, unknown>>
  ): Promise<BitableRecord[]> {
    try {
      const response = await this.client.bitable.appTableRecord.batchCreate({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
        },
        data: {
          records: recordsList.map(fields => ({ fields: fields as any })),
        },
      } as any);

      if (response.code !== 0) {
        console.error('[Feishu] 批量创建记录失败:', response.msg);
        return [];
      }

      return ((response.data as any)?.records || []).map((item: any) => ({
        record_id: item.record_id || '',
        fields: (item.fields || {}) as Record<string, unknown>,
      }));
    } catch (error) {
      console.error('[Feishu] 批量创建记录异常:', error);
      return [];
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<BitableRecord | null> {
    try {
      const response = await this.client.bitable.appTableRecord.update({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
          record_id: recordId,
        },
        data: {
          fields: fields as any,
        },
      } as any);

      if (response.code !== 0) {
        console.error('[Feishu] 更新记录失败:', response.msg);
        return null;
      }

      return {
        record_id: (response.data as any)?.record?.record_id || '',
        fields: ((response.data as any)?.record?.fields || {}) as Record<string, unknown>,
      };
    } catch (error) {
      console.error('[Feishu] 更新记录异常:', error);
      return null;
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(tableId: string, recordId: string): Promise<boolean> {
    try {
      const response = await this.client.bitable.appTableRecord.delete({
        path: {
          app_token: this.config.appToken,
          table_id: tableId,
          record_id: recordId,
        },
      });

      if (response.code !== 0) {
        console.error('[Feishu] 删除记录失败:', response.msg);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Feishu] 删除记录异常:', error);
      return false;
    }
  }

  /**
   * 获取表格ID
   */
  get tableIds() {
    return this.config.tableIds;
  }

  /**
   * 获取App Token
   */
  get appToken() {
    return this.config.appToken;
  }
}

// 导出单例
let bitableServiceInstance: FeishuBitableService | null = null;

export function getBitableService(): FeishuBitableService {
  if (!bitableServiceInstance) {
    bitableServiceInstance = new FeishuBitableService();
  }
  return bitableServiceInstance;
}

// 便捷方法：同步学生
export async function syncStudentToFeishu(
  studentData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过学生同步');
    return null;
  }
  return service.createRecord(service.tableIds.students, studentData);
}

// 便捷方法：同步导师
export async function syncTeacherToFeishu(
  teacherData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过导师同步');
    return null;
  }
  return service.createRecord(service.tableIds.teachers, teacherData);
}

// 便捷方法：同步上课记录
export async function syncClassRecordToFeishu(
  recordData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过上课记录同步');
    return null;
  }
  return service.createRecord(service.tableIds.classRecords, recordData);
}

// 便捷方法：同步选课单
export async function syncSelectionFormToFeishu(
  formData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过选课单同步');
    return null;
  }
  return service.createRecord(service.tableIds.selectionForms, formData);
}

// 便捷方法：同步顾问
export async function syncConsultantToFeishu(
  consultantData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过顾问同步');
    return null;
  }
  return service.createRecord(service.tableIds.consultants, consultantData);
}

// 便捷方法：同步合同
export async function syncContractToFeishu(
  contractData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过合同同步');
    return null;
  }
  return service.createRecord(service.tableIds.contracts, contractData);
}

// 便捷方法：同步课程
export async function syncCourseToFeishu(
  courseData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过课程同步');
    return null;
  }
  return service.createRecord(service.tableIds.courses, courseData);
}

// 便捷方法：同步申请院校
export async function syncApplicationSchoolToFeishu(
  applicationData: Record<string, unknown>
): Promise<BitableRecord | null> {
  const service = getBitableService();
  if (!service.isConfigured) {
    console.log('[Feishu] 未配置，跳过申请院校同步');
    return null;
  }
  return service.createRecord(service.tableIds.applicationSchools, applicationData);
}

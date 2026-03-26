/**
 * 飞书多维表格数据导入服务
 * 
 * 从Excel文件读取数据并导入到飞书多维表格
 */

import * as XLSX from 'xlsx';

// 飞书API配置
const FEISHU_CONFIG = {
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

// 访问令牌缓存
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

// 导入统计
export interface ImportStats {
  teachers: { total: number; success: number; failed: number; skipped: number };
  students: { total: number; success: number; failed: number; skipped: number };
  classRecords: { total: number; success: number; failed: number; skipped: number };
  selectionForms: { total: number; success: number; failed: number; skipped: number };
  consultants: { total: number; success: number; failed: number; skipped: number };
  contracts: { total: number; success: number; failed: number; skipped: number };
  errors: Array<{ type: string; row: number; message: string; data?: unknown }>;
}

/**
 * 获取访问令牌
 */
async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
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

  tokenCache = {
    accessToken: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return data.tenant_access_token;
}

/**
 * 发送API请求
 */
async function feishuRequest(method: string, path: string, data?: unknown): Promise<any> {
  const accessToken = await getAccessToken();
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`https://open.feishu.cn${path}`, options);
  return response.json();
}

/**
 * 批量创建记录（带重试和限流）
 */
async function batchCreateRecords(
  tableId: string,
  records: Array<Record<string, unknown>>,
  batchSize: number = 500
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      const result = await feishuRequest(
        'POST',
        `/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${tableId}/records/batch_create`,
        { records: batch.map(fields => ({ fields })) }
      );

      if (result.code === 0) {
        success += batch.length;
      } else {
        console.error(`[Feishu] 批量创建失败:`, result.msg);
        failed += batch.length;
      }

      // 限流：每批次间隔200ms
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[Feishu] 批量创建异常:`, error);
      failed += batch.length;
    }
  }

  return { success, failed };
}

/**
 * 导入数据主函数
 */
export async function importDataToFeishu(
  filePath: string,
  options: { dryRun?: boolean; limit?: number } = {}
): Promise<ImportStats> {
  const stats: ImportStats = {
    teachers: { total: 0, success: 0, failed: 0, skipped: 0 },
    students: { total: 0, success: 0, failed: 0, skipped: 0 },
    classRecords: { total: 0, success: 0, failed: 0, skipped: 0 },
    selectionForms: { total: 0, success: 0, failed: 0, skipped: 0 },
    consultants: { total: 0, success: 0, failed: 0, skipped: 0 },
    contracts: { total: 0, success: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  // 读取Excel文件
  console.log('[Import] 开始读取Excel文件:', filePath);
  
  // 检查文件是否存在
  const fs = await import('fs');
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  
  const workbook = XLSX.readFile(filePath);
  console.log('[Import] 读取Excel文件成功');

  // ========== 1. 导入导师数据 ==========
  console.log('\n[Import] 开始处理导师数据...');
  const teacherSheet = workbook.Sheets['教师信息管理'];
  if (teacherSheet) {
    const teacherData = XLSX.utils.sheet_to_json(teacherSheet) as Record<string, unknown>[];
    stats.teachers.total = teacherData.length;
    
    const teacherRecords = teacherData
      .slice(0, options.limit || teacherData.length)
      .map((row, index) => {
        try {
          return {
            '导师工号': `T${String(index + 1).padStart(4, '0')}`,
            '姓名': String(row['姓名'] || '').trim(),
            '联系电话': String(row['联系方式'] || '').trim() || null,
            '电子邮箱': String(row['邮箱'] || '').trim() || null,
            '微信号': String(row['微信号'] || '').trim() || null,
            '导师类型': String(row['就职状态'] || '').includes('全职') ? '全职' : '兼职',
            '合作状态': String(row['合作性质'] || '合作中') === '合作中' ? '合作中' : '终止合作',
            '就职状态': String(row['就职状态'] || '在职') === '在职' ? '在职' : '离职',
            '专业方向': String(row['专业方向'] || '').split(',').map(s => s.trim()).filter(Boolean),
            '飞书用户ID': String(row['用户名'] || '').trim() || null,
          };
        } catch (error) {
          stats.errors.push({
            type: 'teacher',
            row: index + 1,
            message: (error as Error).message,
            data: row,
          });
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!options.dryRun && teacherRecords.length > 0) {
      const result = await batchCreateRecords(FEISHU_CONFIG.tableIds.teachers, teacherRecords);
      stats.teachers.success = result.success;
      stats.teachers.failed = result.failed;
    } else if (options.dryRun) {
      stats.teachers.success = teacherRecords.length;
    }
  }

  // ========== 2. 导入学生数据 ==========
  console.log('\n[Import] 开始处理学生数据...');
  const studentSheet = workbook.Sheets['学生课时分配信息管理（有了上课记录表之后才有学生名字）'];
  if (studentSheet) {
    const studentData = XLSX.utils.sheet_to_json(studentSheet) as Record<string, unknown>[];
    stats.students.total = studentData.length;

    const studentRecords = studentData
      .slice(0, options.limit || studentData.length)
      .map((row, index) => {
        try {
          const name = String(row['学生姓名'] || '').trim();
          if (!name) return null;

          return {
            '学号': `STD${String(index + 1).padStart(4, '0')}`,
            '姓名': name,
            '联系电话': null,
            '电子邮箱': null,
            '微信号': null,
            '学员状态': mapStudentStatus(String(row['学员状态'] || '')),
            '学员类别': mapStudentCategory(String(row['学员VIP等级'] || '')),
            '申请专业方向': mapMajor(String(row['申请专业'] || '')),
            '申请国家': mapCountry(String(row['申请国家'] || '')),
            '当前阶段': mapStage(String(row['当前阶段'] || '')),
            '总课时': Number(row['总课时']) || 0,
            '已消耗课时': Number(row['已消耗课时']) || 0,
            '剩余课时': Number(row['剩余课时']) || 0,
          };
        } catch (error) {
          stats.errors.push({
            type: 'student',
            row: index + 1,
            message: (error as Error).message,
            data: row,
          });
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!options.dryRun && studentRecords.length > 0) {
      const result = await batchCreateRecords(FEISHU_CONFIG.tableIds.students, studentRecords);
      stats.students.success = result.success;
      stats.students.failed = result.failed;
    } else if (options.dryRun) {
      stats.students.success = studentRecords.length;
    }
  }

  // ========== 3. 导入上课记录 ==========
  console.log('\n[Import] 开始处理上课记录数据...');
  const classRecordSheet = workbook.Sheets['上课记录总表（总表，除了教务都别改）'];
  if (classRecordSheet) {
    const classRecordData = XLSX.utils.sheet_to_json(classRecordSheet) as Record<string, unknown>[];
    const limit = options.limit || classRecordData.length;
    stats.classRecords.total = Math.min(limit, classRecordData.length);

    const classRecords = classRecordData
      .slice(0, limit)
      .map((row, index) => {
        try {
          const studentName = String(row['授课学生 Student Name'] || '').trim();
          const teacherName = String(row['授课老师 Tutor Name'] || '').trim();
          
          if (!studentName || !teacherName) {
            stats.classRecords.skipped++;
            return null;
          }

          // 解析日期
          const dateValue = row['授课日期'];
          let classDate: Date | null = null;
          if (typeof dateValue === 'number') {
            classDate = new Date((dateValue - 25569) * 86400 * 1000);
          } else if (typeof dateValue === 'string') {
            classDate = new Date(dateValue);
          }

          const year = classDate?.getFullYear() || Number(row['年份']) || 2023;
          const month = classDate ? classDate.getMonth() + 1 : Number(row['月份']) || 1;
          const weekDay = classDate ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][classDate.getDay()] : '周一';

          return {
            '记录编号': `R${String(index + 1).padStart(6, '0')}`,
            '学生': studentName,
            '导师': teacherName,
            '课程类别': String(row['课程类别'] || '').trim(),
            '课程内容详情': String(row['课程内容'] || '').trim() || null,
            '上课日期': classDate ? classDate.toISOString().split('T')[0] : null,
            '年份': year,
            '月份': month,
            '星期': weekDay,
            '开始时间': mapTimeSlot(String(row['实际上课时间'] || '10:00')),
            '实际时长(分钟)': Math.round((Number(row['单次消耗课时(H)(耗课时间)']) || 2) * 60),
            '授课内容摘要': String(row['授课内容细则'] || '').trim() || null,
            '课后作业': String(row['课后作业'] || '').trim() || null,
            '作业分数': Number(row['作业分数']) || null,
            '作业完成度(%)': Number(row['上节课作业完成度']) || null,
            '上次作业品质': String(row['上节课作业 品质'] || '').trim() || null,
            '剩余课时': Number(row['剩余课时（本阶段课程）'] || 0),
            '到课情况': mapAttendance(String(row['到课情况'] || '')),
            '是否已结课': String(row['是否已提交结课'] || '').includes('已结'),
            '结课状态': String(row['是否已提交结课'] || '').includes('已结') ? '已结' : '未结',
          };
        } catch (error) {
          stats.errors.push({
            type: 'classRecord',
            row: index + 1,
            message: (error as Error).message,
            data: row,
          });
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!options.dryRun && classRecords.length > 0) {
      const result = await batchCreateRecords(FEISHU_CONFIG.tableIds.classRecords, classRecords);
      stats.classRecords.success = result.success;
      stats.classRecords.failed = result.failed;
    } else if (options.dryRun) {
      stats.classRecords.success = classRecords.length;
    }
  }

  return stats;
}

// ========== 映射函数 ==========

function mapStudentStatus(status: string): string {
  const map: Record<string, string> = {
    '在读': '在读',
    '停课': '停课',
    '毕业': '毕业',
    '退学': '退学',
    '测试': '在读',
  };
  return map[status] || '在读';
}

function mapStudentCategory(category: string): string {
  if (!category) return '其他';
  const categories = category.split(',').map(s => s.trim());
  const mainCategory = categories[0];
  
  const map: Record<string, string> = {
    'VIP 3': 'VIP 3',
    'VIP 5': 'VIP 5',
    'VIP 6': 'VIP 6',
    'VIP 7': 'VIP 7',
    'VIP 8': 'VIP 8',
    'VIP 10': 'VIP 10',
    'VIP 12': 'VIP 12',
    'FV-Portfolio作品集（限课时）': 'FV-Portfolio作品集（限课时）',
    'FV-Portfolio作品集（不限课时）': 'FV-Portfolio作品集（不限课时）',
    'FV-Portfolio作品集+文书（限课时）': 'FV-Portfolio作品集+文书（限课时）',
    'FV-Portfolio作品集+文书（不限课时）': 'FV-Portfolio作品集+文书（不限课时）',
    'FV-定制课程': 'FV-定制课程',
    '单项目': '单项目',
    '项目代做': '项目代做',
  };
  
  return map[mainCategory] || '其他';
}

function mapMajor(major: string): string {
  if (!major) return '其他';
  const majors = ['游戏策划', '游戏开发', '游戏美术（三维）', '游戏美术（二维）', '动画设计', '角色设计', '3D建模', '技术美术', 'UI设计', '其他'];
  for (const m of majors) {
    if (major.includes(m)) return m;
  }
  return '其他';
}

function mapCountry(country: string): string {
  if (!country) return '其他';
  const countries = ['美国', '英国', '加拿大', '日本', '澳大利亚', '欧洲', '其他'];
  for (const c of countries) {
    if (country.includes(c)) return c;
  }
  return '其他';
}

function mapStage(stage: string): string {
  if (!stage) return '基础阶段';
  const stages = ['基础阶段', '项目一', '项目二', '项目三', '项目四', '作品集阶段', '申请阶段', '已毕业'];
  for (const s of stages) {
    if (stage.includes(s)) return s;
  }
  return '基础阶段';
}

function mapTimeSlot(time: string): string {
  const slots = ['10:00', '13:00', '15:00', '18:00', '20:00'];
  for (const slot of slots) {
    if (time.includes(slot.split(':')[0])) return slot;
  }
  return '10:00';
}

function mapAttendance(status: string): string {
  const map: Record<string, string> = {
    '正常': '已完成',
    '迟到': '已完成',
    '请假': '已取消',
    '旷课': '学生缺席',
    '补课': '补课',
  };
  return map[status] || '已完成';
}

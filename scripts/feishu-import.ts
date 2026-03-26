/**
 * 飞书多维表格数据导入脚本
 * 
 * 执行方式: npx tsx scripts/feishu-import.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config'; // 加载环境变量

// ========== 配置 ==========
// 直接使用环境变量（避免.env.local加载问题）
const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
  tableIds: {
    teachers: 'tblIXVom9KKRjZZw',
    students: 'tblJMMkDWwwZh2kx',
    classRecords: 'tblRyqhkNIWKUFwF',
  },
};

const COZE_WORKSPACE_PATH = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';
const FILE_PATH = path.join(COZE_WORKSPACE_PATH, 'temp_data.xlsx');

// ========== 令牌管理 ==========
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: CONFIG.appId,
      app_secret: CONFIG.appSecret,
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

// ========== API请求 ==========
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

// ========== 批量创建记录 ==========
async function batchCreateRecords(
  tableId: string,
  records: Array<Record<string, unknown>>,
  options: { batchSize?: number; onProgress?: (current: number, total: number) => void } = {}
): Promise<{ success: number; failed: number }> {
  const batchSize = options.batchSize || 500;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      const result = await feishuRequest(
        'POST',
        `/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${tableId}/records/batch_create`,
        { records: batch.map(fields => ({ fields })) }
      );

      if (result.code === 0) {
        success += batch.length;
        options.onProgress?.(Math.min(i + batchSize, records.length), records.length);
      } else {
        console.error(`[Error] 批量创建失败:`, result.msg);
        failed += batch.length;
      }

      // 限流
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`[Error] 批量创建异常:`, error);
      failed += batch.length;
    }
  }

  return { success, failed };
}

// ========== 字段映射函数 ==========
function mapStudentStatus(status: string): string {
  const map: Record<string, string> = {
    '在读': '在读', '停课': '停课', '毕业': '毕业', '退学': '退学',
  };
  return map[status] || '在读';
}

function mapStudentCategory(category: string): string {
  if (!category) return '其他';
  const categories = category.split(',').map(s => s.trim());
  const main = categories[0];
  
  const map: Record<string, string> = {
    'VIP 3': 'VIP 3', 'VIP 5': 'VIP 5', 'VIP 6': 'VIP 6', 'VIP 7': 'VIP 7',
    'VIP 8': 'VIP 8', 'VIP 10': 'VIP 10', 'VIP 12': 'VIP 12',
    'FV-Portfolio作品集（限课时）': 'FV-Portfolio作品集（限课时）',
    'FV-Portfolio作品集（不限课时）': 'FV-Portfolio作品集（不限课时）',
    'FV-Portfolio作品集+文书（限课时）': 'FV-Portfolio作品集+文书（限课时）',
    'FV-Portfolio作品集+文书（不限课时）': 'FV-Portfolio作品集+文书（不限课时）',
    'FV-Portfolio作品集+文书（限课时）': 'FV-Portfolio作品集+文书（限课时）',
    'FV-定制课程': 'FV-定制课程', '单项目': '单项目', '项目代做': '项目代做',
  };
  
  return map[main] || '其他';
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
  if (!time) return '10:00';
  if (time.includes('10')) return '10:00';
  if (time.includes('13')) return '13:00';
  if (time.includes('15')) return '15:00';
  if (time.includes('18')) return '18:00';
  if (time.includes('20')) return '20:00';
  return '10:00';
}

function mapAttendance(status: string): string {
  if (!status) return '已完成';
  if (status.includes('正常')) return '已完成';
  if (status.includes('请假')) return '已取消';
  if (status.includes('旷课')) return '学生缺席';
  if (status.includes('补课')) return '补课';
  return '已完成';
}

function mapTeacherType(status: string): string {
  return status?.includes('全职') ? '全职' : '兼职';
}

function mapCooperationStatus(status: string): string {
  return status?.includes('合作中') ? '合作中' : '终止合作';
}

function mapEmploymentStatus(status: string): string {
  if (status?.includes('离职')) return '离职';
  if (status?.includes('休假')) return '休假';
  if (status?.includes('试用')) return '试用期';
  return '在职';
}

function parseExcelDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// ========== 主函数 ==========
async function main() {
  console.log('=== 飞书多维表格数据导入 ===\n');
  
  // 检查配置
  if (!CONFIG.appId || !CONFIG.appSecret || !CONFIG.appToken) {
    console.error('❌ 飞书配置不完整！');
    console.log('请检查以下环境变量:');
    console.log('- FEISHU_APP_ID:', CONFIG.appId ? '✅' : '❌');
    console.log('- FEISHU_APP_SECRET:', CONFIG.appSecret ? '✅' : '❌');
    console.log('- FEISHU_APP_TOKEN:', CONFIG.appToken ? '✅' : '❌');
    process.exit(1);
  }

  // 检查文件
  if (!fs.existsSync(FILE_PATH)) {
    console.error('❌ 数据文件不存在:', FILE_PATH);
    process.exit(1);
  }

  console.log('📁 数据文件:', FILE_PATH);
  console.log('📋 App Token:', CONFIG.appToken);
  console.log('');

  // 读取Excel
  console.log('📖 读取Excel文件...');
  const workbook = XLSX.readFile(FILE_PATH);
  console.log('✅ 读取成功\n');

  // ========== 1. 导入导师 ==========
  console.log('═══════════════════════════════════════');
  console.log('📋 导入导师数据');
  console.log('═══════════════════════════════════════');
  
  const teacherSheet = workbook.Sheets['教师信息管理'];
  if (teacherSheet) {
    const teacherData = XLSX.utils.sheet_to_json(teacherSheet) as any[];
    console.log(`📊 共 ${teacherData.length} 条导师记录`);

    const teacherRecords = teacherData.map((row, index) => ({
      '导师工号': `T${String(index + 1).padStart(4, '0')}`,
      '姓名': String(row['授课导师'] || '').trim(),
      '联系电话': null,
      '电子邮箱': null,
      '微信号': null,
      '导师类型': mapTeacherType(row['就职状态']),
      '合作状态': mapCooperationStatus(row['合作性质']),
      '就职状态': mapEmploymentStatus(row['就职状态']),
      '专业方向': String(row['专业方向'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      '会议链接': String(row['导师会议号'] || '').trim() || null,
    })).filter(r => r['姓名']);

    console.log(`🔄 开始导入 ${teacherRecords.length} 条记录...`);
    const result = await batchCreateRecords(CONFIG.tableIds.teachers, teacherRecords, {
      onProgress: (current, total) => {
        process.stdout.write(`\r⏳ 进度: ${current}/${total} (${Math.round(current/total*100)}%)`);
      }
    });
    console.log(`\n✅ 成功: ${result.success}, ❌ 失败: ${result.failed}\n`);
  }

  // ========== 2. 导入学生 ==========
  console.log('═══════════════════════════════════════');
  console.log('📋 导入学生数据');
  console.log('═══════════════════════════════════════');
  
  const studentSheet = workbook.Sheets['学生课时分配信息管理（有了上课记录表之后才有学生名字）'];
  if (studentSheet) {
    const studentData = XLSX.utils.sheet_to_json(studentSheet) as any[];
    console.log(`📊 共 ${studentData.length} 条学生记录`);

    // 去重
    const uniqueStudents = new Map<string, any>();
    studentData.forEach(row => {
      const name = String(row['学生姓名'] || '').trim();
      if (name && !uniqueStudents.has(name)) {
        uniqueStudents.set(name, row);
      }
    });

    const studentRecords = Array.from(uniqueStudents.values()).map((row, index) => ({
      '学号': `STD${String(index + 1).padStart(4, '0')}`,
      '姓名': String(row['学生姓名'] || '').trim(),
      '联系电话': null,
      '电子邮箱': null,
      '微信号': null,
      '学员状态': '在读',
      '学员类别': '其他',
      '申请专业方向': '其他',
      '申请国家': '其他',
      '当前阶段': mapStage(String(row['课程类别'] || '')),
      '总课时': Number(row['总-课时']) || 0,
      '已消耗课时': Number(row['总-消耗课时']) || 0,
      '剩余课时': Number(row['总-剩余课时']) || 0,
    }));

    console.log(`🔄 开始导入 ${studentRecords.length} 条记录...`);
    const result = await batchCreateRecords(CONFIG.tableIds.students, studentRecords, {
      onProgress: (current, total) => {
        process.stdout.write(`\r⏳ 进度: ${current}/${total} (${Math.round(current/total*100)}%)`);
      }
    });
    console.log(`\n✅ 成功: ${result.success}, ❌ 失败: ${result.failed}\n`);
  }

  // ========== 3. 导入上课记录 ==========
  console.log('═══════════════════════════════════════');
  console.log('📋 导入上课记录数据');
  console.log('═══════════════════════════════════════');
  
  const classRecordSheet = workbook.Sheets['上课记录总表（总表，除了教务都别改）'];
  if (classRecordSheet) {
    const classRecordData = XLSX.utils.sheet_to_json(classRecordSheet) as any[];
    console.log(`📊 共 ${classRecordData.length} 条上课记录`);

    const classRecords = classRecordData.map((row, index) => {
      const studentName = String(row['授课学生 Student Name'] || '').trim();
      const teacherName = String(row['授课老师 Tutor Name'] || '').trim();
      
      if (!studentName || !teacherName) return null;

      const classDate = parseExcelDate(row['授课日期']);
      const year = classDate?.getFullYear() || Number(row['年份']) || 2023;
      const month = classDate ? classDate.getMonth() + 1 : Number(row['月份']) || 1;
      const weekDay = classDate ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][classDate.getDay()] : '周一';

      return {
        '记录编号': `R${String(index + 1).padStart(6, '0')}`,
        '学生': studentName,
        '导师': teacherName,
        '课程类别': String(row['课程类别'] || '').replace(' / Fundamentals', '').replace(' / Project 1', '项目一').replace(' / Project 2', '项目二').replace(' / Project 3', '项目三').replace(' / Project 4', '项目四').trim(),
        '课程内容详情': String(row['课程内容'] || '').trim() || null,
        '上课日期': classDate ? classDate.getTime() : null,
        '年份': year,
        '月份': month,
        '星期': weekDay,
        '开始时间': mapTimeSlot(String(row['实际上课时间'] || '')),
        '实际时长(分钟)': Math.round((Number(row['单次消耗课时(H)(耗课时间)']) || 2) * 60),
        '授课内容摘要': String(row['授课内容细则'] || '').trim().substring(0, 1000) || null,
        '课后作业': String(row['课后作业'] || '').trim().substring(0, 500) || null,
        '作业分数': Number(row['作业分数']) || null,
        '作业完成度(%)': Number(row['上节课作业完成度']) || null,
        '剩余课时': Number(row['剩余课时（本阶段课程）'] || 0),
        '到课情况': mapAttendance(String(row['到课情况'] || '')),
        '是否已结课': String(row['是否已提交结课'] || '').includes('已结'),
        '结课状态': String(row['是否已提交结课'] || '').includes('已结') ? '已结' : '未结',
      };
    }).filter(Boolean) as Record<string, unknown>[];

    console.log(`🔄 开始导入 ${classRecords.length} 条记录...`);
    const result = await batchCreateRecords(CONFIG.tableIds.classRecords, classRecords, {
      batchSize: 500,
      onProgress: (current, total) => {
        process.stdout.write(`\r⏳ 进度: ${current}/${total} (${Math.round(current/total*100)}%)`);
      }
    });
    console.log(`\n✅ 成功: ${result.success}, ❌ 失败: ${result.failed}\n`);
  }

  console.log('═══════════════════════════════════════');
  console.log('🎉 数据导入完成！');
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);

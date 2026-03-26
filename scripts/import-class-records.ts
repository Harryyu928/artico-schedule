/**
 * 仅导入上课记录（修复日期格式）
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
  tableId: 'tblRyqhkNIWKUFwF',
};

const FILE_PATH = '/workspace/projects/temp_data.xlsx';

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
  tokenCache = {
    accessToken: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return data.tenant_access_token;
}

async function batchCreateRecords(
  tableId: string,
  records: Array<Record<string, unknown>>,
  options: { batchSize?: number; onProgress?: (current: number, total: number) => void } = {}
): Promise<{ success: number; failed: number; failedRecords: Array<{ index: number; error: string }> }> {
  const batchSize = options.batchSize || 500;
  let success = 0;
  let failed = 0;
  const failedRecords: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const accessToken = await getAccessToken();
    
    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${tableId}/records/batch_create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
        }
      );

      const result = await response.json();

      if (result.code === 0) {
        success += batch.length;
        options.onProgress?.(Math.min(i + batchSize, records.length), records.length);
      } else {
        console.error(`\n[Error] 批次 ${Math.floor(i/batchSize) + 1} 失败:`, result.msg);
        failed += batch.length;
        failedRecords.push({ index: i, error: result.msg });
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`\n[Error] 批次 ${Math.floor(i/batchSize) + 1} 异常:`, error);
      failed += batch.length;
      failedRecords.push({ index: i, error: String(error) });
    }
  }

  return { success, failed, failedRecords };
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

function mapAttendance(status: string): string {
  if (!status) return '已完成';
  if (status.includes('正常')) return '已完成';
  if (status.includes('请假')) return '已取消';
  if (status.includes('旷课')) return '学生缺席';
  if (status.includes('补课')) return '补课';
  return '已完成';
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

async function main() {
  console.log('=== 导入上课记录（修复日期格式） ===\n');

  // 读取Excel
  const workbook = XLSX.readFile(FILE_PATH);
  const classRecordSheet = workbook.Sheets['上课记录总表（总表，除了教务都别改）'];
  const classRecordData = XLSX.utils.sheet_to_json(classRecordSheet) as any[];
  
  console.log(`📊 共 ${classRecordData.length} 条原始记录`);

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
      '上课日期': classDate ? classDate.getTime() : null, // 毫秒时间戳
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

  console.log(`🔄 开始导入 ${classRecords.length} 条有效记录...\n`);

  const result = await batchCreateRecords(CONFIG.tableId, classRecords, {
    batchSize: 500,
    onProgress: (current, total) => {
      process.stdout.write(`\r⏳ 进度: ${current}/${total} (${Math.round(current/total*100)}%)`);
    }
  });

  console.log(`\n\n═══════════════════════════════════════`);
  console.log('📋 导入结果');
  console.log('═══════════════════════════════════════');
  console.log(`✅ 成功: ${result.success}`);
  console.log(`❌ 失败: ${result.failed}`);
  
  if (result.failedRecords.length > 0) {
    console.log('\n失败批次详情:');
    result.failedRecords.slice(0, 5).forEach((r, i) => {
      console.log(`  批次 ${Math.floor(r.index/500) + 1}: ${r.error}`);
    });
    if (result.failedRecords.length > 5) {
      console.log(`  ... 还有 ${result.failedRecords.length - 5} 个失败批次`);
    }
  }
}

main().catch(console.error);

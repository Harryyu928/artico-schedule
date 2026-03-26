/**
 * 全量同步飞书多维表格数据到本地数据库
 */

import { db } from '@/db';
import { students, teachers, classRecords, courses } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
  tables: {
    teachers: 'tblIXVom9KKRjZZw',
    students: 'tblJMMkDWwwZh2kx',
    classRecords: 'tblRyqhkNIWKUFwF',
    courses: 'tblVoea2chwYhOEV',
  }
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
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
  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + 7000 * 1000,
  };
  return data.tenant_access_token;
}

async function fetchAllRecords(token: string, tableId: string): Promise<any[]> {
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${tableId}/records`
    );
    url.searchParams.set('page_size', '500');
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const result = await response.json();
    if (result.code !== 0) {
      console.error(`获取记录失败: ${result.msg}`);
      break;
    }

    allRecords = allRecords.concat(result.data?.items || []);
    hasMore = result.data?.has_more;
    pageToken = result.data?.page_token;
    
    console.log(`   已获取 ${allRecords.length} 条记录...`);
  }

  return allRecords;
}

// 专业方向枚举
const VALID_MAJOR_DIRECTIONS = [
  '其他', '游戏策划', '游戏开发', '游戏美术（三维）', '游戏美术（二维）',
  '动画设计', '角色设计', '3D建模', '技术美术', 'UI设计'
] as const;

function mapMajorDirections(directions: string | string[] | undefined): typeof VALID_MAJOR_DIRECTIONS[number][] {
  if (!directions) return [];
  const arr = Array.isArray(directions) ? directions : [directions];
  return arr.map(d => {
    const found = VALID_MAJOR_DIRECTIONS.find(v => d.includes(v) || v.includes(d));
    return found || '其他';
  });
}

async function syncTeachers(token: string) {
  console.log('\n📋 同步导师数据...');
  
  const records = await fetchAllRecords(token, CONFIG.tables.teachers);
  console.log(`   飞书导师总数: ${records.length}`);

  let synced = 0, updated = 0, failed = 0;

  for (const record of records) {
    try {
      const fields = record.fields;
      const name = fields['姓名'] as string;
      
      if (!name) {
        failed++;
        continue;
      }

      // 检查是否已存在
      const existing = await db.select().from(teachers)
        .where(eq(teachers.feishuRecordId, record.record_id))
        .limit(1);

      const teacherData = {
        name,
        teacherId: existing[0]?.teacherId || `T${String(Date.now()).slice(-6)}`,
        teacherType: (fields['导师类型'] as string)?.includes('全职') ? '全职' : '兼职',
        cooperationStatus: (fields['合作状态'] as string)?.includes('合作中') ? '合作中' : '终止合作',
        employmentStatus: '在职' as const,
        majorDirections: mapMajorDirections(fields['专业方向']),
        meetingLink: fields['会议链接'] as string || null,
        feishuRecordId: record.record_id,
        updatedAt: new Date(),
        teachableCourses: existing[0]?.teachableCourses || [],
      };

      if (existing.length > 0) {
        await db.update(teachers)
          .set(teacherData)
          .where(eq(teachers.id, existing[0].id));
        updated++;
      } else {
        await db.insert(teachers).values({
          id: uuidv4(),
          ...teacherData,
          maxWeeklyHours: 20,
          currentHours: 0,
          createdAt: new Date(),
        });
        synced++;
      }
    } catch (error) {
      console.error(`   导师同步失败:`, error);
      failed++;
    }
  }

  console.log(`   ✅ 导师同步完成: 新增 ${synced}, 更新 ${updated}, 失败 ${failed}`);
  return { synced, updated, failed };
}

async function syncStudents(token: string) {
  console.log('\n📋 同步学生数据...');
  
  const records = await fetchAllRecords(token, CONFIG.tables.students);
  console.log(`   飞书学生总数: ${records.length}`);

  let synced = 0, updated = 0, failed = 0;

  for (const record of records) {
    try {
      const fields = record.fields;
      const name = fields['姓名'] as string;
      
      if (!name) {
        failed++;
        continue;
      }

      // 检查是否已存在
      const existing = await db.select().from(students)
        .where(eq(students.feishuRecordId, record.record_id))
        .limit(1);

      // 生成学号
      const studentId = fields['学号'] as string || existing[0]?.studentId || `STD${String(Date.now()).slice(-6)}`;

      const studentData = {
        name,
        studentId,
        major: fields['申请专业方向'] as string || '其他',
        applicationCountry: fields['申请国家'] as string || '其他',
        currentStage: fields['当前阶段'] as string || '基础阶段',
        totalHours: Math.round(Number(fields['总课时']) || 0),
        consumedHours: Math.round(Number(fields['已消耗课时']) || 0),
        remainingHours: Math.round(Number(fields['剩余课时']) || 0),
        studentStatus: (fields['学员状态'] as string) || '在读',
        studentCategory: (fields['学员类别'] as string) || null,
        feishuRecordId: record.record_id,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db.update(students)
          .set(studentData)
          .where(eq(students.id, existing[0].id));
        updated++;
      } else {
        await db.insert(students).values({
          id: uuidv4(),
          ...studentData,
          createdAt: new Date(),
        });
        synced++;
      }
    } catch (error) {
      console.error(`   学生同步失败:`, error);
      failed++;
    }
  }

  console.log(`   ✅ 学生同步完成: 新增 ${synced}, 更新 ${updated}, 失败 ${failed}`);
  return { synced, updated, failed };
}

async function syncClassRecords(token: string) {
  console.log('\n📋 同步上课记录数据...');
  
  const records = await fetchAllRecords(token, CONFIG.tables.classRecords);
  console.log(`   飞书上课记录总数: ${records.length}`);

  // 获取学生和导师映射
  const allStudents = await db.select().from(students);
  const allTeachers = await db.select().from(teachers);
  const studentMap = new Map(allStudents.map(s => [s.name, s]));
  const teacherMap = new Map(allTeachers.map(t => [t.name, t]));

  let synced = 0, skipped = 0, failed = 0;
  const batchSize = 100;
  const batches = Math.ceil(records.length / batchSize);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    for (const record of batch) {
      try {
        const fields = record.fields;
        const recordNo = fields['记录编号'] as string;
        
        // 检查是否已存在
        if (recordNo) {
          const existing = await db.select().from(classRecords)
            .where(eq(classRecords.recordId, recordNo))
            .limit(1);
          
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        const studentName = fields['学生'] as string;
        const teacherName = fields['导师'] as string;
        const student = studentMap.get(studentName);
        const teacher = teacherMap.get(teacherName);

        // 解析日期
        let classDateStr = new Date().toISOString().split('T')[0];
        const dateValue = fields['上课日期'];
        if (dateValue) {
          if (typeof dateValue === 'number') {
            classDateStr = new Date(dateValue * 1000).toISOString().split('T')[0];
          } else if (typeof dateValue === 'string') {
            classDateStr = dateValue;
          }
        }

        // 映射时间段
        const timeSlotMap: Record<string, string> = {
          '10:00': '10:00', '10点': '10:00', '上午': '10:00',
          '13:00': '13:00', '13点': '13:00', '下午': '13:00',
          '15:00': '15:00', '15点': '15:00',
          '18:00': '18:00', '18点': '18:00', '晚上': '18:00',
          '20:00': '20:00', '20点': '20:00',
        };
        const timeSlot = timeSlotMap[fields['开始时间'] as string] || '10:00';

        // 映射星期
        const weekDayMap: Record<string, string> = {
          '周一': '周一', '星期一': '周一', '一': '周一',
          '周二': '周二', '星期二': '周二', '二': '周二',
          '周三': '周三', '星期三': '周三', '三': '周三',
          '周四': '周四', '星期四': '周四', '四': '周四',
          '周五': '周五', '星期五': '周五', '五': '周五',
          '周六': '周六', '星期六': '周六', '六': '周六',
          '周日': '周日', '星期日': '周日', '日': '周日', '天': '周日',
        };
        const weekDay = weekDayMap[fields['星期'] as string] || '周一';

        // 映射到课情况
        const statusMap: Record<string, string> = {
          '正常': '已完成', '已完成': '已完成', '完成': '已完成',
          '取消': '已取消', '已取消': '已取消',
          '请假': '已取消', '缺席': '学生缺席', '旷课': '学生缺席',
        };
        const attendanceStatus = statusMap[fields['到课情况'] as string] || '已完成';

        await db.insert(classRecords).values({
          id: uuidv4(),
          recordId: recordNo || `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
          studentId: student?.id || '00000000-0000-0000-0000-000000000000',
          teacherId: teacher?.id || '00000000-0000-0000-0000-000000000000',
          courseId: '00000000-0000-0000-0000-000000000000',
          courseCategory: fields['课程类别'] as string || null,
          courseContentDetail: fields['课程内容详情'] as string || null,
          classDate: classDateStr,
          classYear: fields['年份'] ? Math.round(Number(fields['年份'])) : new Date(classDateStr).getFullYear(),
          classMonth: fields['月份'] ? Math.round(Number(fields['月份'])) : new Date(classDateStr).getMonth() + 1,
          weekDay: weekDay as any,
          startTime: timeSlot as any,
          actualDuration: Math.round(Number(fields['实际时长(分钟)']) || 120),
          contentSummary: (fields['授课内容摘要'] as string) || '',
          homeworkAssigned: fields['课后作业'] as string || null,
          homeworkScore: fields['作业分数'] ? Math.round(Number(fields['作业分数'])) : null,
          homeworkCompletionRate: fields['作业完成度(%)'] ? Math.round(Number(fields['作业完成度(%)'])) : null,
          remainingHours: Math.round(Number(fields['剩余课时']) || 0),
          attendanceStatus: attendanceStatus as any,
          isSettled: String(fields['是否已结课']).includes('true') || String(fields['结课状态']).includes('已结'),
          settlementStatus: (fields['结课状态'] as string)?.includes('已结') ? '已结' : '未结',
          feishuRecordId: record.record_id,
          createdBy: 'sync',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        synced++;
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          failed++;
        }
      }
    }
    
    console.log(`   进度: ${Math.min(i + batchSize, records.length)}/${records.length} (${Math.floor((i + batchSize) / records.length * 100)}%)`);
  }

  console.log(`   ✅ 上课记录同步完成: 新增 ${synced}, 跳过 ${skipped}, 失败 ${failed}`);
  return { synced, skipped, failed };
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🚀 开始全量数据同步');
  console.log('═══════════════════════════════════════');

  const token = await getAccessToken();
  console.log('✅ 获取访问令牌成功');

  const teacherResult = await syncTeachers(token);
  const studentResult = await syncStudents(token);
  const classRecordResult = await syncClassRecords(token);

  console.log('\n═══════════════════════════════════════');
  console.log('📊 同步结果汇总');
  console.log('═══════════════════════════════════════');
  console.log(`导师: 新增 ${teacherResult.synced}, 更新 ${teacherResult.updated}, 失败 ${teacherResult.failed}`);
  console.log(`学生: 新增 ${studentResult.synced}, 更新 ${studentResult.updated}, 失败 ${studentResult.failed}`);
  console.log(`上课记录: 新增 ${classRecordResult.synced}, 跳过 ${classRecordResult.skipped}, 失败 ${classRecordResult.failed}`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);

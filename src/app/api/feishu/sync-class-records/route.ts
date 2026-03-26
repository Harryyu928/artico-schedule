/**
 * 分批同步上课记录（避免超时）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBitableService } from '@/lib/feishu-bitable-service';
import { db } from '@/db';
import { students, teachers, classRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const offset = body.offset || 0;
    const limit = body.limit || 500;

    const service = getBitableService();
    if (!service.isConfigured) {
      throw new Error('飞书未配置');
    }

    // 获取学生和导师映射
    const allStudents = await db.select().from(students);
    const allTeachers = await db.select().from(teachers);
    
    const studentMap = new Map(allStudents.map(s => [s.name, s]));
    const teacherMap = new Map(allTeachers.map(t => [t.name, t]));

    // 从飞书获取上课记录（分页）
    let allRecords: any[] = [];
    let hasMore = true;
    let pageToken: string | undefined;

    // 获取所有记录
    while (hasMore) {
      const result = await service.listRecords(service.tableIds.classRecords, {
        pageSize: 500,
        pageToken,
      });
      
      allRecords = allRecords.concat(result.records);
      hasMore = result.hasMore;
      pageToken = result.pageToken;
      
      if (allRecords.length >= 7000) break; // 安全限制
    }

    const totalCount = allRecords.length;
    
    // 应用分页
    const recordsToProcess = allRecords.slice(offset, offset + limit);

    console.log(`[Sync] 总记录: ${totalCount}, 处理: ${recordsToProcess.length} (offset: ${offset}, limit: ${limit})`);

    let synced = 0;
    let failed = 0;

    for (const record of allRecords) {
      try {
        const fields = record.fields;
        const studentName = fields['学生'] as string;
        const teacherName = fields['导师'] as string;
        
        if (!studentName || !teacherName) {
          failed++;
          continue;
        }

        const recordNo = fields['记录编号'] as string;
        
        // 检查是否已存在
        if (recordNo) {
          const existing = await db.select().from(classRecords)
            .where(eq(classRecords.recordId, recordNo))
            .limit(1);
          
          if (existing.length > 0) {
            continue; // 已存在，跳过
          }
        }

        const student = studentMap.get(studentName);
        const teacher = teacherMap.get(teacherName);

        // 解析日期
        const classDate = fields['上课日期'] ? parseFeishuDate(fields['上课日期']) : new Date();

        // 创建上课记录
        await db.insert(classRecords).values({
          id: uuidv4(),
          recordId: recordNo || `R${Date.now()}`,
          studentId: student?.id || '00000000-0000-0000-0000-000000000000',
          teacherId: teacher?.id || '00000000-0000-0000-0000-000000000000',
          courseId: '00000000-0000-0000-0000-000000000000',
          courseCategory: fields['课程类别'] as string || null,
          courseContentDetail: fields['课程内容详情'] as string || null,
          classDate: classDate,
          classYear: fields['年份'] ? Math.round(Number(fields['年份'])) : classDate?.getFullYear(),
          classMonth: fields['月份'] ? Math.round(Number(fields['月份'])) : classDate ? classDate.getMonth() + 1 : null,
          weekDay: mapWeekDay(fields['星期'] as string) as any,
          startTime: mapTimeSlot(fields['开始时间'] as string) as any,
          actualDuration: Math.round(Number(fields['实际时长(分钟)']) || 120),
          contentSummary: (fields['授课内容摘要'] as string) || '',
          homeworkAssigned: fields['课后作业'] as string || null,
          homeworkScore: fields['作业分数'] ? Math.round(Number(fields['作业分数'])) : null,
          homeworkCompletionRate: fields['作业完成度(%)'] ? Math.round(Number(fields['作业完成度(%)'])) : null,
          remainingHours: Math.round(Number(fields['剩余课时']) || 0),
          attendanceStatus: mapClassStatus(fields['到课情况'] as string) as any,
          isSettled: String(fields['是否已结课']).includes('true') || String(fields['结课状态']).includes('已结'),
          settlementStatusFeishu: mapSettlementStatus(fields['结课状态'] as string) as any,
          feishuRecordId: record.record_id,
          createdBy: 'system',
        });
        
        synced++;
      } catch (error) {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成 (offset: ${offset})`,
      result: {
        synced,
        failed,
        total: totalCount,
        processed: recordsToProcess.length,
        hasMore: offset + limit < totalCount,
      },
    });

  } catch (error) {
    console.error('[API] 同步失败:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

function parseFeishuDate(value: unknown): Date | null {
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function mapWeekDay(day: string): string {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return days.find(d => day?.includes(d)) || '周一';
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

function mapClassStatus(status: string): string {
  if (!status) return '已完成';
  if (status.includes('已完成') || status.includes('正常')) return '已完成';
  if (status.includes('取消') || status.includes('请假')) return '已取消';
  if (status.includes('缺席') || status.includes('旷课')) return '学生缺席';
  if (status.includes('补课')) return '补课';
  return '已完成';
}

function mapSettlementStatus(status: string): '已结' | '未结' {
  return status?.includes('已结') ? '已结' : '未结';
}

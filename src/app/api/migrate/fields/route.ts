import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * 添加飞书同步所需的缺失字段
 */
export async function POST() {
  try {
    const results: string[] = [];

    // 添加 class_records 表缺失的字段
    const alterClassRecordsQueries = [
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS class_year INTEGER`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS class_month INTEGER`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS attendance_status_feishu VARCHAR(20) DEFAULT '正常'`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS homework_score INTEGER`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS remaining_hours INTEGER`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS settlement_status_feishu VARCHAR(20) DEFAULT '未结'`,
      `ALTER TABLE class_records ADD COLUMN IF NOT EXISTS feishu_record_id VARCHAR(100)`,
    ];

    for (const query of alterClassRecordsQueries) {
      try {
        await db.execute(sql.raw(query));
        results.push(`✅ ${query.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0] || '字段'} 添加成功`);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('already exists')) {
          results.push(`⚠️ 字段已存在`);
        } else {
          results.push(`❌ 添加失败: ${msg}`);
        }
      }
    }

    // 添加 teachers 表缺失的字段
    const alterTeachersQueries = [
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS major_directions VARCHAR(50)[]`,
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500)`,
    ];

    for (const query of alterTeachersQueries) {
      try {
        await db.execute(sql.raw(query));
        results.push(`✅ teachers 字段添加成功`);
      } catch (e) {
        results.push(`⚠️ teachers 字段已存在或添加失败`);
      }
    }

    // 添加 students 表缺失的字段
    const alterStudentsQueries = [
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS feishu_record_id VARCHAR(100)`,
    ];

    for (const query of alterStudentsQueries) {
      try {
        await db.execute(sql.raw(query));
        results.push(`✅ students 字段添加成功`);
      } catch (e) {
        results.push(`⚠️ students 字段已存在或添加失败`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '数据库字段更新完成',
      results,
    });

  } catch (error) {
    console.error('数据库字段更新失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '数据库字段更新失败',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

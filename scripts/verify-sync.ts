/**
 * 验证数据同步结果
 */

import { db } from '@/db';
import { students, teachers, classRecords } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('=== 数据同步验证 ===\n');

  // 统计数据
  const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students);
  const teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers);
  const classRecordCount = await db.select({ count: sql<number>`count(*)` }).from(classRecords);

  console.log('📊 数据统计:');
  console.log(`   学生: ${studentCount[0].count} 条`);
  console.log(`   导师: ${teacherCount[0].count} 条`);
  console.log(`   上课记录: ${classRecordCount[0].count} 条`);
  console.log('');

  // 检查学生样本
  console.log('📋 学生样本 (前5条):');
  const sampleStudents = await db.select().from(students).limit(5);
  for (const s of sampleStudents) {
    console.log(`   ${s.name} (${s.studentId}) - ${s.studentStatus || '无状态'} - 剩余课时: ${s.remainingHours}`);
  }
  console.log('');

  // 检查导师样本
  console.log('📋 导师样本 (前5条):');
  const sampleTeachers = await db.select().from(teachers).limit(5);
  for (const t of sampleTeachers) {
    console.log(`   ${t.name} (${t.teacherId}) - ${t.teacherType} - ${t.cooperationStatus}`);
  }
  console.log('');

  // 检查上课记录样本
  console.log('📋 上课记录样本 (前5条):');
  const sampleRecords = await db.select().from(classRecords).limit(5);
  for (const r of sampleRecords) {
    console.log(`   ${r.recordId} - ${r.classDate} - 时长: ${r.actualDuration}分钟 - 状态: ${r.attendanceStatus}`);
  }
  console.log('');

  // 检查数据完整性
  console.log('📋 数据完整性检查:');
  
  const studentsWithoutId = await db.select().from(students).where(sql`student_id IS NULL OR student_id = ''`);
  console.log(`   学号为空的学生: ${studentsWithoutId.length} 条`);
  
  const teachersWithoutId = await db.select().from(teachers).where(sql`teacher_id IS NULL OR teacher_id = ''`);
  console.log(`   工号为空的导师: ${teachersWithoutId.length} 条`);
  
  const studentsWithFeishuId = await db.select().from(students).where(sql`feishu_record_id IS NOT NULL`);
  console.log(`   有飞书记录ID的学生: ${studentsWithFeishuId.length} 条`);
  
  const teachersWithFeishuId = await db.select().from(teachers).where(sql`feishu_record_id IS NOT NULL`);
  console.log(`   有飞书记录ID的导师: ${teachersWithFeishuId.length} 条`);

  console.log('\n═══════════════════════════════════════');
  console.log('✅ 验证完成');
  console.log('═══════════════════════════════════════');
}

verify().catch(console.error);

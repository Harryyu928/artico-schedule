/**
 * 数据库索引服务
 * 提供索引创建和管理的编程接口
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

// 索引定义
const INDEX_DEFINITIONS = [
  // 用户相关
  { name: 'idx_users_email', table: 'users', columns: ['email'], comment: '用户邮箱索引' },
  { name: 'idx_users_role', table: 'users', columns: ['role'], comment: '用户角色索引' },
  { name: 'idx_users_feishu_id', table: 'users', columns: ['feishu_id'], comment: '飞书ID索引' },
  
  // 学生相关
  { name: 'idx_students_status', table: 'students', columns: ['status'], comment: '学生状态索引' },
  { name: 'idx_students_grade', table: 'students', columns: ['grade'], comment: '学生年级索引' },
  { name: 'idx_students_planning_consultant', table: 'students', columns: ['planning_consultant_id'], comment: '规划顾问索引' },
  { name: 'idx_students_created_at', table: 'students', columns: ['created_at'], comment: '创建时间索引' },
  
  // 导师相关
  { name: 'idx_teachers_type', table: 'teachers', columns: ['type'], comment: '导师类型索引' },
  { name: 'idx_teachers_status', table: 'teachers', columns: ['status'], comment: '导师状态索引' },
  
  // 排课结果
  { name: 'idx_schedule_results_student_id', table: 'schedule_results', columns: ['student_id'], comment: '学生排课索引' },
  { name: 'idx_schedule_results_teacher_id', table: 'schedule_results', columns: ['teacher_id'], comment: '导师排课索引' },
  { name: 'idx_schedule_results_status', table: 'schedule_results', columns: ['status'], comment: '排课状态索引' },
  { name: 'idx_schedule_results_class_date', table: 'schedule_results', columns: ['class_date'], comment: '上课日期索引' },
  { name: 'idx_schedule_results_teacher_status', table: 'schedule_results', columns: ['teacher_id', 'status'], comment: '导师+状态组合索引' },
  { name: 'idx_schedule_results_teacher_date', table: 'schedule_results', columns: ['teacher_id', 'class_date'], comment: '导师+日期组合索引' },
  
  // 工作流实例
  { name: 'idx_workflow_instances_workflow_id', table: 'workflow_instances', columns: ['workflow_id'], comment: '工作流定义索引' },
  { name: 'idx_workflow_instances_entity_id', table: 'workflow_instances', columns: ['entity_id'], comment: '实体ID索引' },
  { name: 'idx_workflow_instances_status', table: 'workflow_instances', columns: ['status'], comment: '实例状态索引' },
  { name: 'idx_workflow_instances_entity', table: 'workflow_instances', columns: ['entity_type', 'entity_id'], comment: '实体组合索引' },
  
  // 工作流任务（最关键）
  { name: 'idx_workflow_task_instances_instance_id', table: 'workflow_task_instances', columns: ['instance_id'], comment: '实例关联索引' },
  { name: 'idx_workflow_task_instances_assignee_id', table: 'workflow_task_instances', columns: ['assignee_id'], comment: '分配者索引' },
  { name: 'idx_workflow_task_instances_status', table: 'workflow_task_instances', columns: ['status'], comment: '任务状态索引' },
  { name: 'idx_workflow_task_instances_due_date', table: 'workflow_task_instances', columns: ['due_date'], comment: '截止日期索引' },
  { name: 'idx_workflow_task_instances_instance_status', table: 'workflow_task_instances', columns: ['instance_id', 'status'], comment: '实例+状态索引' },
  { name: 'idx_workflow_task_instances_assignee_status', table: 'workflow_task_instances', columns: ['assignee_id', 'status'], comment: '分配者+状态索引' },
  
  // 选课单
  { name: 'idx_course_selection_forms_student_id', table: 'course_selection_forms', columns: ['student_id'], comment: '学生选课单索引' },
  { name: 'idx_course_selection_forms_status', table: 'course_selection_forms', columns: ['status'], comment: '选课单状态索引' },
  { name: 'idx_course_selection_forms_sign_token', table: 'course_selection_forms', columns: ['sign_token'], comment: '签字Token索引' },
  
  // 上课记录
  { name: 'idx_class_records_student_id', table: 'class_records', columns: ['student_id'], comment: '学生上课记录索引' },
  { name: 'idx_class_records_teacher_id', table: 'class_records', columns: ['teacher_id'], comment: '导师上课记录索引' },
  { name: 'idx_class_records_class_date', table: 'class_records', columns: ['class_date'], comment: '上课日期索引' },
  { name: 'idx_class_records_sign_token', table: 'class_records', columns: ['sign_token'], comment: '签字Token索引' },
];

// 部分索引定义（条件索引）
const PARTIAL_INDEX_DEFINITIONS = [
  {
    name: 'idx_tasks_pending',
    table: 'workflow_task_instances',
    columns: ['assignee_id', 'due_date'],
    condition: "status = 'pending'",
    comment: '待处理任务索引',
  },
  {
    name: 'idx_instances_active',
    table: 'workflow_instances',
    columns: ['entity_type', 'entity_id'],
    condition: "status IN ('pending', 'in_progress')",
    comment: '活动工作流实例索引',
  },
];

/**
 * 创建单个索引
 */
async function createIndex(
  indexName: string,
  tableName: string,
  columns: string[],
  condition?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const columnList = columns.join(', ');
    let indexSql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnList})`;
    
    if (condition) {
      indexSql += ` WHERE ${condition}`;
    }
    
    await db.execute(sql.raw(indexSql));
    
    return {
      success: true,
      message: `✅ 创建索引成功: ${indexName} (${columnList})`,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ 创建索引失败: ${indexName} - ${(error as Error).message}`,
    };
  }
}

/**
 * 批量创建所有索引
 */
export async function createAllIndexes(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{ name: string; success: boolean; message: string }>;
}> {
  console.log('开始创建数据库索引...\n');
  
  const results: Array<{ name: string; success: boolean; message: string }> = [];
  let successCount = 0;
  let failedCount = 0;
  
  // 创建普通索引
  console.log('创建普通索引...');
  for (const indexDef of INDEX_DEFINITIONS) {
    const result = await createIndex(
      indexDef.name,
      indexDef.table,
      indexDef.columns
    );
    
    results.push({
      name: indexDef.name,
      success: result.success,
      message: result.message,
    });
    
    if (result.success) {
      successCount++;
      console.log(result.message);
    } else {
      failedCount++;
      console.error(result.message);
    }
  }
  
  // 创建部分索引
  console.log('\n创建部分索引...');
  for (const indexDef of PARTIAL_INDEX_DEFINITIONS) {
    const result = await createIndex(
      indexDef.name,
      indexDef.table,
      indexDef.columns,
      indexDef.condition
    );
    
    results.push({
      name: indexDef.name,
      success: result.success,
      message: result.message,
    });
    
    if (result.success) {
      successCount++;
      console.log(result.message);
    } else {
      failedCount++;
      console.error(result.message);
    }
  }
  
  console.log(`\n索引创建完成: 总计 ${INDEX_DEFINITIONS.length + PARTIAL_INDEX_DEFINITIONS.length} 个, 成功 ${successCount} 个, 失败 ${failedCount} 个`);
  
  return {
    total: INDEX_DEFINITIONS.length + PARTIAL_INDEX_DEFINITIONS.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 获取索引统计信息
 */
export async function getIndexStats(): Promise<{
  indexes: Array<{
    tablename: string;
    indexname: string;
    index_scans: number;
    tuples_read: number;
    tuples_fetched: number;
  }>;
}> {
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexrelname as indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    ORDER BY idx_scan DESC
    LIMIT 50
  `);
  
  // postgres.js 返回的格式可能是数组或 { rows: [] }
  const rows = Array.isArray(result) ? result : (result as any).rows || [];
  return {
    indexes: rows as any[],
  };
}

/**
 * 获取未使用的索引
 */
export async function getUnusedIndexes(): Promise<{
  indexes: Array<{
    table: string;
    index: string;
    index_size: string;
    index_scans: number;
  }>;
}> {
  const result = await db.execute(sql`
    SELECT 
      schemaname || '.' || relname AS table,
      indexrelname AS index,
      pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
      idx_scan as index_scans
    FROM pg_stat_user_indexes ui
    JOIN pg_index i ON ui.indexrelid = i.indexrelid
    WHERE NOT i.indisunique 
      AND idx_scan < 50 
      AND pg_relation_size(i.indexrelid) > 1024 * 1024
    ORDER BY pg_relation_size(i.indexrelid) DESC
    LIMIT 20
  `);
  
  // postgres.js 返回的格式可能是数组或 { rows: [] }
  const rows = Array.isArray(result) ? result : (result as any).rows || [];
  return {
    indexes: rows as any[],
  };
}

/**
 * 获取表大小统计
 */
export async function getTableSizeStats(): Promise<{
  tables: Array<{
    tablename: string;
    total_size: string;
    table_size: string;
    indexes_size: string;
  }>;
}> {
  const result = await db.execute(sql`
    SELECT 
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 20
  `);
  
  // postgres.js 返回的格式可能是数组或 { rows: [] }
  const rows = Array.isArray(result) ? result : (result as any).rows || [];
  return {
    tables: rows as any[],
  };
}

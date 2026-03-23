import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { loadEnv } from '@/storage/database/supabase-client';

// 加载环境变量
loadEnv();

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '',
  ssl: false, // URL中已包含sslmode参数
  // 添加连接超时和错误处理
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// 监听连接错误
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

// 创建 Drizzle 实例
export const db = drizzle(pool, { schema });

// 导出 schema
export * from './schema';

// 导出连接池（用于健康检查等）
export { pool };

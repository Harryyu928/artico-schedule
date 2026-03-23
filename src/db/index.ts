import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // 添加连接超时和错误处理
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 10,
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

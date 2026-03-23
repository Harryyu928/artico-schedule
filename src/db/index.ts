import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 创建 Drizzle 实例
export const db = drizzle(pool, { schema });

// 导出 schema
export * from './schema';

// 导出连接池（用于健康检查等）
export { pool };

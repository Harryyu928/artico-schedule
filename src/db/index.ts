import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 数据库连接配置
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL 未配置，数据库功能将不可用');
}

// 创建 postgres.js 连接
// Supabase 和大多数云数据库需要 SSL 连接
const needsSSL = connectionString.includes('supabase') || 
                 connectionString.includes('sslmode=require') ||
                 connectionString.includes('pooler');

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: needsSSL ? 'require' : false,
  onnotice: () => {}, // 忽略 NOTICE 消息
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 导出 schema
export * from './schema';

// 导出连接（用于健康检查等）
export { client };

// 优雅关闭
process.on('SIGINT', async () => {
  await client.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.end();
  process.exit(0);
});

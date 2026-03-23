import { loadEnv } from './src/storage/database/supabase-client';
import 'dotenv/config';

loadEnv();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PGDATABASE_URL || process.env.DATABASE_URL || '',
  },
};

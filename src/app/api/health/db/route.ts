import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // 测试数据库连接
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    
    // 查询各表数量
    const tables = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM students) as students_count,
        (SELECT COUNT(*) FROM teachers) as teachers_count
    `);
    
    const rows = Array.isArray(tables) ? tables : (tables as any).rows || [];
    
    return NextResponse.json({
      success: true,
      message: '数据库连接成功',
      currentTime: Array.isArray(result) ? result[0]?.current_time : (result as any).rows?.[0]?.current_time,
      data: {
        users: rows[0]?.users_count || 0,
        students: rows[0]?.students_count || 0,
        teachers: rows[0]?.teachers_count || 0,
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      success: false,
      error: '数据库连接失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

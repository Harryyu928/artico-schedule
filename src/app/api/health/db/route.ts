import { NextResponse } from 'next/server';

export async function GET() {
  const connectionString = process.env.DATABASE_URL || '';
  
  // 隐藏密码显示连接信息
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  
  // 检查环境变量是否存在
  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: 'DATABASE_URL 未配置',
    });
  }

  // 动态导入 postgres
  try {
    const postgres = (await import('postgres')).default;
    
    // 测试不同配置
    const configs = [
      { name: 'SSL require', ssl: 'require' as const },
      { name: 'No SSL', ssl: false as const },
    ];
    
    const results = [];
    
    for (const config of configs) {
      try {
        const client = postgres(connectionString, {
          max: 1,
          connect_timeout: 5,
          ssl: config.ssl,
          onnotice: () => {},
        });
        
        const result = await client`SELECT NOW() as time`;
        await client.end();
        
        results.push({
          config: config.name,
          success: true,
          time: result[0]?.time,
        });
      } catch (err) {
        results.push({
          config: config.name,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    
    return NextResponse.json({
      success: results.some(r => r.success),
      connectionUrl: maskedUrl,
      urlLength: connectionString.length,
      hasSupabase: connectionString.includes('supabase'),
      results,
    });
    
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: '导入 postgres 模块失败',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 数据库索引管理 API
 * POST /api/admin/db/indexes - 创建索引
 * GET /api/admin/db/indexes - 获取索引统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createAllIndexes, 
  getIndexStats, 
  getUnusedIndexes,
  getTableSizeStats 
} from '@/lib/db-indexes';

// 简单的管理员验证
function isAdmin(request: NextRequest): boolean {
  // TODO: 实现真正的管理员验证
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_SECRET_KEY;
  
  if (!adminKey) {
    console.warn('[Admin] ADMIN_SECRET_KEY not configured');
    return true; // 开发环境允许
  }
  
  return authHeader === `Bearer ${adminKey}`;
}

/**
 * 创建所有索引
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[DB Indexes] Starting index creation...');
    
    const result = await createAllIndexes();
    
    return NextResponse.json({
      success: true,
      message: `索引创建完成: 成功 ${result.success} 个, 失败 ${result.failed} 个`,
      data: result,
    });
  } catch (error) {
    console.error('[DB Indexes] Index creation failed:', error);
    return NextResponse.json(
      { 
        error: '索引创建失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * 获取索引统计信息
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'stats';

    switch (type) {
      case 'stats':
        const stats = await getIndexStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });
      
      case 'unused':
        const unused = await getUnusedIndexes();
        return NextResponse.json({
          success: true,
          data: unused,
        });
      
      case 'sizes':
        const sizes = await getTableSizeStats();
        return NextResponse.json({
          success: true,
          data: sizes,
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[DB Indexes] Failed to get stats:', error);
    return NextResponse.json(
      { 
        error: '获取统计信息失败',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

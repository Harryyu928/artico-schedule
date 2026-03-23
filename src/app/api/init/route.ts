import { NextResponse } from 'next/server';
import { initAdminUser } from '@/lib/auth';

/**
 * GET /api/init
 * 初始化系统（创建管理员账户）
 */
export async function GET() {
  try {
    await initAdminUser();
    
    return NextResponse.json({
      success: true,
      message: '系统初始化完成',
      credentials: {
        username: 'admin',
        password: 'admin123',
        note: '请及时修改默认密码',
      },
    });
  } catch (error) {
    console.error('初始化失败:', error);
    return NextResponse.json(
      { error: '初始化失败' },
      { status: 500 }
    );
  }
}

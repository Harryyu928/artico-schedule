import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * 用户登出
 */
export async function POST() {
  try {
    await logoutUser();

    const response = NextResponse.json({ success: true });

    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}

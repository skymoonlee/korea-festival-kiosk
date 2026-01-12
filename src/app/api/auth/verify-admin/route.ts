import { NextResponse } from 'next/server';
import { isAdminAuthenticated, getCurrentAdmin } from '@/lib/jwt';

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const admin = await getCurrentAdmin();
    return NextResponse.json({
      authenticated: true,
      user: admin ? { username: admin.username } : null
    });
  } catch (error) {
    console.error('Admin JWT verify error:', error);
    return NextResponse.json(
      { authenticated: false, error: '인증 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

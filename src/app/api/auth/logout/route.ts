import { NextResponse } from 'next/server';
import { clearAdminJwtCookie } from '@/lib/jwt';

export async function POST() {
  try {
    await clearAdminJwtCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: '로그아웃 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

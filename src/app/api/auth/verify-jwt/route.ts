import { NextResponse } from 'next/server';
import { isUserAuthenticated, getCurrentUser } from '@/lib/jwt';
import { getUserPermissions } from '@/lib/db';

export async function GET() {
  try {
    const authenticated = await isUserAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const user = await getCurrentUser();

    // 권한 정보 조회
    let permissions = { can_access_cooking: true, can_access_order: true };
    if (user) {
      const perms = getUserPermissions(user.userId);
      permissions = {
        can_access_cooking: perms.can_access_cooking === 1,
        can_access_order: perms.can_access_order === 1
      };
    }

    return NextResponse.json({
      authenticated: true,
      user: user ? { username: user.username } : null,
      permissions
    });
  } catch (error) {
    console.error('JWT verify error:', error);
    return NextResponse.json(
      { authenticated: false, error: '인증 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

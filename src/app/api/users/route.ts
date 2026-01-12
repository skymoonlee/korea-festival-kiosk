import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/jwt';
import { getClientUsers, createClientUser, updateClientPermissions, deleteClientUser } from '@/lib/db';

// 클라이언트 목록 조회
export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const users = getClientUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json({ error: '사용자 목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

// 클라이언트 계정 생성
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { username, password, can_access_cooking, can_access_order } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (username.length < 2) {
      return NextResponse.json({ error: '아이디는 2자 이상이어야 합니다.' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 });
    }

    const result = createClientUser(
      username,
      password,
      can_access_cooking ?? true,
      can_access_order ?? true
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: '이미 존재하는 아이디입니다.' }, { status: 400 });
    }
    return NextResponse.json({ error: '사용자를 생성할 수 없습니다.' }, { status: 500 });
  }
}

// 클라이언트 권한 수정
export async function PUT(request: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id, can_access_cooking, can_access_order } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    updateClientPermissions(id, can_access_cooking ?? true, can_access_order ?? true);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('권한 수정 오류:', error);
    if (error instanceof Error && error.message.includes('관리자')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: '권한을 수정할 수 없습니다.' }, { status: 500 });
  }
}

// 클라이언트 계정 삭제
export async function DELETE(request: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    deleteClientUser(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    if (error instanceof Error && error.message.includes('관리자')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: '사용자를 삭제할 수 없습니다.' }, { status: 500 });
  }
}

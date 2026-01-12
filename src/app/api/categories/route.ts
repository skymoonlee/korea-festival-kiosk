import { NextRequest, NextResponse } from 'next/server';
import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryMenuCount } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/jwt';

export async function GET() {
  try {
    const categories = getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { name, sort_order } = await request.json();
    if (!name) {
      return NextResponse.json({ error: '카테고리 이름을 입력해주세요.' }, { status: 400 });
    }

    const result = createCategory(name, sort_order || 0);
    return NextResponse.json({ id: result.lastInsertRowid, name, sort_order });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: '카테고리 생성 실패' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id, name, sort_order } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
    }

    updateCategory(id, name, sort_order || 0);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: '카테고리 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const categoryId = parseInt(id);
    const menuCount = getCategoryMenuCount(categoryId);
    if (menuCount > 0) {
      return NextResponse.json({ error: `이 카테고리에 ${menuCount}개의 메뉴가 있어 삭제할 수 없습니다. 먼저 메뉴를 삭제하거나 다른 카테고리로 이동해주세요.` }, { status: 400 });
    }

    deleteCategory(categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: '카테고리 삭제 실패' }, { status: 500 });
  }
}

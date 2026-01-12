import { NextRequest, NextResponse } from 'next/server';
import { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, safeDeleteMenuItem, getOptionGroups, getOptionChoices } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const withOptions = searchParams.get('with_options') === 'true';
    const itemId = searchParams.get('id');

    if (itemId) {
      const item = getMenuItem(parseInt(itemId));
      if (!item) {
        return NextResponse.json({ error: '메뉴를 찾을 수 없습니다.' }, { status: 404 });
      }

      if (withOptions) {
        const optionGroups = getOptionGroups(parseInt(itemId)) as { id: number }[];
        const optionGroupsWithChoices = optionGroups.map(group => ({
          ...group,
          choices: getOptionChoices(group.id)
        }));
        return NextResponse.json({ ...item, optionGroups: optionGroupsWithChoices });
      }

      return NextResponse.json(item);
    }

    let items = getMenuItems(categoryId ? parseInt(categoryId) : undefined) as { id: number }[];

    if (withOptions) {
      items = items.map(item => {
        const optionGroups = getOptionGroups(item.id) as { id: number }[];
        const optionGroupsWithChoices = optionGroups.map(group => ({
          ...group,
          choices: getOptionChoices(group.id)
        }));
        return { ...item, optionGroups: optionGroupsWithChoices };
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Get menu error:', error);
    return NextResponse.json({ error: '메뉴 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.name || !data.price || !data.category_id) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
    }

    const result = createMenuItem(data);
    return NextResponse.json({ id: result.lastInsertRowid, ...data });
  } catch (error) {
    console.error('Create menu error:', error);
    return NextResponse.json({ error: '메뉴 생성 실패' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    updateMenuItem(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update menu error:', error);
    return NextResponse.json({ error: '메뉴 수정 실패' }, { status: 500 });
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

    safeDeleteMenuItem(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete menu error:', error);
    return NextResponse.json({ error: '메뉴 삭제 실패' }, { status: 500 });
  }
}

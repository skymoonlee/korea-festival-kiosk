import { NextRequest, NextResponse } from 'next/server';
import { createOptionGroup, deleteOptionGroup, createOptionChoice, deleteOptionChoice, getOptionGroups, getOptionChoices } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menu_item_id');

    if (!menuItemId) {
      return NextResponse.json({ error: 'menu_item_id가 필요합니다.' }, { status: 400 });
    }

    const optionGroups = getOptionGroups(parseInt(menuItemId)) as { id: number }[];
    const result = optionGroups.map(group => ({
      ...group,
      choices: getOptionChoices(group.id)
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get options error:', error);
    return NextResponse.json({ error: '옵션 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const data = await request.json();
    const { type } = data;

    if (type === 'group') {
      const { menu_item_id, name, is_required, max_select } = data;
      if (!menu_item_id || !name) {
        return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
      }

      const result = createOptionGroup({ menu_item_id, name, is_required, max_select });
      return NextResponse.json({ id: result.lastInsertRowid, ...data });
    } else if (type === 'choice') {
      const { option_group_id, name, price_modifier, is_default } = data;
      if (!option_group_id || !name) {
        return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 });
      }

      const result = createOptionChoice({ option_group_id, name, price_modifier, is_default });
      return NextResponse.json({ id: result.lastInsertRowid, ...data });
    }

    return NextResponse.json({ error: '유효하지 않은 타입입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Create option error:', error);
    return NextResponse.json({ error: '옵션 생성 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID와 type이 필요합니다.' }, { status: 400 });
    }

    if (type === 'group') {
      deleteOptionGroup(parseInt(id));
    } else if (type === 'choice') {
      deleteOptionChoice(parseInt(id));
    } else {
      return NextResponse.json({ error: '유효하지 않은 타입입니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete option error:', error);
    return NextResponse.json({ error: '옵션 삭제 실패' }, { status: 500 });
  }
}

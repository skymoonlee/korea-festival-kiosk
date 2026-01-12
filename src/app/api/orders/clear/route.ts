import { NextResponse } from 'next/server';
import { clearAllOrders } from '@/lib/db';

const MASTER_PASSWORD = '5678';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password !== MASTER_PASSWORD) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    clearAllOrders();

    return NextResponse.json({ success: true, message: '모든 주문 데이터가 삭제되었습니다.' });
  } catch (error) {
    console.error('Clear orders error:', error);
    return NextResponse.json(
      { error: '데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

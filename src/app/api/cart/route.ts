import { NextRequest, NextResponse } from 'next/server';
import { getCart, updateCart, clearCart, CartItem } from '@/lib/cart-store';

export async function GET() {
  try {
    const cart = getCart();
    return NextResponse.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json({ error: '장바구니 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: CartItem[] };
    const cart = updateCart(items);
    return NextResponse.json(cart);
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json({ error: '장바구니 업데이트 실패' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cart = clearCart();
    return NextResponse.json(cart);
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json({ error: '장바구니 초기화 실패' }, { status: 500 });
  }
}

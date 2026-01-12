import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrders, getActiveOrders } from '@/lib/db';
import { clearCart, notifyNewOrder } from '@/lib/cart-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const active = searchParams.get('active') === 'true';

    if (active) {
      const orders = getActiveOrders();
      return NextResponse.json(orders);
    }

    const orders = getOrders(status || undefined);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: '주문 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { items, totalPrice } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '주문 항목이 없습니다.' }, { status: 400 });
    }

    const orderItems = items.map((item: {
      menuItemId?: number;
      setMenuId?: number;
      name: string;
      quantity: number;
      totalPrice: number;
      options?: { groupName: string; choiceName: string; priceModifier: number }[];
    }) => ({
      menu_item_id: item.menuItemId,
      set_menu_id: item.setMenuId,
      name: item.name,
      quantity: item.quantity,
      unit_price: Math.floor(item.totalPrice / item.quantity),
      options_json: item.options ? JSON.stringify(item.options) : null
    }));

    const result = createOrder(totalPrice, orderItems);

    // 장바구니 초기화
    clearCart();

    // 새 주문 알림 (SSE)
    const newOrder = {
      id: result.orderId,
      order_number: result.orderNumber,
      status: 'pending',
      total_price: totalPrice,
      items: orderItems,
      created_at: new Date().toISOString()
    };
    notifyNewOrder(newOrder);

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 });
  }
}

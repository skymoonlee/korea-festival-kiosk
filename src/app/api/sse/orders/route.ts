import { subscribeOrders } from '@/lib/cart-store';
import { getActiveOrders } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 초기 활성 주문 목록 전송
      try {
        const activeOrders = getActiveOrders();
        const initData = JSON.stringify({ type: 'init', data: activeOrders });
        controller.enqueue(encoder.encode(`data: ${initData}\n\n`));
      } catch (error) {
        console.error('Failed to get initial orders:', error);
      }

      // 주문 변경 구독
      const unsubscribe = subscribeOrders((order) => {
        try {
          const data = JSON.stringify({ type: 'order_update', data: order });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // 연결이 끊어진 경우
        }
      });

      // 30초마다 하트비트
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // 클린업
      return () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

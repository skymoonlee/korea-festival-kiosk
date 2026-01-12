import { subscribeCart } from '@/lib/cart-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인 메시지
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // 장바구니 변경 구독
      const unsubscribe = subscribeCart((cart) => {
        try {
          const data = JSON.stringify({ type: 'cart_update', data: cart });
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

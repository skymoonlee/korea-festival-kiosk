// 서버 사이드 장바구니 상태 관리 (메모리 기반)
// 실시간으로 고객 화면에 전송하기 위함

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  options: {
    groupName: string;
    choiceName: string;
    priceModifier: number;
  }[];
  totalPrice: number;
}

interface CartState {
  items: CartItem[];
  totalPrice: number;
  lastUpdated: number;
}

// 전역 장바구니 상태
let currentCart: CartState = {
  items: [],
  totalPrice: 0,
  lastUpdated: Date.now()
};

// SSE 클라이언트 연결 관리
const cartClients: Set<(data: CartState) => void> = new Set();
const orderClients: Set<(data: unknown) => void> = new Set();

export function getCart(): CartState {
  return currentCart;
}

export function updateCart(items: CartItem[]): CartState {
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
  currentCart = {
    items,
    totalPrice,
    lastUpdated: Date.now()
  };

  // 모든 장바구니 SSE 클라이언트에 알림
  cartClients.forEach(callback => callback(currentCart));

  return currentCart;
}

export function clearCart(): CartState {
  currentCart = {
    items: [],
    totalPrice: 0,
    lastUpdated: Date.now()
  };

  cartClients.forEach(callback => callback(currentCart));

  return currentCart;
}

// 장바구니 SSE 구독
export function subscribeCart(callback: (data: CartState) => void): () => void {
  cartClients.add(callback);
  // 즉시 현재 상태 전송
  callback(currentCart);
  return () => cartClients.delete(callback);
}

// 주문 SSE 구독
export function subscribeOrders(callback: (data: unknown) => void): () => void {
  orderClients.add(callback);
  return () => orderClients.delete(callback);
}

// 새 주문 알림
export function notifyNewOrder(order: unknown) {
  orderClients.forEach(callback => callback(order));
}

// 주문 상태 변경 알림
export function notifyOrderUpdate(order: unknown) {
  orderClients.forEach(callback => callback(order));
}

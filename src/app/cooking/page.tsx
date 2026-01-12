'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  options_json?: string;
}

interface Order {
  id: number;
  order_number: number;
  status: 'pending' | 'cooking' | 'completed' | 'cancelled';
  total_price: number;
  created_at: string;
  completed_at?: string;
  items: OrderItem[];
}

export default function CookingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify-jwt');
        if (!res.ok) {
          router.push('/user-login?redirect=/cooking');
          return;
        }
        const data = await res.json();
        // 권한 확인
        if (!data.permissions?.can_access_cooking) {
          alert('이 페이지에 접근할 권한이 없습니다.');
          router.push('/user-login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/user-login?redirect=/cooking');
      }
    };
    checkAuth();
  }, [router]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders?active=true');
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }

    const completedRes = await fetch('/api/orders?status=completed');
    if (completedRes.ok) {
      const data = await completedRes.json();
      setCompletedOrders(data.slice(0, 20)); // 최근 20개만
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // SSE 연결
    const connectSSE = () => {
      const eventSource = new EventSource('/api/sse/orders');
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'init') {
          setOrders(message.data);
        } else if (message.type === 'order_update') {
          const updatedOrder = message.data as Order;

          if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
            setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
            if (updatedOrder.status === 'completed') {
              setCompletedOrders(prev => [updatedOrder, ...prev].slice(0, 20));
            }
          } else {
            setOrders(prev => {
              const exists = prev.find(o => o.id === updatedOrder.id);
              if (exists) {
                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
              }
              return [...prev, updatedOrder].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // 3초 후 재연결
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        alert('상태 변경에 실패했습니다.');
      }
    } catch {
      alert('오류가 발생했습니다.');
    }
  };

  const parseOptions = (optionsJson?: string) => {
    if (!optionsJson) return [];
    try {
      return JSON.parse(optionsJson) as { groupName: string; choiceName: string; priceModifier: number }[];
    } catch {
      return [];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'cooking': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'completed': return 'bg-green-100 border-green-400 text-green-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'cooking': return '조리중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const cookingOrders = orders.filter(o => o.status === 'cooking');

  // 인증 확인 중
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">인증 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">주방 화면</h1>
        <div className="flex items-center gap-4">
          <div className="text-lg">
            대기: <span className="text-yellow-400 font-bold">{pendingOrders.length}</span>
            {' / '}
            조리중: <span className="text-orange-400 font-bold">{cookingOrders.length}</span>
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            {showCompleted ? '활성 주문' : '완료 내역'}
          </button>
        </div>
      </header>

      {showCompleted ? (
        // 완료 내역
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">완료된 주문</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {completedOrders.map(order => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-4 opacity-70">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-bold">#{order.order_number}</span>
                  <span className="text-sm text-gray-400">{formatTime(order.created_at)}</span>
                </div>
                <div className="space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-400"> x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 활성 주문
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 대기중 */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-yellow-400">대기중</h2>
            <div className="space-y-4">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  className={`rounded-lg p-4 border-2 ${getStatusColor(order.status)}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-3xl font-bold text-gray-900">#{order.order_number}</span>
                    <span className="text-sm">{formatTime(order.created_at)}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map(item => {
                      const options = parseOptions(item.options_json);
                      return (
                        <div key={item.id} className="bg-white/50 rounded p-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            <span className="text-xl font-bold text-gray-900">x{item.quantity}</span>
                          </div>
                          {options.length > 0 && (
                            <div className="text-sm text-gray-600 mt-1">
                              {options.map((opt, i) => (
                                <span key={i}>
                                  {opt.choiceName}
                                  {i < options.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cooking')}
                      className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600"
                    >
                      조리 시작
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                    >
                      바로 완료
                    </button>
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <div className="text-center text-gray-500 py-10">대기중인 주문이 없습니다</div>
              )}
            </div>
          </div>

          {/* 조리중 */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-orange-400">조리중</h2>
            <div className="space-y-4">
              {cookingOrders.map(order => (
                <div
                  key={order.id}
                  className={`rounded-lg p-4 border-2 ${getStatusColor(order.status)}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-3xl font-bold text-gray-900">#{order.order_number}</span>
                    <span className="text-sm">{formatTime(order.created_at)}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map(item => {
                      const options = parseOptions(item.options_json);
                      return (
                        <div key={item.id} className="bg-white/50 rounded p-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            <span className="text-xl font-bold text-gray-900">x{item.quantity}</span>
                          </div>
                          {options.length > 0 && (
                            <div className="text-sm text-gray-600 mt-1">
                              {options.map((opt, i) => (
                                <span key={i}>
                                  {opt.choiceName}
                                  {i < options.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                  >
                    조리 완료
                  </button>
                </div>
              ))}
              {cookingOrders.length === 0 && (
                <div className="text-center text-gray-500 py-10">조리중인 주문이 없습니다</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

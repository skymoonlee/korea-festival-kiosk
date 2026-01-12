'use client';

import { useState, useEffect, useCallback } from 'react';
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
  items?: OrderItem[];
}

interface Stats {
  today: {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
  };
  menuRanking: {
    name: string;
    total_quantity: number;
    total_revenue: number;
  }[];
}

export default function AdminCheckPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'orders'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [clearError, setClearError] = useState('');

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify-admin');
        if (!res.ok) {
          router.push('/admin-login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin-login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    const url = statusFilter === 'all' ? '/api/orders' : `/api/orders?status=${statusFilter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchOrders()]);
      setIsLoading(false);
    };
    init();
  }, [fetchStats, fetchOrders, isAuthenticated]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin-login');
  };

  const fetchOrderDetail = async (orderId: number) => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedOrder(data);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });

    if (res.ok) {
      await fetchOrders();
      await fetchStats();
      if (selectedOrder?.id === orderId) {
        await fetchOrderDetail(orderId);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cooking': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  const parseOptions = (optionsJson?: string) => {
    if (!optionsJson) return [];
    try {
      return JSON.parse(optionsJson);
    } catch {
      return [];
    }
  };

  const handleClearData = async () => {
    setClearError('');
    try {
      const res = await fetch('/api/orders/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword }),
      });

      if (res.ok) {
        setShowClearModal(false);
        setMasterPassword('');
        setSelectedOrder(null);
        await fetchStats();
        await fetchOrders();
        alert('모든 주문 데이터가 삭제되었습니다.');
      } else {
        const data = await res.json();
        setClearError(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      setClearError('오류가 발생했습니다.');
    }
  };

  if (isAuthenticated === null || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">{isAuthenticated === null ? '인증 확인 중...' : '로딩 중...'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">관리자 페이지</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin-food')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              메뉴 관리
            </button>
            <button
              onClick={() => router.push('/admin-maker')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              계정 관리
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              데이터 초기화
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            매출 통계
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            주문 내역
          </button>
        </div>

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* 오늘 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">오늘 총 주문</div>
                <div className="text-3xl font-bold text-blue-600">{stats.today.totalOrders}건</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">완료된 주문</div>
                <div className="text-3xl font-bold text-green-600">{stats.today.completedOrders}건</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-1">총 매출</div>
                <div className="text-3xl font-bold text-purple-600">
                  {(stats.today.totalRevenue || 0).toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 메뉴별 판매 순위 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">오늘 메뉴별 판매 순위</h2>
              {stats.menuRanking.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">순위</th>
                      <th className="text-left py-2">메뉴명</th>
                      <th className="text-right py-2">판매수량</th>
                      <th className="text-right py-2">매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.menuRanking.map((item, index) => (
                      <tr key={item.name} className="border-b">
                        <td className="py-3">{index + 1}</td>
                        <td className="py-3 font-medium">{item.name}</td>
                        <td className="py-3 text-right">{item.total_quantity}개</td>
                        <td className="py-3 text-right">{item.total_revenue.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 py-8">아직 판매 데이터가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 주문 목록 */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">주문 내역</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">전체</option>
                  <option value="pending">대기중</option>
                  <option value="cooking">조리중</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3">주문번호</th>
                      <th className="text-left p-3">시간</th>
                      <th className="text-right p-3">금액</th>
                      <th className="text-center p-3">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr
                        key={order.id}
                        onClick={() => fetchOrderDetail(order.id)}
                        className={`border-b cursor-pointer hover:bg-gray-50 ${
                          selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-3 font-bold">#{order.order_number}</td>
                        <td className="p-3 text-sm text-gray-600">{formatDateTime(order.created_at)}</td>
                        <td className="p-3 text-right">{order.total_price.toLocaleString()}원</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center text-gray-500 py-8">주문이 없습니다.</div>
                )}
              </div>
            </div>

            {/* 주문 상세 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">주문 상세</h2>
              </div>
              {selectedOrder ? (
                <div className="p-4">
                  <div className="mb-4">
                    <div className="text-2xl font-bold mb-2">#{selectedOrder.order_number}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(selectedOrder.created_at)}</div>
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-sm ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <h3 className="font-medium mb-2">주문 항목</h3>
                    <div className="space-y-2">
                      {selectedOrder.items?.map(item => {
                        const options = parseOptions(item.options_json);
                        return (
                          <div key={item.id} className="bg-gray-50 rounded p-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.name}</span>
                              <span>x{item.quantity}</span>
                            </div>
                            {options.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {options.map((opt: { choiceName: string }, i: number) => (
                                  <span key={i}>
                                    {opt.choiceName}
                                    {i < options.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-right text-sm text-gray-600">
                              {(item.unit_price * item.quantity).toLocaleString()}원
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 금액</span>
                      <span>{selectedOrder.total_price.toLocaleString()}원</span>
                    </div>
                  </div>

                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <div className="border-t pt-4 space-y-2">
                      <h3 className="font-medium mb-2">상태 변경</h3>
                      <div className="flex gap-2">
                        {selectedOrder.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(selectedOrder.id, 'cooking')}
                            className="flex-1 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                          >
                            조리중
                          </button>
                        )}
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                          className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          완료
                        </button>
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                          className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  주문을 선택해주세요.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 마스터 비밀번호 모달 */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">데이터 초기화</h2>
            <p className="text-gray-600 mb-4">
              모든 주문 데이터와 매출 통계가 삭제됩니다.<br />
              계속하려면 마스터 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="마스터 비밀번호"
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleClearData()}
            />
            {clearError && (
              <p className="text-red-500 text-sm mb-4">{clearError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setMasterPassword('');
                  setClearError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

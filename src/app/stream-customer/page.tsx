'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface OptionChoice {
  id: number;
  name: string;
  price_modifier: number;
  is_default: number;
}

interface OptionGroup {
  id: number;
  name: string;
  is_required: number;
  max_select: number;
  choices: OptionChoice[];
}

interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  is_available: boolean;
  optionGroups?: OptionGroup[];
}

interface CartItem {
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

export default function StreamCustomerPage() {
  const router = useRouter();

  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 카트 상태 (SSE)
  const [cart, setCart] = useState<CartState>({ items: [], totalPrice: 0, lastUpdated: 0 });
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 메뉴 상태
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);

  // 카테고리 정렬 순서 (세트 → 단품 → 에이드)
  const categoryOrder = ['세트', '단품', '에이드'];

  // 정렬된 카테고리
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.name);
      const bIndex = categoryOrder.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return a.sort_order - b.sort_order;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [categories]);

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify-jwt');
        if (!res.ok) {
          router.push('/user-login?redirect=/stream-customer');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/user-login?redirect=/stream-customer');
      }
    };
    checkAuth();
  }, [router]);

  // 메뉴 데이터 fetch
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMenuData = async () => {
      setIsMenuLoading(true);
      try {
        const [catRes, menuRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/menu?with_options=true')
        ]);

        if (catRes.ok) {
          const cats: Category[] = await catRes.json();
          setCategories(cats);
        }

        if (menuRes.ok) {
          const items: MenuItem[] = await menuRes.json();
          setMenuItems(items);
        }
      } catch (error) {
        console.error('Failed to fetch menu data:', error);
      } finally {
        setIsMenuLoading(false);
      }
    };

    fetchMenuData();
  }, [isAuthenticated]);

  // SSE 연결 (카트 업데이트)
  useEffect(() => {
    if (!isAuthenticated) return;

    const connectSSE = () => {
      const eventSource = new EventSource('/api/sse/cart');
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'connected') {
          setConnected(true);
        } else if (message.type === 'cart_update') {
          setCart(message.data);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [isAuthenticated]);

  // 카테고리별 메뉴 가져오기
  const getMenuItemsByCategory = (categoryId: number) => {
    return menuItems.filter(item => item.category_id === categoryId && item.is_available);
  };

  // 인증 확인 중 로딩
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">인증 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      {/* 헤더 - 컴팩트 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 md:px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex-1 mr-3">
            <div className="font-bold text-amber-900 text-lg md:text-xl">
              {process.env.NEXT_PUBLIC_BANK_ACCOUNT || '계좌번호를 설정해주세요'}
            </div>
          </div>
          <div className={`flex items-center gap-1 ${connected ? 'text-green-600' : 'text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs font-medium">{connected ? '연결됨' : '연결중'}</span>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 - 태블릿/데스크톱: 좌우 분할 */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 메뉴판 영역 */}
        <div className="flex-1 md:w-[70%] lg:w-3/5 flex flex-col md:border-r border-gray-200 bg-white overflow-hidden">
          {/* 메뉴 그리드 - 카테고리별 섹션 */}
          <div className="flex-1 p-2 md:p-3 lg:p-4 overflow-y-auto pb-40 md:pb-3">
            {isMenuLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500 text-sm">메뉴 로딩 중...</div>
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500 text-sm">등록된 메뉴가 없습니다.</div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {sortedCategories.map(category => {
                  const categoryItems = getMenuItemsByCategory(category.id);
                  if (categoryItems.length === 0) return null;

                  return (
                    <section key={category.id}>
                      {/* 카테고리 제목 */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <h2 className="text-sm md:text-base font-bold text-gray-900">{category.name}</h2>
                        <span className="text-xs text-gray-400">({categoryItems.length})</span>
                      </div>

                      {/* 메뉴 그리드 - 패드: 3열, 데스크톱: 3-4열 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-2.5">
                        {categoryItems.map(item => (
                          <div
                            key={item.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 md:p-2.5"
                          >
                            {item.image_url && (
                              <div className="w-full h-16 md:h-20 bg-gray-100 rounded mb-1.5 overflow-hidden">
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <h3 className="text-xs md:text-sm font-semibold text-gray-900 leading-tight">{item.name}</h3>
                            <div className="text-sm md:text-base font-bold text-blue-600 mt-0.5">
                              {item.price.toLocaleString()}원
                            </div>

                            {/* 옵션 표시 - 컴팩트 */}
                            {item.optionGroups && item.optionGroups.length > 0 && (
                              <div className="mt-1.5 space-y-1 border-t border-gray-100 pt-1.5">
                                {item.optionGroups.map(group => (
                                  <div key={group.id}>
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span className={`text-[10px] ${group.is_required ? 'text-red-500' : 'text-blue-500'}`}>
                                        {group.is_required ? '●' : '○'}
                                      </span>
                                      <span className="text-[10px] font-medium text-gray-600">{group.name}</span>
                                      <span className={`text-[8px] px-1 py-0.5 rounded ${
                                        group.is_required
                                          ? 'bg-red-100 text-red-600'
                                          : 'bg-blue-100 text-blue-600'
                                      }`}>
                                        {group.is_required ? '필수' : '선택'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-0.5 ml-2.5">
                                      {group.choices.map(choice => (
                                        <span
                                          key={choice.id}
                                          className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-600"
                                        >
                                          {choice.name}
                                          {choice.price_modifier !== 0 && (
                                            <span className="text-gray-400">
                                              {choice.price_modifier > 0 ? '+' : ''}{choice.price_modifier.toLocaleString()}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 주문 현황 영역 - 모바일: 하단 고정, 태블릿/데스크톱: 우측 */}
        <div className="fixed bottom-0 left-0 right-0 md:relative md:w-[30%] lg:w-2/5 flex flex-col bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none max-h-[40vh] md:max-h-none">
          {/* 섹션 타이틀 */}
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <h2 className="text-sm md:text-base font-bold text-gray-900">
              현재 주문
              {cart.items.length > 0 && (
                <span className="ml-1.5 text-blue-600">({cart.items.reduce((acc, item) => acc + item.quantity, 0)}개)</span>
              )}
            </h2>
          </div>

          {/* 카트 아이템 */}
          <div className="flex-1 p-2 md:p-3 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 md:h-full text-gray-400">
                <div className="text-3xl md:text-4xl mb-1 opacity-50">🛒</div>
                <p className="text-xs md:text-sm">메뉴를 선택해주세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-2 shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 text-xs md:text-sm">{item.name}</h3>
                      <span className="text-sm font-bold text-blue-600">{item.quantity}개</span>
                    </div>
                    {item.options.length > 0 && (
                      <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                        {item.options.map((opt, i) => (
                          <span key={i}>
                            {opt.choiceName}
                            {i < item.options.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-right text-xs md:text-sm font-medium text-gray-700 mt-0.5">
                      {item.totalPrice.toLocaleString()}원
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 총 금액 */}
          <div className="bg-white border-t border-gray-200 p-2 md:p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base font-bold text-gray-900">총 결제금액</span>
              <span className="text-lg md:text-xl font-bold text-blue-600">
                {cart.totalPrice.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 - 모바일에서는 숨김 */}
      <footer className="hidden md:block bg-white border-t border-gray-200 px-3 py-1.5 text-center text-gray-500 text-xs">
        직원에게 결제해주세요
      </footer>
    </div>
  );
}

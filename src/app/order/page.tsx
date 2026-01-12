'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  description?: string;
  is_available: number;
  optionGroups?: OptionGroup[];
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
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

export default function OrderPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCart, setShowCart] = useState(false); // 모바일 장바구니 모달

  // 옵션 선택 모달
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});

  // 주문 완료 모달
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify-jwt');
        if (!res.ok) {
          router.push('/user-login?redirect=/order');
          return;
        }
        const data = await res.json();
        // 권한 확인
        if (!data.permissions?.can_access_order) {
          alert('이 페이지에 접근할 권한이 없습니다.');
          router.push('/user-login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/user-login?redirect=/order');
      }
    };
    checkAuth();
  }, [router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [catRes, menuRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/menu?with_options=true')
    ]);

    if (catRes.ok) {
      const cats = await catRes.json();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
    }

    if (menuRes.ok) {
      const items = await menuRes.json();
      setMenuItems(items);
    }
    setIsLoading(false);
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 장바구니 변경 시 서버에 동기화
  const syncCart = useCallback(async (items: CartItem[]) => {
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
    } catch (error) {
      console.error('Cart sync error:', error);
    }
  }, []);

  useEffect(() => {
    syncCart(cart);
  }, [cart, syncCart]);

  const filteredMenuItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory && item.is_available)
    : menuItems.filter(item => item.is_available);

  const handleMenuClick = (item: MenuItem) => {
    if (item.optionGroups && item.optionGroups.length > 0) {
      setSelectedMenuItem(item);
      // 기본 옵션 선택
      const defaults: Record<number, number[]> = {};
      item.optionGroups.forEach(group => {
        const defaultChoice = group.choices.find(c => c.is_default);
        if (defaultChoice) {
          defaults[group.id] = [defaultChoice.id];
        } else if (group.is_required && group.choices.length > 0) {
          defaults[group.id] = [group.choices[0].id];
        }
      });
      setSelectedOptions(defaults);
      setShowOptionModal(true);
    } else {
      addToCart(item, []);
    }
  };

  const handleOptionSelect = (groupId: number, choiceId: number, maxSelect: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      if (current.includes(choiceId)) {
        return { ...prev, [groupId]: current.filter(id => id !== choiceId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [choiceId] };
      }
      if (current.length >= maxSelect) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, choiceId] };
    });
  };

  const handleConfirmOptions = () => {
    if (!selectedMenuItem) return;

    // 필수 옵션 검증
    const missingRequired = selectedMenuItem.optionGroups?.find(
      group => group.is_required && (!selectedOptions[group.id] || selectedOptions[group.id].length === 0)
    );

    if (missingRequired) {
      alert(`${missingRequired.name}을(를) 선택해주세요.`);
      return;
    }

    // 선택된 옵션 정보 생성
    const options: CartItem['options'] = [];
    selectedMenuItem.optionGroups?.forEach(group => {
      const selectedChoiceIds = selectedOptions[group.id] || [];
      selectedChoiceIds.forEach(choiceId => {
        const choice = group.choices.find(c => c.id === choiceId);
        if (choice) {
          options.push({
            groupName: group.name,
            choiceName: choice.name,
            priceModifier: choice.price_modifier
          });
        }
      });
    });

    addToCart(selectedMenuItem, options);
    setShowOptionModal(false);
    setSelectedMenuItem(null);
    setSelectedOptions({});
  };

  const addToCart = (item: MenuItem, options: CartItem['options']) => {
    const optionsPrice = options.reduce((sum, opt) => sum + opt.priceModifier, 0);
    const itemTotal = item.price + optionsPrice;

    // 같은 메뉴와 같은 옵션이 있는지 확인
    const existingIndex = cart.findIndex(
      cartItem =>
        cartItem.menuItemId === item.id &&
        JSON.stringify(cartItem.options) === JSON.stringify(options)
    );

    if (existingIndex >= 0) {
      setCart(prev => prev.map((cartItem, index) =>
        index === existingIndex
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
              totalPrice: cartItem.totalPrice + itemTotal
            }
          : cartItem
      ));
    } else {
      setCart(prev => [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        options,
        totalPrice: itemTotal
      }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
      const newQuantity = item.quantity + delta;

      if (newQuantity <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      const unitPrice = item.totalPrice / item.quantity;
      return prev.map((cartItem, i) =>
        i === index
          ? { ...cartItem, quantity: newQuantity, totalPrice: unitPrice * newQuantity }
          : cartItem
      );
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleOrder = async () => {
    if (cart.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, totalPrice })
      });

      if (res.ok) {
        const data = await res.json();
        setOrderNumber(data.orderNumber);
        setShowCompleteModal(true);
        setCart([]);
      } else {
        alert('주문에 실패했습니다.');
      }
    } catch {
      alert('주문 처리 중 오류가 발생했습니다.');
    }
  };

  // 인증 확인 중
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">인증 확인 중...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* 왼쪽: 메뉴 선택 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 카테고리 탭 */}
        <div className="bg-white shadow px-4 py-3 flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium whitespace-nowrap transition-colors text-sm md:text-base ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 메뉴 그리드 */}
        <div className="flex-1 p-4 overflow-y-auto pb-24 lg:pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className="bg-white rounded-lg shadow p-3 md:p-4 text-left hover:shadow-lg transition-shadow"
              >
                <div className="text-base md:text-lg font-medium text-gray-800 mb-1 md:mb-2">{item.name}</div>
                {item.description && (
                  <div className="text-xs md:text-sm text-gray-500 mb-1 md:mb-2 line-clamp-2">{item.description}</div>
                )}
                <div className="text-lg md:text-xl font-bold text-blue-600">
                  {item.price.toLocaleString()}원
                </div>
                {item.optionGroups && item.optionGroups.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">옵션 선택 가능</div>
                )}
              </button>
            ))}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              {categories.length === 0 ? '메뉴가 등록되지 않았습니다.' : '이 카테고리에 메뉴가 없습니다.'}
            </div>
          )}
        </div>
      </div>

      {/* 모바일 하단 장바구니 버튼 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-4">
        <button
          onClick={() => setShowCart(true)}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg flex justify-between items-center px-6"
        >
          <span>장바구니 ({cart.length})</span>
          <span>{totalPrice.toLocaleString()}원</span>
        </button>
      </div>

      {/* 모바일 장바구니 모달 */}
      {showCart && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">주문 내역</h2>
              <button onClick={() => setShowCart(false)} className="text-2xl text-gray-500">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-10">메뉴를 선택해주세요</div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{item.name}</div>
                        <button onClick={() => removeFromCart(index)} className="text-gray-400 hover:text-red-500">×</button>
                      </div>
                      {item.options.length > 0 && (
                        <div className="text-sm text-gray-500 mb-2">
                          {item.options.map((opt, i) => (
                            <span key={i}>{opt.choiceName}{opt.priceModifier !== 0 && ` (+${opt.priceModifier.toLocaleString()})`}{i < item.options.length - 1 && ', '}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(index, -1)} className="w-8 h-8 bg-gray-200 rounded-full">-</button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, 1)} className="w-8 h-8 bg-gray-200 rounded-full">+</button>
                        </div>
                        <div className="font-medium">{item.totalPrice.toLocaleString()}원</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">총 금액</span>
                <span className="text-2xl font-bold text-blue-600">{totalPrice.toLocaleString()}원</span>
              </div>
              <button
                onClick={() => { handleOrder(); setShowCart(false); }}
                disabled={cart.length === 0}
                className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg disabled:bg-gray-300"
              >
                주문하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 데스크탑: 오른쪽 장바구니 */}
      <div className="hidden lg:flex w-96 bg-white shadow-lg flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">주문 내역</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              메뉴를 선택해주세요
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{item.name}</div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>

                  {item.options.length > 0 && (
                    <div className="text-sm text-gray-500 mb-2">
                      {item.options.map((opt, i) => (
                        <span key={i}>
                          {opt.choiceName}
                          {opt.priceModifier !== 0 && ` (+${opt.priceModifier.toLocaleString()})`}
                          {i < item.options.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-medium">{item.totalPrice.toLocaleString()}원</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold">총 금액</span>
            <span className="text-2xl font-bold text-blue-600">{totalPrice.toLocaleString()}원</span>
          </div>
          <button
            onClick={handleOrder}
            disabled={cart.length === 0}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            주문하기
          </button>
        </div>
      </div>

      {/* 옵션 선택 모달 */}
      {showOptionModal && selectedMenuItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{selectedMenuItem.name}</h3>
            <div className="text-lg text-blue-600 mb-6">{selectedMenuItem.price.toLocaleString()}원</div>

            <div className="space-y-6">
              {selectedMenuItem.optionGroups?.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium">{group.name}</span>
                    {group.is_required ? (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">필수</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">선택</span>
                    )}
                    {group.max_select > 1 && (
                      <span className="text-xs text-gray-400">최대 {group.max_select}개</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.choices.map(choice => {
                      const isSelected = selectedOptions[group.id]?.includes(choice.id);
                      return (
                        <button
                          key={choice.id}
                          onClick={() => handleOptionSelect(group.id, choice.id, group.max_select)}
                          className={`w-full p-3 rounded-lg border text-left flex justify-between items-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span>{choice.name}</span>
                          <span className="text-gray-500">
                            {choice.price_modifier !== 0
                              ? `${choice.price_modifier > 0 ? '+' : ''}${choice.price_modifier.toLocaleString()}원`
                              : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowOptionModal(false);
                  setSelectedMenuItem(null);
                  setSelectedOptions({});
                }}
                className="flex-1 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleConfirmOptions}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                담기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 완료 모달 */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h3 className="text-2xl font-bold mb-4">주문이 완료되었습니다</h3>
            <div className="text-5xl font-bold text-blue-600 mb-6">
              주문번호 {orderNumber}
            </div>
            <button
              onClick={() => {
                setShowCompleteModal(false);
                setOrderNumber(null);
              }}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

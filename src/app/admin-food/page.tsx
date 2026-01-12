'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  description?: string;
  is_available: number;
  optionGroups?: OptionGroup[];
}

export default function AdminFoodPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 카테고리 모달
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', sort_order: 0 });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 메뉴 모달
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: '', price: 0, description: '', category_id: 0 });
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  // 옵션 모달
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [optionGroupForm, setOptionGroupForm] = useState({ name: '', is_required: false, max_select: 1 });

  // 선택지 모달
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [selectedOptionGroup, setSelectedOptionGroup] = useState<OptionGroup | null>(null);
  const [choiceForm, setChoiceForm] = useState({ name: '', price_modifier: 0, is_default: false });

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

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
  }, []);

  const fetchMenuItems = useCallback(async (categoryId?: number) => {
    const url = categoryId ? `/api/menu?category_id=${categoryId}&with_options=true` : '/api/menu?with_options=true';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setMenuItems(data);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      setIsLoading(true);
      await fetchCategories();
      await fetchMenuItems();
      setIsLoading(false);
    };
    init();
  }, [fetchCategories, fetchMenuItems, isAuthenticated]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin-login');
  };

  // 카테고리 CRUD
  const handleSaveCategory = async () => {
    const method = editingCategory ? 'PUT' : 'POST';
    const body = editingCategory
      ? { id: editingCategory.id, ...categoryForm }
      : categoryForm;

    const res = await fetch('/api/categories', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (res.ok) {
      await fetchCategories();
      setShowCategoryModal(false);
      setCategoryForm({ name: '', sort_order: 0 });
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      await fetchCategories();
      if (selectedCategory === id) {
        setSelectedCategory(null);
        await fetchMenuItems();
      }
    } else {
      const data = await res.json();
      alert(data.error || '카테고리 삭제에 실패했습니다.');
    }
  };

  // 메뉴 CRUD
  const handleSaveMenu = async () => {
    const method = editingMenu ? 'PUT' : 'POST';
    const body = editingMenu
      ? { id: editingMenu.id, ...menuForm }
      : menuForm;

    const res = await fetch('/api/menu', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
      setShowMenuModal(false);
      setMenuForm({ name: '', price: 0, description: '', category_id: 0 });
      setEditingMenu(null);
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm('이 메뉴를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/menu?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
      if (selectedMenuItem?.id === id) {
        setSelectedMenuItem(null);
      }
    } else {
      const data = await res.json();
      alert(data.error || '메뉴 삭제에 실패했습니다.');
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const res = await fetch('/api/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
      credentials: 'include',
    });
    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
    }
  };

  // 옵션 그룹 CRUD
  const handleSaveOptionGroup = async () => {
    if (!selectedMenuItem) return;

    const res = await fetch('/api/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group',
        menu_item_id: selectedMenuItem.id,
        ...optionGroupForm,
      }),
      credentials: 'include',
    });

    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
      const updated = menuItems.find(m => m.id === selectedMenuItem.id);
      if (updated) setSelectedMenuItem(updated);
      setShowOptionModal(false);
      setOptionGroupForm({ name: '', is_required: false, max_select: 1 });
    }
  };

  const handleDeleteOptionGroup = async (groupId: number) => {
    if (!confirm('이 옵션 그룹을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/options?type=group&id=${groupId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
    }
  };

  // 선택지 CRUD
  const handleSaveChoice = async () => {
    if (!selectedOptionGroup) return;

    const res = await fetch('/api/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'choice',
        option_group_id: selectedOptionGroup.id,
        ...choiceForm,
      }),
      credentials: 'include',
    });

    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
      setShowChoiceModal(false);
      setChoiceForm({ name: '', price_modifier: 0, is_default: false });
    }
  };

  const handleDeleteChoice = async (choiceId: number) => {
    if (!confirm('이 선택지를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/options?type=choice&id=${choiceId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      await fetchMenuItems(selectedCategory || undefined);
    }
  };

  // 카테고리로 필터링
  const filteredMenuItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  // 선택된 메뉴 아이템 업데이트
  useEffect(() => {
    if (selectedMenuItem) {
      const updated = menuItems.find(m => m.id === selectedMenuItem.id);
      if (updated) setSelectedMenuItem(updated);
    }
  }, [menuItems, selectedMenuItem]);

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
          <h1 className="text-2xl font-bold text-gray-800">메뉴 관리</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin-check')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              관리 페이지
            </button>
            <button
              onClick={() => router.push('/admin-maker')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              계정 관리
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 카테고리 섹션 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">카테고리</h2>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', sort_order: 0 });
                  setShowCategoryModal(true);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                추가
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  fetchMenuItems();
                }}
                className={`w-full text-left px-3 py-2 rounded ${!selectedCategory ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                전체
              </button>
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      fetchMenuItems(cat.id);
                    }}
                    className={`flex-1 text-left px-3 py-2 rounded ${selectedCategory === cat.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                  >
                    {cat.name}
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({ name: cat.name, sort_order: cat.sort_order });
                      setShowCategoryModal(true);
                    }}
                    className="p-1 text-gray-500 hover:text-blue-500"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-gray-500 hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 메뉴 섹션 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">메뉴</h2>
              <button
                onClick={() => {
                  if (categories.length === 0) {
                    alert('먼저 카테고리를 추가해주세요.');
                    return;
                  }
                  setEditingMenu(null);
                  setMenuForm({
                    name: '',
                    price: 0,
                    description: '',
                    category_id: selectedCategory || categories[0].id,
                  });
                  setShowMenuModal(true);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                추가
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredMenuItems.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded border cursor-pointer ${selectedMenuItem?.id === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${!item.is_available ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedMenuItem(item)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.price.toLocaleString()}원</div>
                      {item.optionGroups && item.optionGroups.length > 0 && (
                        <div className="text-xs text-blue-500 mt-1">
                          옵션 {item.optionGroups.length}개
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAvailable(item);
                        }}
                        className={`px-2 py-1 text-xs rounded ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {item.is_available ? '판매중' : '품절'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMenu(item);
                          setMenuForm({
                            name: item.name,
                            price: item.price,
                            description: item.description || '',
                            category_id: item.category_id,
                          });
                          setShowMenuModal(true);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      >
                        수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMenu(item.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMenuItems.length === 0 && (
                <div className="text-center text-gray-500 py-8">메뉴가 없습니다.</div>
              )}
            </div>
          </div>

          {/* 옵션 섹션 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                옵션 {selectedMenuItem && `- ${selectedMenuItem.name}`}
              </h2>
              {selectedMenuItem && (
                <button
                  onClick={() => {
                    setOptionGroupForm({ name: '', is_required: false, max_select: 1 });
                    setShowOptionModal(true);
                  }}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  옵션 추가
                </button>
              )}
            </div>

            {selectedMenuItem ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedMenuItem.optionGroups?.map(group => (
                  <div key={group.id} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-medium">{group.name}</span>
                        {group.is_required ? (
                          <span className="ml-2 text-xs text-red-500">필수</span>
                        ) : (
                          <span className="ml-2 text-xs text-gray-400">선택</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedOptionGroup(group);
                            setChoiceForm({ name: '', price_modifier: 0, is_default: false });
                            setShowChoiceModal(true);
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded"
                        >
                          선택지 추가
                        </button>
                        <button
                          onClick={() => handleDeleteOptionGroup(group.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {group.choices.map(choice => (
                        <div key={choice.id} className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded">
                          <span>
                            {choice.name}
                            {choice.price_modifier !== 0 && (
                              <span className="text-gray-500 ml-1">
                                ({choice.price_modifier > 0 ? '+' : ''}{choice.price_modifier.toLocaleString()}원)
                              </span>
                            )}
                            {choice.is_default === 1 && (
                              <span className="ml-1 text-xs text-blue-500">기본</span>
                            )}
                          </span>
                          <button
                            onClick={() => handleDeleteChoice(choice.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {group.choices.length === 0 && (
                        <div className="text-xs text-gray-400">선택지가 없습니다.</div>
                      )}
                    </div>
                  </div>
                ))}
                {(!selectedMenuItem.optionGroups || selectedMenuItem.optionGroups.length === 0) && (
                  <div className="text-center text-gray-500 py-8">옵션이 없습니다.</div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">메뉴를 선택해주세요.</div>
            )}
          </div>
        </div>
      </div>

      {/* 카테고리 모달 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? '카테고리 수정' : '카테고리 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="카테고리 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">정렬 순서</label>
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 모달 */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingMenu ? '메뉴 수정' : '메뉴 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                <select
                  value={menuForm.category_id}
                  onChange={(e) => setMenuForm({ ...menuForm, category_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이름</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="메뉴 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">가격</label>
                <input
                  type="number"
                  value={menuForm.price}
                  onChange={(e) => setMenuForm({ ...menuForm, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명 (선택)</label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  placeholder="메뉴 설명"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowMenuModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveMenu}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 옵션 그룹 모달 */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">옵션 그룹 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">옵션 이름</label>
                <input
                  type="text"
                  value={optionGroupForm.name}
                  onChange={(e) => setOptionGroupForm({ ...optionGroupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="예: 맵기 선택, 사이즈"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={optionGroupForm.is_required}
                    onChange={(e) => setOptionGroupForm({ ...optionGroupForm, is_required: e.target.checked })}
                  />
                  <span className="text-sm">필수 선택</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">최대 선택 개수</label>
                <input
                  type="number"
                  min={1}
                  value={optionGroupForm.max_select}
                  onChange={(e) => setOptionGroupForm({ ...optionGroupForm, max_select: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowOptionModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveOptionGroup}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 선택지 모달 */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              선택지 추가 - {selectedOptionGroup?.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">선택지 이름</label>
                <input
                  type="text"
                  value={choiceForm.name}
                  onChange={(e) => setChoiceForm({ ...choiceForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="예: 보통, 매운맛"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">추가 금액</label>
                <input
                  type="number"
                  value={choiceForm.price_modifier}
                  onChange={(e) => setChoiceForm({ ...choiceForm, price_modifier: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={choiceForm.is_default}
                  onChange={(e) => setChoiceForm({ ...choiceForm, is_default: e.target.checked })}
                />
                <span className="text-sm">기본 선택</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowChoiceModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveChoice}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

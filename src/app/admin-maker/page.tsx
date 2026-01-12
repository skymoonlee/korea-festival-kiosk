'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ClientUser {
  id: number;
  username: string;
  can_access_cooking: number;
  can_access_order: number;
  created_at: string;
}

export default function AdminMakerPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientUser | null>(null);
  const [addForm, setAddForm] = useState({
    username: '',
    password: '',
    can_access_cooking: true,
    can_access_order: true
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, fetchUsers]);

  // 로그아웃
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin-login');
  };

  // 계정 생성
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '계정 생성에 실패했습니다.');
        setLoading(false);
        return;
      }

      setShowAddModal(false);
      setAddForm({
        username: '',
        password: '',
        can_access_cooking: true,
        can_access_order: true
      });
      fetchUsers();
    } catch {
      setError('계정 생성 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  // 권한 변경
  const handlePermissionChange = async (user: ClientUser, field: 'can_access_cooking' | 'can_access_order', value: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          can_access_cooking: field === 'can_access_cooking' ? value : user.can_access_cooking === 1,
          can_access_order: field === 'can_access_order' ? value : user.can_access_order === 1
        })
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('권한 변경 실패:', error);
    }
  };

  // 계정 삭제
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">계정 관리</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin-check')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              관리 페이지
            </button>
            <button
              onClick={() => router.push('/admin-food')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              메뉴 관리
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

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* 테이블 헤더 */}
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">클라이언트 계정 목록</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 추가
            </button>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">계정명</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">cooking</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">order</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">생성일</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      등록된 클라이언트 계정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={user.can_access_cooking === 1}
                          onChange={(e) => handlePermissionChange(user, 'can_access_cooking', e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={user.can_access_order === 1}
                          onChange={(e) => handlePermissionChange(user, 'can_access_order', e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setDeleteTarget(user);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 계정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 계정 추가</h3>
            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="아이디 입력"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="비밀번호 입력"
                    required
                  />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.can_access_cooking}
                      onChange={(e) => setAddForm({ ...addForm, can_access_cooking: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">cooking 접근</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.can_access_order}
                      onChange={(e) => setAddForm({ ...addForm, can_access_order: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">order 접근</span>
                  </label>
                </div>
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setAddForm({
                      username: '',
                      password: '',
                      can_access_cooking: true,
                      can_access_order: true
                    });
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">계정 삭제</h3>
            <p className="text-gray-600 mb-6">
              <span className="font-semibold">{deleteTarget.username}</span> 계정을 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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

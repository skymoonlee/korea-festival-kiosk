import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-8">학교 축제 키오스크</h1>
        <p className="text-xl mb-12 text-white/80">원하시는 페이지를 선택해주세요</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto px-4">
          <Link
            href="/order"
            className="bg-white/20 backdrop-blur rounded-2xl p-8 hover:bg-white/30 transition-colors"
          >
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">주문 접수</h2>
            <p className="text-white/70">직원용 주문 페이지</p>
          </Link>

          <Link
            href="/stream-customer"
            className="bg-white/20 backdrop-blur rounded-2xl p-8 hover:bg-white/30 transition-colors"
          >
            <div className="text-4xl mb-4">🖥️</div>
            <h2 className="text-2xl font-bold mb-2">고객 화면</h2>
            <p className="text-white/70">고객용 주문 확인</p>
          </Link>

          <Link
            href="/cooking"
            className="bg-white/20 backdrop-blur rounded-2xl p-8 hover:bg-white/30 transition-colors"
          >
            <div className="text-4xl mb-4">👨‍🍳</div>
            <h2 className="text-2xl font-bold mb-2">주방 화면</h2>
            <p className="text-white/70">요리팀용 주문 확인</p>
          </Link>

          <Link
            href="/admin-login"
            className="bg-white/20 backdrop-blur rounded-2xl p-8 hover:bg-white/30 transition-colors"
          >
            <div className="text-4xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">관리자</h2>
            <p className="text-white/70">메뉴 및 매출 관리</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

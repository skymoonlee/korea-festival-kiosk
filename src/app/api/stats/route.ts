import { NextResponse } from 'next/server';
import { getTodayStats, getMenuStats } from '@/lib/db';

export async function GET() {
  try {
    const todayStats = getTodayStats();
    const menuStats = getMenuStats();

    return NextResponse.json({
      today: todayStats,
      menuRanking: menuStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: '통계 조회 실패' }, { status: 500 });
  }
}

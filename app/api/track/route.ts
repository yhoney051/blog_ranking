// POST /api/track — 클라이언트 페이지뷰 카운터
// PageViewTracker 컴포넌트가 페이지 로드 시 fire-and-forget으로 호출
// daily_stats 테이블에 KST 기준 오늘 날짜 행을 atomic INCR

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// KST 기준 오늘 yyyy-mm-dd
function getTodayKstDate(): string {
  const kstNow = new Date(Date.now() + 9 * 3600_000)
  return kstNow.toISOString().split('T')[0]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { isUnique?: boolean }
    const isUnique = !!body.isUnique
    const today = getTodayKstDate()

    const { error } = await supabaseServer.rpc('increment_daily_stats', {
      p_date: today,
      p_is_unique: isUnique,
    })

    if (error) {
      console.error('[TRACK] RPC 실패:', error.message)
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TRACK] 예외:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

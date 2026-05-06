// GET /api/notifications/history — 사용자 본인의 최근 알림 발송 이력 조회
// 알림 설정 화면에서 "최근 N건" 섹션에 표시 / 트러블슈팅 단서 제공

import { NextResponse } from 'next/server'
import { getAuthUserId, supabaseServer } from '@/lib/supabase/server'

const MAX_LIMIT = 30
const DEFAULT_LIMIT = 10

export async function GET(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  const { data, error } = await supabaseServer
    .from('notification_history')
    .select('id, sent_at, channel, status, keyword_count, message_preview')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) {
    // 마이그레이션이 안 됐거나 일시 오류 — 빈 배열 반환해 화면이 깨지지 않도록
    console.error('[GET /api/notifications/history]', error.message)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: data ?? [] })
}

// POST /api/keywords/bulk-activate — 보관 키워드 N개 일괄 활성화
// body: { ids: string[] }
// 활성 한도 안에서만 활성화 (초과분은 skipped로 반환)
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body?.ids)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const ids: string[] = body.ids.filter((id: unknown) => typeof id === 'string')
  if (ids.length === 0) {
    return NextResponse.json({ activated: [], skipped: [] })
  }

  const supabase = await createSupabaseServerClient()

  // 현재 활성 카운트 + 한도 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('keyword_limit')
    .eq('id', userId)
    .single()
  const { count: activeCount } = await supabase
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  const limit = profile?.keyword_limit ?? 0
  const slotsAvailable = Math.max(0, limit - (activeCount ?? 0))

  if (slotsAvailable === 0) {
    return NextResponse.json(
      {
        error: `활성 키워드 한도(${limit}개)에 도달했습니다.`,
        code: 'ACTIVE_LIMIT_REACHED',
        activated: [],
        skipped: ids,
      },
      { status: 403 }
    )
  }

  // 본인의 보관 키워드만 + 한도 안 슬롯 만큼만 활성화
  const idsToActivate = ids.slice(0, slotsAvailable)
  const { error } = await supabase
    .from('keywords')
    .update({ is_active: true, deactivated_at: null })
    .eq('user_id', userId)
    .eq('is_active', false)
    .in('id', idsToActivate)

  if (error) {
    console.error('[POST /api/keywords/bulk-activate]', error.message)
    return NextResponse.json({ error: '활성화에 실패했습니다.' }, { status: 500 })
  }

  const skipped = ids.filter((id) => !idsToActivate.includes(id))
  return NextResponse.json({ activated: idsToActivate, skipped })
}

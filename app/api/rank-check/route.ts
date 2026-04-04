import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'
import { getNaverBlogRank } from '@/lib/serpapi'
import { rankCheckSchema } from '@/lib/validations'

// POST /api/rank-check — 특정 키워드의 순위 조회 후 저장
// body: { id: string }
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const parsed = rankCheckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { id } = parsed.data

  // 1. 키워드 정보 조회 (본인 키워드만)
  const { data: kw, error: kwErr } = await supabase
    .from('keywords')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (kwErr || !kw) return NextResponse.json({ error: '키워드 없음' }, { status: 404 })

  // 2. Bright Data SERP API로 현재 순위 조회
  const rank = await getNaverBlogRank(kw.keyword, kw.blog_url)

  // 3. keywords 테이블 업데이트 (previous_rank ← current_rank)
  const { error: updateErr } = await supabase
    .from('keywords')
    .update({
      previous_rank: kw.current_rank,
      current_rank: rank,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) {
    console.error('[POST /api/rank-check]', updateErr.message)
    return NextResponse.json({ error: '순위 업데이트에 실패했습니다.' }, { status: 500 })
  }

  // 4. rank_histories에 기록 저장 (순위가 null이면 저장 안 함)
  if (rank !== null) {
    const { error: histErr } = await supabase.from('rank_histories').insert({ keyword_id: id, rank })
    if (histErr) console.error('[POST /api/rank-check] 히스토리 저장 실패:', histErr.message)
  }

  return NextResponse.json({ rank })
}

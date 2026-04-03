import { NextResponse } from 'next/server'
import { supabaseServer, getAuthUserId } from '@/lib/supabase/server'
import { getNaverBlogRank } from '@/lib/serpapi'

// POST /api/rank-check — 특정 키워드의 순위 조회 후 저장
// body: { id: string }
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await req.json()

  // 1. 키워드 정보 조회 (본인 키워드만)
  const { data: kw, error: kwErr } = await supabaseServer
    .from('keywords')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (kwErr || !kw) return NextResponse.json({ error: '키워드 없음' }, { status: 404 })

  // 2. SerpAPI로 현재 순위 조회
  const rank = await getNaverBlogRank(kw.keyword, kw.blog_url)

  // 3. keywords 테이블 업데이트 (previous_rank ← current_rank)
  const { error: updateErr } = await supabaseServer
    .from('keywords')
    .update({
      previous_rank: kw.current_rank,
      current_rank: rank,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 4. rank_histories에 기록 저장 (순위가 null이면 저장 안 함)
  if (rank !== null) {
    await supabaseServer.from('rank_histories').insert({ keyword_id: id, rank })
  }

  return NextResponse.json({ rank })
}

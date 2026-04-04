import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { getNaverBlogRank } from '@/lib/serpapi'

// GET /api/cron/check-ranks — 모든 키워드의 순위를 자동 체크 (Vercel Cron)
export async function GET(request: Request) {
  // CRON_SECRET 검증 (Vercel Cron이 자동으로 Authorization 헤더에 Bearer 토큰 전송)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET 환경변수가 설정되지 않았습니다.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 모든 키워드 조회
  const { data: keywords, error: kwError } = await supabaseServer
    .from('keywords')
    .select('*')

  if (kwError || !keywords) {
    return NextResponse.json({ error: kwError?.message ?? '키워드 조회 실패' }, { status: 500 })
  }

  let success = 0
  let failed = 0

  for (const kw of keywords) {
    try {
      const rank = await getNaverBlogRank(kw.keyword, kw.blog_url)

      // keywords 테이블 업데이트
      await supabaseServer
        .from('keywords')
        .update({
          previous_rank: kw.current_rank,
          current_rank: rank,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', kw.id)

      // rank_histories에 기록 저장
      if (rank !== null) {
        const { error: histErr } = await supabaseServer
          .from('rank_histories')
          .insert({ keyword_id: kw.id, rank })
        if (histErr) console.error(`[CRON] 히스토리 저장 실패 (${kw.id}):`, histErr.message)
      }

      success++
    } catch {
      failed++
    }

    // IP 차단 방지 딜레이 (2초)
    await new Promise((r) => setTimeout(r, 2000))
  }

  return NextResponse.json({
    total: keywords.length,
    success,
    failed,
    checked_at: new Date().toISOString(),
  })
}

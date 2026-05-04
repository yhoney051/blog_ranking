import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { getNaverBlogRank } from '@/lib/serpapi'
import { getSearchVolume, isNaverSearchAdConfigured } from '@/lib/naver-searchad'
import { CRON } from '@/lib/constants'

// Vercel 함수 타임아웃 설정 (Pro: 최대 300초)
export const maxDuration = 300

// GET /api/cron/check-ranks — 모든 키워드의 순위를 자동 체크 (Vercel Cron)
export async function GET(request: Request) {
  try {
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

    // 키워드 조회 (게스트 제외 + 활성 키워드만, 오래된 순)
    // user_id가 null인 게스트 키워드 + is_active=false인 보관 키워드는 자동 체크 대상에서 제외
    const { data: keywords, error: kwError } = await supabaseServer
      .from('keywords')
      .select('*')
      .not('user_id', 'is', null)
      .eq('is_active', true)
      .order('last_checked_at', { ascending: true, nullsFirst: true })

    if (kwError || !keywords) {
      console.error('[GET /api/cron/check-ranks] 키워드 조회 실패:', kwError?.message)
      return NextResponse.json({ error: '키워드 조회 실패' }, { status: 500 })
    }

    // 사용자별 plan 조회 (무료 사용자 자동 체크 빈도 분기용)
    const userIds = Array.from(
      new Set(keywords.map((kw) => kw.user_id).filter((id): id is string => !!id))
    )
    const { data: profiles } = await supabaseServer
      .from('profiles')
      .select('id, plan')
      .in('id', userIds)
    const planMap = new Map<string, string>(profiles?.map((p) => [p.id, p.plan]) ?? [])

    // 무료 사용자는 자동 체크 OFF (수동 새로고침만 가능)
    // 유료 사용자(standard/pro/premium)만 매일 자동 체크
    const eligibleKeywords = keywords.filter((kw) => {
      const plan = planMap.get(kw.user_id as string)
      return plan !== 'free'
    })

    let success = 0
    let failed = 0

    // 청크 단위로 처리 (타임아웃 방지)
    const chunk = eligibleKeywords.slice(0, CRON.RANK_CHECK_CHUNK_SIZE)
    const skipped = eligibleKeywords.length - chunk.length
    const filteredOut = keywords.length - eligibleKeywords.length

    for (const kw of chunk) {
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
      } catch (err) {
        console.error(`[CRON] 키워드 처리 실패 (${kw.id}):`, err)
        failed++
      }

      // IP 차단 방지 딜레이 (2초)
      await new Promise((r) => setTimeout(r, CRON.RANK_CHECK_DELAY_MS))
    }

    if (skipped > 0) {
      console.warn(`[CRON] 타임아웃 방지로 ${skipped}개 키워드 건너뜀 (다음 실행에서 처리)`)
    }

    // 검색량 갱신: 7일 이상 지난 키워드만 업데이트
    let volumeUpdated = 0
    if (isNaverSearchAdConfigured()) {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const staleKeywords = keywords.filter(
          (kw) => !kw.search_volume_updated_at || kw.search_volume_updated_at < sevenDaysAgo
        )

        if (staleKeywords.length > 0) {
          // 최대 50개씩 처리 (API 부하 방지)
          const volumeBatch = staleKeywords.slice(0, 50)
          const keywordTexts = volumeBatch.map((kw) => kw.keyword)
          const volumes = await getSearchVolume(keywordTexts)
          const volumeMap = new Map(volumes.map((v) => [v.keyword.toLowerCase().trim(), v.totalSearchVolume]))
          const now = new Date().toISOString()

          for (const kw of volumeBatch) {
            const volume = volumeMap.get(kw.keyword.toLowerCase().trim())
            if (volume !== undefined) {
              await supabaseServer
                .from('keywords')
                .update({ monthly_search_volume: volume, search_volume_updated_at: now })
                .eq('id', kw.id)
              volumeUpdated++
            }
          }
        }
      } catch (err) {
        console.error('[CRON] 검색량 갱신 실패:', err)
      }
    }

    return NextResponse.json({
      total: keywords.length,
      eligible: eligibleKeywords.length,
      filteredOut,
      processed: chunk.length,
      skipped,
      success,
      failed,
      volumeUpdated,
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[CRON] check-ranks 예상치 못한 에러:', err)
    return NextResponse.json({ error: '순위 체크 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

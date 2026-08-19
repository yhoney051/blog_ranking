// POST /api/keyword-pro
// 전문 키워드 검색 도구 — 검색광고 추가 지표 + 데이터랩 트렌드를 한 번에.
// 비회원도 호출 가능 (광고 funnel 입구). 둘 중 한쪽 실패해도 다른 쪽은 표시.

import { NextResponse } from 'next/server'
import {
  fetchKeywordResearch,
  isNaverSearchAdConfigured,
  type KeywordResearchResult,
} from '@/lib/naver-searchad'
import {
  fetchSearchTrend,
  isNaverDatalabConfigured,
  type TrendResult,
  type TrendPeriod,
} from '@/lib/naver-datalab'
import { getAuthUserId } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { keywordProSchema } from '@/lib/validations'
import {
  getCached,
  setCached,
  makeCacheKey,
} from '@/lib/keyword-research-cache'
import {
  getCachedTrend,
  setCachedTrend,
  makeTrendCacheKey,
} from '@/lib/keyword-pro-cache'
import { RATE_LIMITS, KEYWORD_PRO } from '@/lib/constants'

export async function POST(req: Request) {
  if (!isNaverSearchAdConfigured()) {
    return NextResponse.json(
      { error: '전문 키워드 검색 도구가 일시적으로 사용 불가합니다.' },
      { status: 503 }
    )
  }

  // 한도 키 분리 — 회원이 더 관대
  const userId = await getAuthUserId()
  const limit = userId
    ? RATE_LIMITS.KEYWORD_PRO_USER_PER_HOUR
    : RATE_LIMITS.KEYWORD_PRO_GUEST_PER_HOUR
  const limitKey = userId
    ? `keyword-pro:user:${userId}`
    : `keyword-pro:ip:${getClientIp(req)}`

  const rl = rateLimit(limitKey, limit, RATE_LIMITS.ONE_HOUR_MS)
  if (!rl.success) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${rl.retryAfterSeconds}초 후 다시 시도해주세요.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    )
  }

  // 본문 파싱 + 검증
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const parsed = keywordProSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '잘못된 입력입니다.' },
      { status: 400 }
    )
  }

  const { keywords, period } = parsed.data
  const trendEnabled = isNaverDatalabConfigured()

  // 트렌드(데이터랩)는 API 스펙상 최대 5개까지만 비교 가능 → 입력 순서 기준 앞 5개만 사용.
  // 검색량 표는 입력 전체를 그대로 보여준다.
  const trendKeywords = keywords.slice(0, KEYWORD_PRO.TREND_MAX_KEYWORDS)
  const trendLimited = keywords.length > KEYWORD_PRO.TREND_MAX_KEYWORDS

  // 캐시 조회 (메트릭 + 트렌드 따로)
  const metricsCacheKey = makeCacheKey(keywords)
  const trendCacheKey = makeTrendCacheKey(trendKeywords, period)
  const cachedMetrics = getCached(metricsCacheKey)
  const cachedTrend = trendEnabled ? getCachedTrend(trendCacheKey) : null

  // 둘 다 캐시 히트면 외부 호출 0
  if (cachedMetrics && (!trendEnabled || cachedTrend)) {
    return NextResponse.json({
      metrics: cachedMetrics,
      trend: cachedTrend,
      trendDisabled: !trendEnabled,
      trendLimited,
      trendKeywords,
      cached: true,
      remaining: rl.remaining,
    })
  }

  // 미히트 항목만 외부 호출 (양쪽 병렬). trendEnabled false면 null 즉시 resolve
  const metricsP: Promise<KeywordResearchResult> = cachedMetrics
    ? Promise.resolve(cachedMetrics)
    : fetchKeywordResearch(keywords, KEYWORD_PRO.RELATED_DISPLAY_LIMIT)
  const trendP: Promise<TrendResult | null> = trendEnabled
    ? cachedTrend
      ? Promise.resolve(cachedTrend)
      : fetchSearchTrend(trendKeywords, period as TrendPeriod)
    : Promise.resolve(null)

  const [metricsRes, trendRes] = await Promise.allSettled([metricsP, trendP])

  // 메트릭은 필수 — 실패 시 전체 실패
  if (metricsRes.status === 'rejected') {
    console.error('[POST /api/keyword-pro] 메트릭 호출 실패:', metricsRes.reason)
    return NextResponse.json(
      { error: '키워드 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }

  const metrics = metricsRes.value
  if (!cachedMetrics) setCached(metricsCacheKey, metrics)

  // 트렌드는 옵션 — 실패하면 메트릭만 반환
  let trend: TrendResult | null = null
  let trendError: string | null = null
  if (trendRes.status === 'fulfilled') {
    trend = trendRes.value
    if (trend && !cachedTrend && trendEnabled) setCachedTrend(trendCacheKey, trend)
  } else {
    console.error('[POST /api/keyword-pro] 트렌드 호출 실패:', trendRes.reason)
    trendError = '트렌드 데이터를 불러오지 못했습니다.'
  }

  return NextResponse.json({
    metrics,
    trend,
    trendDisabled: !trendEnabled,
    trendLimited,
    trendKeywords,
    trendError,
    cached: false,
    remaining: rl.remaining,
  })
}

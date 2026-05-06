import { NextResponse } from 'next/server'
import {
  fetchKeywordResearch,
  isNaverSearchAdConfigured,
} from '@/lib/naver-searchad'
import { getAuthUserId } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { keywordResearchSchema } from '@/lib/validations'
import {
  getCached,
  setCached,
  makeCacheKey,
} from '@/lib/keyword-research-cache'
import { RATE_LIMITS, KEYWORD_RESEARCH } from '@/lib/constants'

// POST /api/keyword-research
// 비회원도 호출 가능. 입력 키워드의 검색량 + 연관 키워드를 한 번에 조회.
// funnel 입구 역할이라 비회원에게도 결과를 보여주고 가입 유도.
export async function POST(req: Request) {
  if (!isNaverSearchAdConfigured()) {
    return NextResponse.json(
      { error: '키워드 검색 도구가 일시적으로 사용 불가합니다.' },
      { status: 503 }
    )
  }

  // 사용자 식별 → 한도 키 분리 (로그인 사용자가 더 관대)
  const userId = await getAuthUserId()
  const limit = userId
    ? RATE_LIMITS.KEYWORD_RESEARCH_USER_PER_HOUR
    : RATE_LIMITS.KEYWORD_RESEARCH_GUEST_PER_HOUR
  const limitKey = userId
    ? `keyword-research:user:${userId}`
    : `keyword-research:ip:${getClientIp(req)}`

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

  // 본문 파싱 + Zod 검증
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const parsed = keywordResearchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '잘못된 입력입니다.' },
      { status: 400 }
    )
  }

  const { keywords } = parsed.data

  // 캐시 조회 → 히트 시 즉시 반환 (네이버 API 미호출)
  const cacheKey = makeCacheKey(keywords)
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json({
      ...cached,
      cached: true,
      remaining: rl.remaining,
    })
  }

  // 네이버 검색광고 API 호출
  try {
    const result = await fetchKeywordResearch(keywords, KEYWORD_RESEARCH.RELATED_DISPLAY_LIMIT)
    setCached(cacheKey, result)
    return NextResponse.json({
      ...result,
      cached: false,
      remaining: rl.remaining,
    })
  } catch (err) {
    console.error('[POST /api/keyword-research]', err)
    return NextResponse.json(
      { error: '키워드 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 비회원 순위 조회 API — 쿠키 기반 3회 제한
// 인증 불필요 (middleware에서 제외)

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getNaverBlogRank } from '@/lib/serpapi'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { RATE_LIMITS } from '@/lib/constants'

const GUEST_LIMIT = RATE_LIMITS.GUEST_RANK_CHECK_PER_DAY
const COOKIE_NAME = 'guest_rank_checks'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24시간

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { keyword, blog_url } = body

    if (!keyword || !blog_url) {
      return NextResponse.json({ error: '키워드와 블로그 URL을 입력해주세요.' }, { status: 400 })
    }

    // IP 기반 rate limit: 시간당 5회 (쿠키 우회 방어)
    const ip = getClientIp(req)
    const limiter = rateLimit(`guest-rank:${ip}`, RATE_LIMITS.GUEST_RANK_CHECK_PER_HOUR, RATE_LIMITS.ONE_HOUR_MS)
    if (!limiter.success) {
      return NextResponse.json(
        { error: `요청 한도를 초과했습니다. ${limiter.retryAfterSeconds}초 후 다시 시도해주세요.`, code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }

    // 쿠키에서 조회 횟수 확인
    const cookieStore = await cookies()
    const checkCountStr = cookieStore.get(COOKIE_NAME)?.value
    const checkCount = checkCountStr ? parseInt(checkCountStr, 10) : 0

    if (checkCount >= GUEST_LIMIT) {
      return NextResponse.json(
        { error: '무료 조회 횟수(3회)를 모두 사용했습니다. 가입하면 계속 사용할 수 있어요!', code: 'GUEST_LIMIT_REACHED' },
        { status: 403 }
      )
    }

    // 순위 조회
    const rank = await getNaverBlogRank(keyword, blog_url)

    // 조회 횟수 증가 (쿠키 업데이트)
    const response = NextResponse.json({ rank, keyword, blog_url })
    response.cookies.set(COOKIE_NAME, String(checkCount + 1), {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[POST /api/guest-rank-check]', err)
    return NextResponse.json({ error: '순위 조회에 실패했습니다.' }, { status: 500 })
  }
}

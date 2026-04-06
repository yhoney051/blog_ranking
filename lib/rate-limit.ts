// 인메모리 Rate Limiter — 외부 의존성 없이 API 호출 제한
// Vercel 서버리스 환경에서는 인스턴스별 메모리가 분리되므로
// 완벽하지는 않지만 MVP 수준에서 기본적인 남용 방지 역할을 함

type RateLimitEntry = {
  count: number
  resetAt: number // Unix timestamp (ms)
}

// 전역 Map으로 요청 횟수 추적
const rateLimitMap = new Map<string, RateLimitEntry>()

// 오래된 항목 자동 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000 // 1분마다
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  })
}

type RateLimitResult =
  | { success: true; remaining: number }
  | { success: false; remaining: 0; retryAfterSeconds: number }

/**
 * Rate limit 체크
 * @param key - 고유 식별자 (예: `format:${ip}`, `rank-check:${userId}`)
 * @param limit - 허용 횟수
 * @param windowMs - 시간 윈도우 (밀리초)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = rateLimitMap.get(key)

  // 윈도우가 만료되었거나 처음 요청인 경우
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  // 제한 초과
  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return { success: false, remaining: 0, retryAfterSeconds }
  }

  // 횟수 증가
  entry.count++
  return { success: true, remaining: limit - entry.count }
}

/**
 * 요청에서 클라이언트 IP 추출
 * Vercel 환경에서는 x-forwarded-for 헤더 사용
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

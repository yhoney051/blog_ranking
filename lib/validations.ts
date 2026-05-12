// API 요청 입력값 검증 스키마
import { z } from 'zod'

// SSRF 방지 — 내부 네트워크 주소 차단
const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]

// 내부 IP 대역 (10.x, 172.16-31.x, 192.168.x, 169.254.x)
function isPrivateIp(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4) return false
  const [a, b] = parts.map(Number)
  if (a === 10) return true                              // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true       // 172.16.0.0/12
  if (a === 192 && b === 168) return true                // 192.168.0.0/16
  if (a === 169 && b === 254) return true                // 링크-로컬
  if (a === 0) return true                               // 0.0.0.0/8
  return false
}

function isSafeUrl(url: string): boolean {
  // 위험한 프로토콜 차단 (javascript:, data:, vbscript: 등)
  const dangerous = /^(javascript|data|vbscript|blob):/i
  if (dangerous.test(url)) return false

  // http/https 프로토콜이 있으면 호스트 검증
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname.toLowerCase()
      if (BLOCKED_HOSTNAMES.includes(hostname)) return false
      if (isPrivateIp(hostname)) return false
    } catch {
      return false
    }
    return true
  }

  // 기타 미지원 프로토콜 차단
  if (url.includes('://')) return false

  // 도메인만 있는 경우 (blog.naver.com/xxx)에도 내부 주소 차단
  const hostPart = url.split('/')[0].split(':')[0].toLowerCase()
  if (BLOCKED_HOSTNAMES.includes(hostPart)) return false
  if (isPrivateIp(hostPart)) return false

  return true
}

// 블로그 URL 정규화 — 중복 비교를 위해 프로토콜/trailing slash/대소문자/쿼리 제거
// 예: "https://BLOG.naver.com/abc/?ref=1" → "blog.naver.com/abc"
export function normalizeBlogUrl(url: string): string {
  let s = url.trim()
  s = s.replace(/^https?:\/\//i, '')
  s = s.split('?')[0].split('#')[0]
  s = s.replace(/\/+$/, '')
  // 호스트 부분만 lowercase (경로는 대소문자 구분될 수 있음)
  const slashIdx = s.indexOf('/')
  if (slashIdx === -1) return s.toLowerCase()
  return s.slice(0, slashIdx).toLowerCase() + s.slice(slashIdx)
}

// 네이버 블로그 형식 검증 — 'blog.naver.com/id' 또는 ID만 허용
// '22' 같은 의미 없는 입력으로 잘못된 매칭이 일어나는 것 방지
// ID 단독 입력은 최소 4자 (네이버 블로그 ID 정책 안전마진)
function isNaverBlogUrl(url: string): boolean {
  const cleaned = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www\.|m\.)/, '')
  if (/^blog\.naver\.com\/[a-z0-9_-]{2,}/i.test(cleaned)) return true
  if (/^[a-z0-9_-]{4,}$/i.test(cleaned)) return true
  return false
}

// 키워드 등록 요청 검증
export const keywordCreateSchema = z.object({
  keyword: z.string().min(1, '키워드를 입력해주세요.').max(100, '키워드는 100자 이내로 입력해주세요.'),
  blog_url: z
    .string()
    .min(1, 'URL을 입력해주세요.')
    .max(500, 'URL은 500자 이내로 입력해주세요.')
    .refine(isSafeUrl, { message: '유효하지 않은 URL 형식입니다.' })
    .refine(isNaverBlogUrl, { message: '네이버 블로그 주소만 입력할 수 있어요. (예: blog.naver.com/내아이디)' }),
  tag: z.string().max(50, '태그는 50자 이내로 입력해주세요.').optional(),
})

// 순위 조회 요청 검증
export const rankCheckSchema = z.object({
  id: z.string().uuid('유효하지 않은 키워드 ID입니다.'),
})

// 구독 시작 요청 검증 (포트원: 프론트에서 빌링키 직접 발급)
export const subscribeSchema = z.object({
  billingKey: z.string().min(1, '빌링키가 필요합니다.'),
  customerKey: z.string().min(1, '고객 키가 필요합니다.'),
  plan: z.enum(['standard', 'pro', 'premium']).default('standard'),
})

// 구독 취소 요청 검증
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(200, '사유는 200자 이내로 입력해주세요.').optional(),
})

// 키워드 발굴(검색 도구) 요청 검증 — 비회원도 호출 가능
export const keywordResearchSchema = z.object({
  keywords: z
    .array(
      z
        .string()
        .min(1, '키워드를 입력해주세요.')
        .max(40, '키워드는 40자 이내로 입력해주세요.')
    )
    .min(1, '최소 1개 이상의 키워드가 필요합니다.')
    .max(5, '한 번에 최대 5개까지 검색할 수 있습니다.'),
})

// 대행 문의 접수 검증 — 비로그인 사용자도 호출
export const contactCreateSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(40, '이름은 40자 이내로 입력해주세요.'),
  contact: z
    .string()
    .trim()
    .min(1, '연락처를 입력해주세요.')
    .max(80, '연락처는 80자 이내로 입력해주세요.'),
  message: z
    .string()
    .trim()
    .min(5, '문의 내용을 5자 이상 적어주세요.')
    .max(1000, '문의 내용은 1000자 이내로 입력해주세요.'),
})

// 전문 키워드 검색 도구 요청 검증 — 비회원도 호출 가능
// 트렌드 차트 가독성을 위해 입력 한도 3개로 좁힘.
export const keywordProSchema = z.object({
  keywords: z
    .array(
      z
        .string()
        .min(1, '키워드를 입력해주세요.')
        .max(40, '키워드는 40자 이내로 입력해주세요.')
    )
    .min(1, '최소 1개 이상의 키워드가 필요합니다.')
    .max(3, '한 번에 최대 3개까지 분석할 수 있습니다.'),
  period: z.enum(['1m', '3m', '6m', '12m']).default('12m'),
})

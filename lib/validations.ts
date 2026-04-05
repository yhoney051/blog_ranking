// API 요청 입력값 검증 스키마
import { z } from 'zod'

// 키워드 등록 요청 검증
export const keywordCreateSchema = z.object({
  keyword: z.string().min(1, '키워드를 입력해주세요.').max(100, '키워드는 100자 이내로 입력해주세요.'),
  blog_url: z
    .string()
    .min(1, 'URL을 입력해주세요.')
    .max(500, 'URL은 500자 이내로 입력해주세요.')
    .refine(
      (url) => {
        // http/https 프로토콜이 있으면 검증, 없으면 도메인만 있는 것으로 허용
        if (url.startsWith('http://') || url.startsWith('https://')) return true
        if (url.includes('://')) return false // javascript: 등 차단
        return true // blog.naver.com/xxx 형태 허용
      },
      { message: '유효하지 않은 URL 형식입니다.' }
    ),
  tag: z.string().max(50, '태그는 50자 이내로 입력해주세요.').optional(),
})

// 순위 조회 요청 검증
export const rankCheckSchema = z.object({
  id: z.string().uuid('유효하지 않은 키워드 ID입니다.'),
})

// 구독 시작 요청 검증
export const subscribeSchema = z.object({
  authKey: z.string().min(1, '인증 키가 필요합니다.'),
  customerKey: z.string().min(1, '고객 키가 필요합니다.'),
})

// 구독 취소 요청 검증
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(200, '사유는 200자 이내로 입력해주세요.').optional(),
})

// 블로그 원고 포맷 분석 요청 검증
export const formatRequestSchema = z.object({
  text: z.string().min(10, '최소 10자 이상의 원고를 입력해주세요.').max(10000, '원고는 10,000자 이내로 입력해주세요.'),
})

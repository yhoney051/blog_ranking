// 결제 플랜 상수 및 타입 정의
// 4티어 종량제: Free / Standard / Pro / Premium

export const PLANS = {
  free: {
    name: 'free' as const,
    label: '무료',
    price: 0,
    keywordLimit: 3,
    autoCheckCadence: 'weekly_2x' as const,
    description: '키워드 3개, 주 2회 자동 순위 체크',
  },
  standard: {
    name: 'standard' as const,
    label: 'Standard',
    price: 9900,
    keywordLimit: 30,
    autoCheckCadence: 'daily' as const,
    description: '키워드 30개, 매일 자동 순위 체크',
  },
  pro: {
    name: 'pro' as const,
    label: 'Pro',
    price: 24900,
    keywordLimit: 100,
    autoCheckCadence: 'daily' as const,
    description: '키워드 100개, 매일 자동 순위 체크 + 우선 고객 지원',
  },
  premium: {
    name: 'premium' as const,
    label: 'Premium',
    price: 59900,
    keywordLimit: 300,
    autoCheckCadence: 'daily' as const,
    description: '키워드 300개, 매일 자동 순위 체크 + 우선 고객 지원',
  },
} as const

export type PlanType = keyof typeof PLANS
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'expired'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

// 무료 사용자 자동 체크 주기 (밀리초)
// weekly_2x = 약 3.5일에 한 번 (주 2회)
export const FREE_CHECK_INTERVAL_MS = 3.5 * 24 * 60 * 60 * 1000

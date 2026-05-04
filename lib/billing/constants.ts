// 결제 플랜 상수 및 타입 정의
// 4티어 종량제: Free / Standard / Pro / Premium

export const PLANS = {
  free: {
    name: 'free' as const,
    label: '무료',
    price: 0,
    keywordLimit: 3,
    autoCheckCadence: 'none' as const,
    description: '키워드 3개, 수동 순위 체크만',
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

// 결제 페이지 카드 표시 순서 (왼쪽→오른쪽, 저렴한 순)
export const PLAN_DISPLAY_ORDER: PlanType[] = ['free', 'standard', 'pro', 'premium']

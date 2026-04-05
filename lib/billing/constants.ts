// 결제 플랜 상수 및 타입 정의

export const PLANS = {
  free: {
    name: 'free' as const,
    label: '무료',
    price: 0,
    keywordLimit: 10,
    description: '키워드 10개까지 무료',
  },
  pro: {
    name: 'pro' as const,
    label: 'Pro',
    price: 9900,
    keywordLimit: 100,
    description: '키워드 100개, 월 9,900원',
  },
} as const

export type PlanType = keyof typeof PLANS
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'expired'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

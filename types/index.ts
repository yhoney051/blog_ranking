// 키워드 + 블로그 URL 등록 항목
export type Keyword = {
  id: string
  user_id: string              // 소유자 (auth.users.id)
  keyword: string
  blog_url: string
  tag: string | null            // 분류 태그 (예: 맛집, 여행)
  current_rank: number | null   // 현재 순위 (null = 아직 조회 안 함)
  previous_rank: number | null  // 직전 순위 (변동 계산용)
  monthly_search_volume: number | null  // 네이버 월간 검색량 (PC+모바일 합산)
  search_volume_updated_at: string | null  // 검색량 마지막 조회 시각
  last_checked_at: string | null
  created_at: string
  rank_histories?: { rank: number; checked_at: string }[]  // 최근 7일 순위 히스토리
}

// 사용자 프로필 (플랜 정보 포함)
export type Profile = {
  id: string
  email: string
  plan: string
  keyword_limit: number
  created_at: string
}

// 날짜별 순위 기록
export type RankHistory = {
  id: string
  keyword_id: string
  rank: number
  checked_at: string
}

// 키워드 등록 폼 입력값
export type KeywordFormInput = {
  keyword: string
  blog_url: string
  tag?: string
}

// 순위 변동 방향
export type RankDelta = 'up' | 'down' | 'same' | 'new'

// 구독 정보
export type Subscription = {
  id: string
  user_id: string
  plan: string
  status: string
  billing_key: string | null
  toss_customer_key: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  retry_count: number
  created_at: string
  updated_at: string
}

// 결제 이력
export type Payment = {
  id: string
  user_id: string
  subscription_id: string | null
  toss_payment_key: string | null
  toss_order_id: string
  amount: number
  status: string
  paid_at: string | null
  failed_reason: string | null
  created_at: string
}

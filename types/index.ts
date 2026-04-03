// 키워드 + 블로그 URL 등록 항목
export type Keyword = {
  id: string
  user_id: string              // 소유자 (auth.users.id)
  keyword: string
  blog_url: string
  current_rank: number | null   // 현재 순위 (null = 아직 조회 안 함)
  previous_rank: number | null  // 직전 순위 (변동 계산용)
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
}

// 순위 변동 방향
export type RankDelta = 'up' | 'down' | 'same' | 'new'

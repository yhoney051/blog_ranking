// 애플리케이션 전역 상수
// Rate limit, 페이지네이션, Cron 배치 등 하드코딩된 수치를 한 곳에서 관리

// Rate Limit 설정
export const RATE_LIMITS = {
  /** 인증 사용자 순위 조회: 시간당 30회 */
  RANK_CHECK_PER_HOUR: 30,
  /** 비인증 게스트 순위 조회: 시간당 5회 (IP 기반) */
  GUEST_RANK_CHECK_PER_HOUR: 5,
  /** 비인증 게스트 순위 조회: 24시간당 3회 (쿠키 기반) */
  GUEST_RANK_CHECK_PER_DAY: 3,
  /** AI 포맷 분석: IP당 시간당 10회 */
  FORMAT_PER_HOUR: 10,
  /** 1시간 (밀리초) */
  ONE_HOUR_MS: 60 * 60 * 1000,
  /** 24시간 (밀리초) */
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
} as const

// 페이지네이션
export const PAGINATION = {
  /** 키워드 테이블 페이지 크기 */
  KEYWORD_TABLE_PAGE_SIZE: 10,
  /** 결제 이력 최대 조회 건수 */
  PAYMENT_HISTORY_LIMIT: 5,
} as const

// Cron 작업 설정
export const CRON = {
  /** 순위 체크 배치 크기 (한 번에 처리할 키워드 수) */
  RANK_CHECK_CHUNK_SIZE: 110,
  /** 요청 간 딜레이 (밀리초) — IP 차단 방지 */
  RANK_CHECK_DELAY_MS: 2000,
  /** 검색량 갱신 주기 (일) — 이 기간 이내면 스킵 */
  SEARCH_VOLUME_REFRESH_DAYS: 7,
} as const

// 텔레그램 연동
export const TELEGRAM = {
  /** 연동 토큰 만료 시간 (분) */
  CONNECT_TOKEN_EXPIRY_MINUTES: 5,
} as const

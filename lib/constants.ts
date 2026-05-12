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
  /** 키워드 발굴(검색 도구) 게스트: IP당 시간당 5회 */
  KEYWORD_RESEARCH_GUEST_PER_HOUR: 5,
  /** 키워드 발굴(검색 도구) 회원: 사용자당 시간당 20회 */
  KEYWORD_RESEARCH_USER_PER_HOUR: 20,
  /** 전문 키워드 검색 도구 게스트: IP당 시간당 5회 */
  KEYWORD_PRO_GUEST_PER_HOUR: 5,
  /** 전문 키워드 검색 도구 회원: 사용자당 시간당 20회 */
  KEYWORD_PRO_USER_PER_HOUR: 20,
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
  /** 순위 체크 배치 크기 (한 번 cron 실행에서 처리할 키워드 수) */
  RANK_CHECK_CHUNK_SIZE: 500,
  /** 동시 호출 수 (Promise.all로 병렬 처리) — Bright Data 글로벌 한도 QPS 100 대비 매우 안전 */
  RANK_CHECK_CONCURRENT: 10,
  /** 요청 간 딜레이 (밀리초) — Bright Data가 프록시 풀로 분산 처리하므로 0으로 둠 (네이버 IP 차단 위험 없음) */
  RANK_CHECK_DELAY_MS: 0,
  /** 검색량 갱신 주기 (일) — 이 기간 이내면 스킵 */
  SEARCH_VOLUME_REFRESH_DAYS: 7,
} as const

// 텔레그램 연동
export const TELEGRAM = {
  /** 연동 토큰 만료 시간 (분) */
  CONNECT_TOKEN_EXPIRY_MINUTES: 5,
} as const

// 키워드 발굴(검색 도구) 설정
export const KEYWORD_RESEARCH = {
  /** 한 번에 입력 가능한 키워드 수 (네이버 API 배치 한도) */
  MAX_INPUT_KEYWORDS: 5,
  /** 결과 테이블에 표시할 연관 키워드 상위 개수 */
  RELATED_DISPLAY_LIMIT: 20,
  /** 인메모리 캐시 TTL (시간) */
  CACHE_TTL_HOURS: 24,
} as const

// 전문 키워드 검색 도구 설정 (트렌드 차트 가독성 위해 입력 한도를 좁힘)
export const KEYWORD_PRO = {
  /** 한 번에 입력 가능한 키워드 수 (트렌드 라인 색상 구분 한도) */
  MAX_INPUT_KEYWORDS: 3,
  /** 결과 표에 표시할 연관 키워드 상위 개수 (발굴 도구 깊이) */
  RELATED_DISPLAY_LIMIT: 100,
  /** 트렌드 캐시 TTL (시간) — 검색량 캐시보다 짧게 (일별 변화 의미 있음) */
  TREND_CACHE_TTL_HOURS: 12,
} as const

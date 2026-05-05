// 키워드 발굴 결과 인메모리 LRU 캐시
// 같은 키워드 조합 재호출 시 네이버 검색광고 API 미호출 → 비용/지연 절감
// 인기 지역 키워드(예: "강남 미용실")는 여러 사용자가 검색하므로 캐시 효율 높음

import type { KeywordResearchResult } from './naver-searchad'

type CacheEntry = {
  value: KeywordResearchResult
  expiresAt: number
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24시간 — 검색량은 자주 변하지 않음
const MAX_ITEMS = 200             // 메모리 안전선

// Map은 삽입 순서를 보존 → 가장 오래된 항목 식별 가능 (LRU 구현용)
const cache = new Map<string, CacheEntry>()

// 키워드 순서/대소문자 무관하게 동일 캐시 키가 되도록 정규화
export function makeCacheKey(keywords: string[]): string {
  return keywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('||')
}

export function getCached(key: string): KeywordResearchResult | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }

  // LRU: 최근 접근 항목을 Map 뒤로 이동 (삭제 후 재삽입)
  cache.delete(key)
  cache.set(key, entry)
  return entry.value
}

export function setCached(key: string, value: KeywordResearchResult): void {
  // 용량 초과 시 가장 오래된 항목(Map 첫 번째 키) 제거
  if (cache.size >= MAX_ITEMS) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS,
  })
}

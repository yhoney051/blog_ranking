// 전문 키워드 검색 도구 트렌드 응답 인메모리 LRU 캐시
// 검색광고 결과는 keyword-research-cache 공유, 트렌드는 별도 캐시(period별 키 분리)

import type { TrendResult } from './naver-datalab'
import { KEYWORD_PRO } from './constants'

type CacheEntry = {
  value: TrendResult
  expiresAt: number
}

const TTL_MS = KEYWORD_PRO.TREND_CACHE_TTL_HOURS * 60 * 60 * 1000
const MAX_ITEMS = 200

const cache = new Map<string, CacheEntry>()

// 키워드 정렬 + period로 키 생성 (대소문자/순서 무관)
export function makeTrendCacheKey(keywords: string[], period: string): string {
  const normalized = keywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('||')
  return `${normalized}::${period}`
}

export function getCachedTrend(key: string): TrendResult | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }

  // LRU: 최근 접근 항목을 Map 뒤로 이동
  cache.delete(key)
  cache.set(key, entry)
  return entry.value
}

export function setCachedTrend(key: string, value: TrendResult): void {
  if (cache.size >= MAX_ITEMS) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS,
  })
}

// 네이버 검색광고 API를 통한 키워드 월간 검색량 조회 모듈
// API 문서: https://naver.github.io/searchad-apidoc/#/tags/RelKwdStat

import crypto from 'crypto'
import { KEYWORD_PRO } from '@/lib/constants'

const API_BASE = 'https://api.searchad.naver.com'

// HMAC-SHA256 서명 생성 (네이버 검색광고 API 인증용)
function generateSignature(timestamp: string, method: string, path: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

// 네이버 검색광고 API 공통 헤더 생성
function getHeaders(method: string, path: string) {
  const apiKey = process.env.NAVER_API_LICENSE
  const secretKey = process.env.NAVER_API_SECRET
  const customerId = process.env.NAVER_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    throw new Error('네이버 검색광고 API 환경변수가 설정되지 않았습니다 (NAVER_API_LICENSE, NAVER_API_SECRET, NAVER_CUSTOMER_ID)')
  }

  const timestamp = String(Date.now())
  const signature = generateSignature(timestamp, method, path, secretKey)

  return {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature,
  }
}

// 검색량 조회 결과 타입
export type SearchVolumeResult = {
  keyword: string
  monthlyPcQcCnt: number   // PC 월간 검색량
  monthlyMobileQcCnt: number  // 모바일 월간 검색량
  totalSearchVolume: number   // 합산
  // 전문 키워드 도구용 추가 지표 (검색광고 API 응답에 동봉, 옵셔널)
  compIdx?: string                 // 경쟁 정도 ("낮음" | "중간" | "높음")
  monthlyAvePcClkCnt?: number      // PC 월평균 클릭수
  monthlyAveMobileClkCnt?: number  // 모바일 월평균 클릭수
  monthlyAvePcCtr?: number         // PC 월평균 클릭률(%)
  monthlyAveMobileCtr?: number     // 모바일 월평균 클릭률(%)
  plAvgDepth?: number              // 월평균 노출 광고수
}

// 검색광고 응답의 추가 숫자 필드 안전 파싱 ("0", "< 10", 빈 문자열 등 처리)
function parseNumericField(value: unknown): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) return value
  if (typeof value === 'string') {
    if (value.includes('<')) return 0
    const num = parseFloat(value.replace(/,/g, ''))
    return isNaN(num) ? undefined : num
  }
  return undefined
}

// 네이버 검색광고 API 응답에서 검색량 값 파싱 ("< 10" 같은 문자열 처리)
function parseSearchCount(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // "< 10" 형태는 5로 근사
    if (value.includes('<')) return 5
    const num = parseInt(value.replace(/,/g, ''), 10)
    return isNaN(num) ? 0 : num
  }
  return 0
}

// 키워드 배열에 대한 월간 검색량 조회
// 네이버 API는 한 번에 최대 5개 키워드 조회 가능
export async function getSearchVolume(keywords: string[]): Promise<SearchVolumeResult[]> {
  if (keywords.length === 0) return []

  const results: SearchVolumeResult[] = []

  // 5개씩 배치로 나눠서 호출
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5)
    const batchResults = await fetchSearchVolumeBatch(batch)
    results.push(...batchResults)

    // 배치 간 딜레이 (rate limit 방지)
    if (i + 5 < keywords.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return results
}

// 단일 배치 (최대 5개) 키워드 검색량 조회
async function fetchSearchVolumeBatch(keywords: string[]): Promise<SearchVolumeResult[]> {
  const path = '/keywordstool'
  const method = 'GET'
  const headers = getHeaders(method, path)

  const params = new URLSearchParams()
  params.set('hintKeywords', keywords.join(','))
  params.set('showDetail', '1')

  const res = await fetch(`${API_BASE}${path}?${params.toString()}`, {
    method,
    headers,
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[NaverSearchAd] API 오류:', res.status, errText)
    throw new Error(`네이버 검색광고 API 오류: ${res.status}`)
  }

  const data = await res.json()

  // keywordList에서 입력한 키워드와 정확히 매칭되는 결과만 필터링
  // (연관 키워드도 함께 반환되므로)
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase().trim()))

  const results: SearchVolumeResult[] = []

  if (data.keywordList && Array.isArray(data.keywordList)) {
    for (const item of data.keywordList) {
      const kw = String(item.relKeyword || '').toLowerCase().trim()
      if (keywordSet.has(kw)) {
        const pc = parseSearchCount(item.monthlyPcQcCnt)
        const mobile = parseSearchCount(item.monthlyMobileQcCnt)
        results.push({
          keyword: item.relKeyword,
          monthlyPcQcCnt: pc,
          monthlyMobileQcCnt: mobile,
          totalSearchVolume: pc + mobile,
        })
      }
    }
  }

  return results
}

// 키워드 발굴 결과 타입 (검색 도구용)
// 네이버 검색광고 API는 입력 키워드와 함께 연관 키워드들도 반환하는데,
// fetchSearchVolumeBatch는 입력 매칭만 살리고 나머지를 버린다.
// 본 함수는 같은 응답을 두 갈래로 나눠 검색량 + 연관 키워드를 같이 활용한다.
export type KeywordResearchResult = {
  searched: SearchVolumeResult[]   // 입력한 키워드의 검색량
  related: SearchVolumeResult[]    // 연관 키워드 (검색량 내림차순, 상위 N개)
}

// 단일 배치(최대 5개) 키워드 발굴 호출 — keywordList 전체를 파싱해 그대로 반환
// 입력/연관 분류는 호출부(fetchKeywordResearch)에서 처리한다.
async function fetchResearchBatch(queryKeywords: string[]): Promise<SearchVolumeResult[]> {
  const path = '/keywordstool'
  const method = 'GET'
  const headers = getHeaders(method, path)

  const params = new URLSearchParams()
  params.set('hintKeywords', queryKeywords.join(','))
  params.set('showDetail', '1')

  const res = await fetch(`${API_BASE}${path}?${params.toString()}`, { method, headers })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[NaverSearchAd] 키워드 발굴 API 오류:', res.status, errText)
    throw new Error(`네이버 검색광고 API 오류: ${res.status}`)
  }

  const data = await res.json()
  if (!data.keywordList || !Array.isArray(data.keywordList)) return []

  return data.keywordList.map((item: Record<string, unknown>): SearchVolumeResult => {
    const pc = parseSearchCount(item.monthlyPcQcCnt)
    const mobile = parseSearchCount(item.monthlyMobileQcCnt)
    return {
      keyword: String(item.relKeyword ?? ''),
      monthlyPcQcCnt: pc,
      monthlyMobileQcCnt: mobile,
      totalSearchVolume: pc + mobile,
      compIdx: typeof item.compIdx === 'string' ? item.compIdx : undefined,
      monthlyAvePcClkCnt: parseNumericField(item.monthlyAvePcClkCnt),
      monthlyAveMobileClkCnt: parseNumericField(item.monthlyAveMobileClkCnt),
      monthlyAvePcCtr: parseNumericField(item.monthlyAvePcCtr),
      monthlyAveMobileCtr: parseNumericField(item.monthlyAveMobileCtr),
      plAvgDepth: parseNumericField(item.plAvgDepth),
    }
  })
}

// 키워드 발굴 — 입력 키워드의 검색량 + 같이 반환되는 연관 키워드 조회
// 네이버 검색광고 API는 요청당 5개가 한도이므로, 대량 입력은 5개씩 나눠 순차 호출한 뒤 합친다.
// searched는 사용자가 입력한 순서를 그대로 보존하고, related는 중복 제거 후 검색량 내림차순.
export async function fetchKeywordResearch(
  keywords: string[],
  relatedLimit = 100
): Promise<KeywordResearchResult> {
  // 네이버 hintKeywords는 공백을 허용하지 않는다 → 조회용은 공백 제거본(query),
  // 화면 표기는 사용자가 입력한 원본(raw)을 쓰기 위해 둘을 짝지어 관리한다.
  const inputs = keywords
    .map((k) => ({ raw: k.trim(), query: k.replace(/\s+/g, '') }))
    .filter((k) => k.query.length > 0)

  // 공백만 다른 중복 입력 제거 (예: "김해 인테리어" / "김해인테리어")
  const seenInput = new Set<string>()
  const uniqueInputs = inputs.filter((k) => {
    const key = k.query.toLowerCase()
    if (seenInput.has(key)) return false
    seenInput.add(key)
    return true
  })

  if (uniqueInputs.length === 0) return { searched: [], related: [] }

  const inputKeySet = new Set(uniqueInputs.map((k) => k.query.toLowerCase()))
  const searchedMap = new Map<string, SearchVolumeResult>()
  const relatedMap = new Map<string, SearchVolumeResult>()

  const { NAVER_BATCH_SIZE, BATCH_DELAY_MS } = KEYWORD_PRO

  for (let i = 0; i < uniqueInputs.length; i += NAVER_BATCH_SIZE) {
    const batch = uniqueInputs.slice(i, i + NAVER_BATCH_SIZE)
    const items = await fetchResearchBatch(batch.map((k) => k.query))

    for (const item of items) {
      const key = item.keyword.toLowerCase().trim()
      if (!key) continue
      // 배치마다 연관 키워드가 겹칠 수 있으므로 Map으로 중복 제거
      if (inputKeySet.has(key)) {
        if (!searchedMap.has(key)) searchedMap.set(key, item)
      } else if (!relatedMap.has(key)) {
        relatedMap.set(key, item)
      }
    }

    // 배치 간 딜레이 (네이버 rate limit 방지)
    if (i + NAVER_BATCH_SIZE < uniqueInputs.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  // 입력 순서 보존 + 표기는 사용자가 친 원본 문자열로 되돌림
  // (검색량이 조회되지 않은 키워드는 결과에서 빠진다 — 호출부에서 개수 차이로 안내)
  const searched = uniqueInputs
    .map(({ raw, query }) => {
      const found = searchedMap.get(query.toLowerCase())
      return found ? { ...found, keyword: raw } : null
    })
    .filter((r): r is SearchVolumeResult => r !== null)

  // 연관 키워드는 검색량 내림차순 → 상위 N개로 자르기 (페이로드 다이어트)
  const related = Array.from(relatedMap.values())
    .sort((a, b) => b.totalSearchVolume - a.totalSearchVolume)
    .slice(0, relatedLimit)

  return { searched, related }
}

// 네이버 검색광고 API 환경변수 설정 여부 확인
export function isNaverSearchAdConfigured(): boolean {
  return !!(
    process.env.NAVER_API_LICENSE &&
    process.env.NAVER_API_SECRET &&
    process.env.NAVER_CUSTOMER_ID
  )
}

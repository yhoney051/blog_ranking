// 네이버 검색광고 API를 통한 키워드 월간 검색량 조회 모듈
// API 문서: https://naver.github.io/searchad-apidoc/#/tags/RelKwdStat

import crypto from 'crypto'

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

// 네이버 검색광고 API 환경변수 설정 여부 확인
export function isNaverSearchAdConfigured(): boolean {
  return !!(
    process.env.NAVER_API_LICENSE &&
    process.env.NAVER_API_SECRET &&
    process.env.NAVER_CUSTOMER_ID
  )
}

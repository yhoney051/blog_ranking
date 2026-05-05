// 네이버 데이터랩 API — 검색어 트렌드 (상대 검색량 0~100 시계열)
// 검색광고 API와 다른 채널: 네이버 개발자센터에서 발급한 일반 OpenAPI 키 사용
// 무료. 호출당 비용 없음. 응답은 절대 검색량이 아닌 상대 지수.

const API_URL = 'https://openapi.naver.com/v1/datalab/search'

export type TrendPeriod = '1m' | '3m' | '6m' | '12m'
export type TrendTimeUnit = 'date' | 'week' | 'month'

// period 별 시작일·시간 단위 매핑
// 데이터 포인트 수가 너무 많아지지 않도록 강제 (차트 가독성)
function resolveRange(period: TrendPeriod): { startDate: string; endDate: string; timeUnit: TrendTimeUnit } {
  const now = new Date()
  const endDate = formatDate(now)
  const start = new Date(now)

  let timeUnit: TrendTimeUnit
  switch (period) {
    case '1m':
      start.setDate(start.getDate() - 30)
      timeUnit = 'date'
      break
    case '3m':
      start.setMonth(start.getMonth() - 3)
      timeUnit = 'week'
      break
    case '6m':
      start.setMonth(start.getMonth() - 6)
      timeUnit = 'week'
      break
    case '12m':
    default:
      start.setMonth(start.getMonth() - 12)
      timeUnit = 'month'
      break
  }

  return { startDate: formatDate(start), endDate, timeUnit }
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export type TrendPoint = { period: string; ratio: number }
export type TrendSeries = { keyword: string; data: TrendPoint[] }
export type TrendResult = {
  startDate: string
  endDate: string
  timeUnit: TrendTimeUnit
  series: TrendSeries[]
}

// 키워드별 검색 트렌드 시계열 조회
// 입력 키워드를 그대로 groupName으로 전송 → 응답의 title로 매칭
export async function fetchSearchTrend(
  keywords: string[],
  period: TrendPeriod = '12m'
): Promise<TrendResult> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('네이버 데이터랩 API 환경변수가 설정되지 않았습니다 (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)')
  }

  const cleaned = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 5)
  if (cleaned.length === 0) {
    return { startDate: '', endDate: '', timeUnit: 'month', series: [] }
  }

  const { startDate, endDate, timeUnit } = resolveRange(period)

  const body = {
    startDate,
    endDate,
    timeUnit,
    keywordGroups: cleaned.map((kw) => ({ groupName: kw, keywords: [kw] })),
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[NaverDatalab] API 오류:', res.status, errText)
    throw new Error(`네이버 데이터랩 API 오류: ${res.status}`)
  }

  const data = await res.json()

  // 응답 정규화 — title을 입력 키워드로 매칭
  const series: TrendSeries[] = []
  if (Array.isArray(data.results)) {
    for (const r of data.results) {
      const points: TrendPoint[] = Array.isArray(r.data)
        ? r.data.map((p: { period: string; ratio: number }) => ({
            period: String(p.period),
            ratio: typeof p.ratio === 'number' ? p.ratio : Number(p.ratio) || 0,
          }))
        : []
      series.push({ keyword: String(r.title ?? ''), data: points })
    }
  }

  return { startDate, endDate, timeUnit, series }
}

// 환경변수 설정 여부 확인 — 미설정 시 트렌드 기능 비활성
export function isNaverDatalabConfigured(): boolean {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)
}

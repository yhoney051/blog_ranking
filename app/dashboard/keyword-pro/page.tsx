// 전문 키워드 검색 도구 페이지 (서버 컴포넌트)
// 기본 키워드("강남피부과")의 결과를 unstable_cache로 7일간 서버 측 캐싱하여
// 모든 사용자에게 사전 렌더된 결과를 즉시 보여준다.
// 외부 네이버 API 호출은 서버에서 7일에 1회만 발생 → rate limit/비용 거의 0.

import { Header } from '@/components/layout/header'
import { KeywordProTool } from '@/components/keyword-pro/keyword-pro-tool'
import { getAuthUserId } from '@/lib/supabase/server'
import { fetchKeywordResearch, type KeywordResearchResult } from '@/lib/naver-searchad'
import { fetchSearchTrend, isNaverDatalabConfigured, type TrendResult } from '@/lib/naver-datalab'
import { unstable_cache } from 'next/cache'
import { KEYWORD_PRO } from '@/lib/constants'

const DEFAULT_KEYWORD = '강남피부과'

// 비회원도 접근 가능 페이지라 미인증 cookie 분기 무시 가능 — 페이지 자체는 server-side cache
// (cookies()를 호출해도 같은 키로 캐시되므로 user-별 캐시 분기는 불필요)

export type DefaultData = {
  metrics: KeywordResearchResult
  trend: TrendResult | null
  trendDisabled: boolean
  trendError: string | null
}

// 메트릭 fetch 실패 시 throw → unstable_cache가 결과를 캐시하지 않음 (다음 요청에서 재시도)
const getDefaultData = unstable_cache(
  async (): Promise<DefaultData> => {
    const metrics = await fetchKeywordResearch([DEFAULT_KEYWORD], KEYWORD_PRO.RELATED_DISPLAY_LIMIT)
    let trend: TrendResult | null = null
    let trendError: string | null = null
    const trendEnabled = isNaverDatalabConfigured()
    if (trendEnabled) {
      try {
        trend = await fetchSearchTrend([DEFAULT_KEYWORD], '12m')
      } catch (err) {
        trendError = '트렌드 데이터를 불러오지 못했습니다.'
        console.error('[keyword-pro default trend]', err)
      }
    }
    return {
      metrics,
      trend,
      trendDisabled: !trendEnabled,
      trendError,
    }
  },
  ['keyword-pro-default-v1'],
  // 7일에 한 번만 백그라운드 갱신 — 그동안 모든 사용자가 같은 결과를 본다
  { revalidate: 60 * 60 * 24 * 7, tags: ['keyword-pro-default'] }
)

export default async function KeywordProPage() {
  // 메트릭 호출이 실패해도 페이지 자체는 렌더되도록 try/catch로 감싸 fallback null
  const [userId, defaultData] = await Promise.all([
    getAuthUserId(),
    getDefaultData().catch((err) => {
      console.error('[keyword-pro default metrics]', err)
      return null
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="전문 키워드 검색" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <KeywordProTool isLoggedIn={!!userId} defaultData={defaultData} />
        </div>
      </main>
    </div>
  )
}

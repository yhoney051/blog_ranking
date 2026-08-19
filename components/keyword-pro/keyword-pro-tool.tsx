'use client'

// 전문 키워드 검색 도구 — 메인 UI
// 여러 줄 붙여넣기로 최대 100개 키워드의 검색량을 한 번에 조회한다.
// (네이버 검색광고 API는 요청당 5개 한도 → 서버에서 5개씩 나눠 호출)
// 좌(입력) / 우(트렌드 차트) 2열 레이아웃, 결과는 그 아래에
// '내 키워드' 표와 '연관 키워드' 표를 각각 별도 카드로 분리해 보여준다.
// 기본 결과(defaultData)는 서버 컴포넌트가 미리 fetch해 prop으로 전달 — 마운트 시 외부 호출 0.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Loader2, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { KeywordTrendChart } from '@/components/keyword-pro/keyword-trend-chart'
import { KeywordMetricTable, type MetricRow } from '@/components/keyword-pro/keyword-metric-table'
import { RegisterSelectedSheet } from '@/components/keyword-pro/register-selected-sheet'
import { KEYWORD_PRO } from '@/lib/constants'
import type { TrendResult } from '@/lib/naver-datalab'

type Metrics = {
  searched: MetricRow[]
  related: MetricRow[]
}

type Response = {
  metrics: Metrics
  trend: TrendResult | null
  trendDisabled?: boolean
  trendLimited?: boolean
  trendKeywords?: string[]
  trendError?: string | null
  cached?: boolean
  remaining?: number
}

const PERIOD_OPTIONS: { value: '1m' | '3m' | '6m' | '12m'; label: string }[] = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
]

const DEFAULT_KEYWORD = '강남피부과'
const MAX = KEYWORD_PRO.MAX_INPUT_KEYWORDS
const TREND_MAX = KEYWORD_PRO.TREND_MAX_KEYWORDS

// 붙여넣은 텍스트를 키워드 배열로 변환
// 줄바꿈/쉼표/탭 구분 모두 허용 (엑셀·메모장에서 그대로 복사 가능), 중복은 제거하고 입력 순서 유지
function parseKeywords(raw: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const piece of raw.split(/[,\n\t]/)) {
    const kw = piece.trim()
    if (!kw) continue
    const key = kw.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(kw)
  }
  return result
}

// 서버에서 전달되는 기본 데이터 형태 (page.tsx의 DefaultData와 호환)
type DefaultData = {
  metrics: Metrics
  trend: TrendResult | null
  trendDisabled: boolean
  trendError: string | null
} | null

interface Props {
  isLoggedIn: boolean | null
  defaultData?: DefaultData
}

export function KeywordProTool({ isLoggedIn, defaultData }: Props) {
  const router = useRouter()
  const [input, setInput] = useState(DEFAULT_KEYWORD)
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '12m'>('12m')
  // 기본 결과를 서버에서 받은 값으로 초기화 → 사용자별 외부 호출 0
  const [data, setData] = useState<Response | null>(
    defaultData
      ? {
          metrics: defaultData.metrics,
          trend: defaultData.trend,
          trendDisabled: defaultData.trendDisabled,
          trendError: defaultData.trendError,
          cached: true,
        }
      : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  // 마지막으로 서버에 보낸 키워드 개수 — 조회되지 않은 키워드 안내에 사용
  const [requestedCount, setRequestedCount] = useState<number>(defaultData ? 1 : 0)
  // 표에서 체크한 키워드를 순위 추적에 등록하는 패널 상태
  const [registerTargets, setRegisterTargets] = useState<string[]>([])
  const [registerOpen, setRegisterOpen] = useState(false)

  // 입력창에서 인식된 키워드 (실시간 카운터용)
  const parsed = useMemo(() => parseKeywords(input), [input])
  const overLimit = parsed.length > MAX

  const handleSearch = async () => {
    const keywords = parsed.slice(0, MAX)
    if (keywords.length === 0) {
      setError('키워드를 1개 이상 입력해주세요.')
      return
    }
    setError(null)
    setLoading(true)
    setHighlighted(null)
    setRequestedCount(keywords.length)
    try {
      const res = await fetch('/api/keyword-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, period }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '검색 중 오류가 발생했습니다.')
        setData(null)
      } else {
        setData(json)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Ctrl/Cmd + Enter로 실행 (Enter는 줄바꿈이므로)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSearch()
    }
  }

  const handleRowClick = (keyword: string) => {
    setHighlighted((cur) => (cur === keyword ? null : keyword))
  }

  // 표의 '선택 등록' 클릭 → 등록 패널 열기 (비회원은 가입 유도)
  const handleRegisterSelected = (selectedKeywords: string[]) => {
    if (!isLoggedIn) {
      router.push('/signup')
      return
    }
    if (selectedKeywords.length === 0) return
    setRegisterTargets(selectedKeywords)
    setRegisterOpen(true)
  }

  const searchedRows = data?.metrics.searched ?? []
  const relatedRows = data?.metrics.related ?? []
  // 네이버가 검색량을 돌려주지 않은 키워드 수 (오타·신규 키워드 등)
  const missingCount = Math.max(0, requestedCount - searchedRows.length)

  // 트렌드 차트 영역 — data 없을 땐 placeholder, 있으면 케이스별 렌더
  const renderTrendBody = () => {
    if (!data) {
      return (
        <p className="text-xs text-muted-foreground py-12 text-center">
          키워드를 입력하고 분석하면 검색 트렌드 그래프가 여기에 표시됩니다.
        </p>
      )
    }
    if (data.trendDisabled) {
      return (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>트렌드 차트가 일시적으로 비활성화되어 있습니다. (관리자 설정 필요)</span>
        </div>
      )
    }
    if (data.trendError) {
      return (
        <div className="rounded-lg border border-red-200/60 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 p-4 text-xs text-red-700 dark:text-red-400">
          {data.trendError}
        </div>
      )
    }
    if (data.trend && data.trend.series.length > 0) {
      return (
        <div className="space-y-2">
          {data.trendLimited && (
            <div className="rounded-lg border border-sky-200/60 bg-sky-50 dark:border-sky-800/50 dark:bg-sky-900/20 p-2.5 text-[11px] text-sky-800 dark:text-sky-300 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                네이버 트렌드는 최대 {TREND_MAX}개까지만 비교할 수 있어, 입력 순서 기준 앞{' '}
                {TREND_MAX}개만 표시합니다. 검색량 표에는 전체가 나옵니다.
              </span>
            </div>
          )}
          <KeywordTrendChart trend={data.trend} highlightedKeyword={highlighted} />
        </div>
      )
    }
    return <p className="text-sm text-muted-foreground py-8 text-center">트렌드 데이터가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      {/* 상단 좌(입력) / 우(트렌드 차트) 2열 — 모바일은 자동으로 stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 입력 카드 */}
        <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-4">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">전문 키워드 검색</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                검색량 + 경쟁도 + 트렌드 그래프까지 한눈에. 엑셀·메모장에서 복사한 키워드를 그대로
                붙여넣으면 한 번에 최대 {MAX}개까지 조회합니다.
              </p>
            </div>
          </div>

          {/* 입력창 — 여러 줄 붙여넣기 지원 */}
          <div className="space-y-2">
            <Textarea
              placeholder={'키워드를 한 줄에 하나씩 붙여넣으세요.\n\n예)\n김해 인테리어 업체\n해운대 인테리어 업체\n동래 인테리어 업체'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={7}
              className="min-h-[160px] text-sm resize-y"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  overLimit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
                )}
              >
                {overLimit
                  ? `${parsed.length}개 인식됨 — 최대 ${MAX}개까지만 조회됩니다`
                  : `${parsed.length}개 인식됨 (최대 ${MAX}개)`}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Ctrl + Enter로 바로 분석
              </span>
            </div>
            <Button
              onClick={() => void handleSearch()}
              disabled={loading || parsed.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  조회 중... (키워드가 많으면 최대 10초)
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1.5" />
                  {parsed.length > 1 ? `${Math.min(parsed.length, MAX)}개 한번에 분석하기` : '분석하기'}
                </>
              )}
            </Button>
          </div>

          {/* 기간 토글 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">트렌드 기간:</span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                disabled={loading}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  period === opt.value
                    ? 'bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200/60 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* 트렌드 차트 카드 — 항상 노출 (placeholder 또는 실제 데이터) */}
        <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">검색 트렌드</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              상대 지수 (가장 높은 시점 = 100). 절대 검색량이 아닙니다.
            </p>
          </div>
          {renderTrendBody()}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      )}

      {/* 조회되지 않은 키워드 안내 */}
      {!loading && data && missingCount > 0 && (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            입력한 {requestedCount}개 중 {missingCount}개는 네이버에 검색량 데이터가 없어 표에서
            제외됐습니다. (오타이거나 검색량이 거의 없는 키워드)
          </span>
        </div>
      )}

      {/* 결과 1 — 내가 입력한 키워드 (입력 순서 유지) */}
      {!loading && data && (
        <KeywordMetricTable
          title="내 키워드"
          description="내가 입력한 키워드입니다. 붙여넣은 순서 그대로 표시됩니다."
          rows={searchedRows}
          downloadPrefix="my"
          highlightRows
          highlighted={highlighted}
          onRowClick={handleRowClick}
          onRegisterSelected={handleRegisterSelected}
          orderNote="💡 체크박스로 고른 뒤 '선택 등록'을 누르면 블로그 주소·태그만 입력해 바로 순위 추적에 등록됩니다. 행을 클릭하면 트렌드 차트에서 강조되고, 컬럼 헤더로 정렬할 수 있습니다."
          emptyText="조회된 키워드가 없습니다. 키워드를 다시 확인해주세요."
        />
      )}

      {/* 결과 2 — 네이버가 함께 알려준 연관 키워드 */}
      {!loading && data && relatedRows.length > 0 && (
        <KeywordMetricTable
          title="연관 키워드"
          description="네이버가 함께 추천한 키워드입니다. 검색량이 많은 순서로 정렬돼 있습니다."
          rows={relatedRows}
          downloadPrefix="related"
          highlighted={highlighted}
          onRowClick={handleRowClick}
          onRegisterSelected={handleRegisterSelected}
          orderNote="💡 쓸 만한 키워드를 체크하고 '선택 등록'을 누르면 바로 순위 추적에 넣을 수 있습니다."
        />
      )}

      {/* 비회원 CTA */}
      {!loading && data && !isLoggedIn && (
        <div className="rounded-xl border bg-gradient-to-r from-brand-500/10 to-brand-300/20 p-4 lg:p-6 text-center space-y-2">
          <p className="text-sm font-semibold">이 키워드들로 매일 순위 체크 받으시겠어요?</p>
          <p className="text-xs text-muted-foreground">
            가입하면 매일 자동으로 네이버 블로그탭 순위를 추적해 드려요.
          </p>
          <Button onClick={() => router.push('/signup')} className="w-full sm:w-auto sm:px-8 mt-2">
            무료로 시작하기
          </Button>
        </div>
      )}

      {/* 선택한 키워드 등록 패널 */}
      <RegisterSelectedSheet
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        keywords={registerTargets}
      />
    </div>
  )
}

'use client'

// 전문 키워드 검색 도구 — 메인 UI
// 입력 키워드 1~3개 + 기간 → 검색량/경쟁도 메트릭 + 트렌드 차트
// 좌(입력) / 우(트렌드 차트) 2열 레이아웃, 결과 표는 그 아래 전체 너비.
// 마운트 시 기본 키워드("강남피부과")가 자동 검색되어 결과 화면이 보여짐.
// 표 인라인 필터: 키워드 검색창 + 컬럼 헤더 클릭 정렬 + 체크박스 다운로드.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { KeywordTrendChart } from '@/components/keyword-pro/keyword-trend-chart'
import type { TrendResult } from '@/lib/naver-datalab'

type MetricRow = {
  keyword: string
  monthlyPcQcCnt: number
  monthlyMobileQcCnt: number
  totalSearchVolume: number
  compIdx?: string
  monthlyAvePcClkCnt?: number
  monthlyAveMobileClkCnt?: number
  monthlyAvePcCtr?: number
  monthlyAveMobileCtr?: number
  plAvgDepth?: number
}

type Metrics = {
  searched: MetricRow[]
  related: MetricRow[]
}

type Response = {
  metrics: Metrics
  trend: TrendResult | null
  trendDisabled?: boolean
  trendError?: string | null
  cached?: boolean
  remaining?: number
}

type SortKey = 'keyword' | 'monthlyPcQcCnt' | 'monthlyMobileQcCnt' | 'totalSearchVolume' | 'compIdx'
type SortDir = 'asc' | 'desc'

// 경쟁도 정렬 순서 — 낮음(1) < 중간(2) < 높음(3). 빈 값은 0
const COMP_ORDER: Record<string, number> = { 낮음: 1, 중간: 2, 높음: 3 }

const PERIOD_OPTIONS: { value: '1m' | '3m' | '6m' | '12m'; label: string }[] = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
]

const DEFAULT_KEYWORD = '강남피부과'

interface Props {
  isLoggedIn: boolean | null
}

export function KeywordProTool({ isLoggedIn }: Props) {
  const router = useRouter()
  const [input, setInput] = useState(DEFAULT_KEYWORD)
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '12m'>('12m')
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterText, setFilterText] = useState('')
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'desc' })
  const didAutoSearch = useRef(false)

  // 외부 호출 공통 — handleSearch와 mount 자동 검색이 공유
  const fetchKeywords = async (keywordsArr: string[], periodArg: '1m' | '3m' | '6m' | '12m') => {
    if (keywordsArr.length === 0) {
      setError('키워드를 1개 이상 입력해주세요.')
      return
    }
    setError(null)
    setLoading(true)
    setHighlighted(null)
    setSelected(new Set())
    setFilterText('')
    setSort({ key: null, dir: 'desc' })
    try {
      const res = await fetch('/api/keyword-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordsArr, period: periodArg }),
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

  const handleSearch = () => {
    const keywords = input
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 3)
    void fetchKeywords(keywords, period)
  }

  // 마운트 시 1회 기본 키워드 자동 검색 (예시 결과로 빈 화면 방지)
  useEffect(() => {
    if (didAutoSearch.current) return
    didAutoSearch.current = true
    void fetchKeywords([DEFAULT_KEYWORD], '12m')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatNumber = (n: number | undefined): string => {
    if (n === undefined || n === null) return '-'
    if (n < 10 && n > 0) return '< 10'
    return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
  }

  const getCompBadge = (comp: string | undefined) => {
    if (!comp) return null
    const map: Record<string, { cls: string }> = {
      낮음: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      중간: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      높음: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    }
    const style = map[comp]
    return (
      <Badge variant="secondary" className={cn('text-[10px]', style?.cls)}>
        {comp}
      </Badge>
    )
  }

  // 검색량 비교용 정규화 — 공백/대소문자 무시
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()

  // 표에 표시되는 통합 행 목록 (입력 + 연관) — 원본 순서 보존
  const allRows = useMemo(
    () =>
      data
        ? [
            ...data.metrics.searched.map((r) => ({ row: r, isSearched: true })),
            ...data.metrics.related.map((r) => ({ row: r, isSearched: false })),
          ]
        : [],
    [data]
  )

  // 화면용: 텍스트 필터 + 정렬 적용
  const displayedRows = useMemo(() => {
    let rows = allRows
    if (filterText.trim()) {
      const q = normalize(filterText)
      rows = rows.filter((r) => normalize(r.row.keyword).includes(q))
    }
    if (sort.key) {
      const key = sort.key
      const dirMul = sort.dir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        if (key === 'keyword') {
          return a.row.keyword.localeCompare(b.row.keyword, 'ko') * dirMul
        }
        if (key === 'compIdx') {
          const aV = COMP_ORDER[a.row.compIdx ?? ''] ?? 0
          const bV = COMP_ORDER[b.row.compIdx ?? ''] ?? 0
          return (aV - bV) * dirMul
        }
        const aN = (a.row[key] as number) ?? 0
        const bN = (b.row[key] as number) ?? 0
        return (aN - bN) * dirMul
      })
    }
    return rows
  }, [allRows, filterText, sort])

  // 컬럼 헤더 클릭으로 정렬 토글: desc → asc → null(해제)
  const handleSortClick = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'desc' }
      if (prev.dir === 'desc') return { key, dir: 'asc' }
      return { key: null, dir: 'desc' }
    })
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="h-3 w-3 inline-block ml-1 opacity-40" />
    return sort.dir === 'desc' ? (
      <ArrowDown className="h-3 w-3 inline-block ml-1 text-foreground" />
    ) : (
      <ArrowUp className="h-3 w-3 inline-block ml-1 text-foreground" />
    )
  }

  // "전체 선택" 체크박스: 현재 화면에 보이는 행 기준으로 동작 (필터링 직관)
  const allVisibleSelected = displayedRows.length > 0 && displayedRows.every((r) => selected.has(r.row.keyword))
  const someVisibleSelected = !allVisibleSelected && displayedRows.some((r) => selected.has(r.row.keyword))

  const toggleSelectOne = (keyword: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(keyword)) next.delete(keyword)
      else next.add(keyword)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      // 보이는 행만 선택 해제
      setSelected((prev) => {
        const next = new Set(prev)
        displayedRows.forEach((r) => next.delete(r.row.keyword))
        return next
      })
    } else {
      // 보이는 행만 선택 추가
      setSelected((prev) => {
        const next = new Set(prev)
        displayedRows.forEach((r) => next.add(r.row.keyword))
        return next
      })
    }
  }

  // .xlsx 생성 + AutoFilter 적용 + 다운로드 트리거
  // xlsx 패키지는 동적 import로 초기 번들에서 분리 (다운로드 버튼 클릭 시에만 로드)
  const downloadXlsx = async (rows: { row: MetricRow; isSearched: boolean }[], suffix: string) => {
    if (rows.length === 0) return
    const XLSX = await import('xlsx')
    const headers = ['키워드', 'PC 검색량', '모바일 검색량', '합계', '경쟁도']
    const aoa: (string | number)[][] = [
      headers,
      ...rows.map(({ row }) => [
        row.keyword,
        row.monthlyPcQcCnt,
        row.monthlyMobileQcCnt,
        row.totalSearchVolume,
        row.compIdx ?? '',
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // 숫자 셀(B/C/D 컬럼 = PC/모바일/합계)에 천 단위 콤마 포맷 적용
    const numFmt = '#,##0'
    for (let r = 1; r <= rows.length; r++) {
      for (const c of [1, 2, 3]) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr]
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n'
          cell.z = numFmt
        }
      }
    }
    // 헤더 + 데이터 전체 범위에 AutoFilter 적용
    ws['!autofilter'] = { ref: `A1:E${rows.length + 1}` }
    ws['!cols'] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '키워드 분석')
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `keyword-pro-${suffix}-${today}.xlsx`)
  }

  // 다운로드는 화면 필터/정렬 결과와 무관하게 원본 allRows 기준
  const handleDownloadAll = () => void downloadXlsx(allRows, 'all')
  const handleDownloadSelected = () => {
    const rows = allRows.filter((r) => selected.has(r.row.keyword))
    void downloadXlsx(rows, `selected-${rows.length}`)
  }

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
      return <KeywordTrendChart trend={data.trend} highlightedKeyword={highlighted} />
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
                검색량 + 경쟁도 + 트렌드 그래프까지 한눈에. 한 번에 최대 3개 키워드를 비교 분석합니다.
              </p>
            </div>
          </div>

          {/* 입력창 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="예: 다산동 카페, 강남 미용실 (쉼표로 구분, 최대 3개)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={loading}
            />
            <Button onClick={handleSearch} disabled={loading || !input.trim()} className="sm:w-32">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1.5" />
                  분석하기
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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      )}

      {/* 결과 — 입력 키워드 + 연관 키워드 통합 테이블 */}
      {!loading && data && allRows.length > 0 && (
        <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-4">
          {/* 헤더: 제목/카운터 + 검색창 + 다운로드 버튼 */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">키워드 분석 결과</h4>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                총 {allRows.length}개{filterText.trim() && ` / 필터 후 ${displayedRows.length}개`}
              </span>
              {data.cached && <span className="text-[10px] text-muted-foreground">캐시 결과</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="키워드 필터 검색"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-44 h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={selected.size === 0}
                onClick={handleDownloadSelected}
                title={selected.size === 0 ? '체크박스로 키워드를 먼저 선택해주세요' : `${selected.size}개 키워드 다운로드`}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                선택 다운로드 ({selected.size})
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadAll}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                전체 다운로드
              </Button>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected
                      }}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-border accent-brand-500"
                      aria-label="화면에 표시된 키워드 전체 선택"
                    />
                  </th>
                  <th className="px-3 py-2 text-center">구분</th>
                  <th
                    className="px-3 py-2 text-left cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => handleSortClick('keyword')}
                  >
                    키워드 <SortIcon k="keyword" />
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => handleSortClick('monthlyPcQcCnt')}
                  >
                    PC 검색량 <SortIcon k="monthlyPcQcCnt" />
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => handleSortClick('monthlyMobileQcCnt')}
                  >
                    모바일 검색량 <SortIcon k="monthlyMobileQcCnt" />
                  </th>
                  <th
                    className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => handleSortClick('totalSearchVolume')}
                  >
                    합계 <SortIcon k="totalSearchVolume" />
                  </th>
                  <th
                    className="px-3 py-2 text-center cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => handleSortClick('compIdx')}
                  >
                    경쟁도 <SortIcon k="compIdx" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">
                      필터에 일치하는 키워드가 없습니다.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map(({ row, isSearched }) => (
                    <tr
                      key={`${isSearched ? 's' : 'r'}-${row.keyword}`}
                      onClick={() => setHighlighted((cur) => (cur === row.keyword ? null : row.keyword))}
                      className={cn(
                        'border-t cursor-pointer hover:bg-muted/30 transition-colors',
                        isSearched && 'bg-brand-300/20 dark:bg-brand-900/15',
                        highlighted === row.keyword && 'bg-brand-300/40 dark:bg-brand-900/30'
                      )}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.keyword)}
                          onChange={() => toggleSelectOne(row.keyword)}
                          className="h-4 w-4 rounded border-border accent-brand-500"
                          aria-label={`${row.keyword} 선택`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={isSearched ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {isSearched ? '내 키워드' : '연관'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{row.keyword}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.monthlyPcQcCnt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.monthlyMobileQcCnt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(row.totalSearchVolume)}</td>
                      <td className="px-3 py-2 text-center">{getCompBadge(row.compIdx) ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            💡 행을 클릭하면 우측 트렌드 차트에서 해당 키워드만 강조됩니다. 컬럼 헤더 클릭으로 정렬, 검색창으로 필터링 가능. 다운로드는 필터와 무관하게 전체/선택한 키워드 기준입니다.
          </p>
        </div>
      )}

      {/* 비회원 CTA */}
      {!loading && data && !isLoggedIn && (
        <div className="rounded-xl border bg-gradient-to-r from-brand-500/10 to-brand-300/20 p-4 lg:p-6 text-center space-y-2">
          <p className="text-sm font-semibold">이 키워드들로 매일 순위 체크 받으시겠어요?</p>
          <p className="text-xs text-muted-foreground">가입하면 매일 자동으로 네이버 블로그탭 순위를 추적해 드려요.</p>
          <Button onClick={() => router.push('/signup')} className="w-full sm:w-auto sm:px-8 mt-2">
            무료로 시작하기
          </Button>
        </div>
      )}
    </div>
  )
}

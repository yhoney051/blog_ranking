'use client'

// 전문 키워드 결과 표 (재사용 컴포넌트)
// '내 키워드' 표와 '연관 키워드' 표가 같은 구조를 쓰므로 하나로 분리했다.
// 필터/정렬/체크박스 선택/다운로드 상태는 각 표가 독립적으로 가진다.

import { useMemo, useState } from 'react'
import { Download, ArrowUp, ArrowDown, ArrowUpDown, ListPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type MetricRow = {
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

type SortKey = 'keyword' | 'monthlyPcQcCnt' | 'monthlyMobileQcCnt' | 'totalSearchVolume' | 'compIdx'
type SortDir = 'asc' | 'desc'

// 경쟁도 정렬 순서 — 낮음(1) < 중간(2) < 높음(3). 빈 값은 0
const COMP_ORDER: Record<string, number> = { 낮음: 1, 중간: 2, 높음: 3 }

// 키워드 비교용 정규화 — 공백/대소문자 무시
const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()

const formatNumber = (n: number | undefined): string => {
  if (n === undefined || n === null) return '-'
  if (n < 10 && n > 0) return '< 10'
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
}

const getCompBadge = (comp: string | undefined) => {
  if (!comp) return null
  const map: Record<string, string> = {
    낮음: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    중간: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    높음: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return (
    <Badge variant="secondary" className={cn('text-[10px]', map[comp])}>
      {comp}
    </Badge>
  )
}

interface Props {
  /** 표 제목 (예: "내 키워드") */
  title: string
  /** 제목 아래 설명 한 줄 */
  description?: string
  rows: MetricRow[]
  /** 다운로드 파일명 접미사 */
  downloadPrefix: string
  /** '내 키워드' 표는 행 배경을 브랜드 컬러로 강조 */
  highlightRows?: boolean
  /** 표 아래 안내 문구 */
  orderNote?: string
  highlighted: string | null
  onRowClick: (keyword: string) => void
  emptyText?: string
  /** 체크한 키워드를 순위 추적에 등록 — 넘기면 '선택 등록' 버튼이 노출된다 */
  onRegisterSelected?: (keywords: string[]) => void
}

export function KeywordMetricTable({
  title,
  description,
  rows,
  downloadPrefix,
  highlightRows = false,
  orderNote,
  highlighted,
  onRowClick,
  emptyText = '표시할 키워드가 없습니다.',
  onRegisterSelected,
}: Props) {
  const [filterText, setFilterText] = useState('')
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'desc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 화면용: 텍스트 필터 + 정렬 적용 (정렬 미지정이면 원본 순서 = 입력 순서 유지)
  const displayedRows = useMemo(() => {
    let list = rows
    if (filterText.trim()) {
      const q = normalize(filterText)
      list = list.filter((r) => normalize(r.keyword).includes(q))
    }
    if (sort.key) {
      const key = sort.key
      const dirMul = sort.dir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        if (key === 'keyword') return a.keyword.localeCompare(b.keyword, 'ko') * dirMul
        if (key === 'compIdx') {
          return ((COMP_ORDER[a.compIdx ?? ''] ?? 0) - (COMP_ORDER[b.compIdx ?? ''] ?? 0)) * dirMul
        }
        return (((a[key] as number) ?? 0) - ((b[key] as number) ?? 0)) * dirMul
      })
    }
    return list
  }, [rows, filterText, sort])

  // 컬럼 헤더 클릭으로 정렬 토글: desc → asc → null(해제, 입력 순서로 복귀)
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
  const allVisibleSelected =
    displayedRows.length > 0 && displayedRows.every((r) => selected.has(r.keyword))
  const someVisibleSelected =
    !allVisibleSelected && displayedRows.some((r) => selected.has(r.keyword))

  const toggleSelectOne = (keyword: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(keyword)) next.delete(keyword)
      else next.add(keyword)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) displayedRows.forEach((r) => next.delete(r.keyword))
      else displayedRows.forEach((r) => next.add(r.keyword))
      return next
    })
  }

  // .xlsx 생성 + AutoFilter 적용 + 다운로드 트리거
  // xlsx 패키지는 동적 import로 초기 번들에서 분리 (다운로드 버튼 클릭 시에만 로드)
  const downloadXlsx = async (target: MetricRow[], suffix: string) => {
    if (target.length === 0) return
    const XLSX = await import('xlsx')
    const headers = ['키워드', 'PC 검색량', '모바일 검색량', '합계', '경쟁도']
    const aoa: (string | number)[][] = [
      headers,
      ...target.map((row) => [
        row.keyword,
        row.monthlyPcQcCnt,
        row.monthlyMobileQcCnt,
        row.totalSearchVolume,
        row.compIdx ?? '',
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // 숫자 셀(B/C/D 컬럼 = PC/모바일/합계)에 천 단위 콤마 포맷 적용
    for (let r = 1; r <= target.length; r++) {
      for (const c of [1, 2, 3]) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n'
          cell.z = '#,##0'
        }
      }
    }
    ws['!autofilter'] = { ref: `A1:E${target.length + 1}` }
    ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `keyword-pro-${suffix}-${today}.xlsx`)
  }

  // 다운로드는 화면 필터/정렬과 무관하게 원본 rows 기준
  const handleDownloadAll = () => void downloadXlsx(rows, downloadPrefix)
  const handleDownloadSelected = () => {
    const target = rows.filter((r) => selected.has(r.keyword))
    void downloadXlsx(target, `${downloadPrefix}-selected-${target.length}`)
  }

  return (
    <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-4">
      {/* 헤더: 제목/카운터 + 필터 검색창 + 다운로드 버튼 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold">{title}</h4>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              총 {rows.length}개{filterText.trim() && ` / 필터 후 ${displayedRows.length}개`}
            </span>
          </div>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="키워드 필터 검색"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          {onRegisterSelected && (
            <Button
              size="sm"
              disabled={selected.size === 0}
              onClick={() => onRegisterSelected(rows.filter((r) => selected.has(r.keyword)).map((r) => r.keyword))}
              title={selected.size === 0 ? '체크박스로 키워드를 먼저 선택해주세요' : `${selected.size}개 순위 추적에 등록`}
            >
              <ListPlus className="h-3.5 w-3.5 mr-1.5" />
              선택 등록 ({selected.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={handleDownloadSelected}
            title={selected.size === 0 ? '체크박스로 키워드를 먼저 선택해주세요' : `${selected.size}개 다운로드`}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            선택 ({selected.size})
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            전체 다운로드
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border max-h-[560px]">
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
              <th className="px-3 py-2 w-12 text-center">#</th>
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
                PC <SortIcon k="monthlyPcQcCnt" />
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSortClick('monthlyMobileQcCnt')}
              >
                모바일 <SortIcon k="monthlyMobileQcCnt" />
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
                  {filterText.trim() ? '필터에 일치하는 키워드가 없습니다.' : emptyText}
                </td>
              </tr>
            ) : (
              displayedRows.map((row, idx) => (
                <tr
                  key={row.keyword}
                  onClick={() => onRowClick(row.keyword)}
                  className={cn(
                    'border-t cursor-pointer hover:bg-muted/30 transition-colors',
                    highlightRows && 'bg-brand-300/20 dark:bg-brand-900/15',
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
                  <td className="px-3 py-2 text-center text-[11px] text-muted-foreground tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.keyword}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.monthlyPcQcCnt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.monthlyMobileQcCnt)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatNumber(row.totalSearchVolume)}
                  </td>
                  <td className="px-3 py-2 text-center">{getCompBadge(row.compIdx) ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {orderNote && <p className="text-[10px] text-muted-foreground">{orderNote}</p>}
    </div>
  )
}

'use client'

import { useState, useMemo, useEffect } from 'react'
import { Keyword } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RankBadge } from './rank-badge'
import { RefreshButton } from './refresh-button'
import { EmptyState } from './empty-state'
import { Trash2, Search, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PAGINATION } from '@/lib/constants'

type Props = {
  keywords: Keyword[]
  onRefreshed: () => void
  onDeleted: () => void
  // 부모가 낙관적 업데이트(즉시 UI 반영) 처리하도록 위임. 미전달 시 폴백 동작
  onArchive?: (id: string) => void | Promise<void>
  // 삭제도 동일 패턴 — 부모 onDelete가 있으면 위임, 없으면 폴백(전체 fetch 새로고침)
  onDelete?: (id: string) => void | Promise<void>
  isGuest?: boolean
}

const DEFAULT_PAGE_SIZE = PAGINATION.KEYWORD_TABLE_PAGE_SIZE
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// 순위에 따른 색상 위계 (blue → emerald → amber → red)
function getRankColor(rank: number | null) {
  if (rank === null) return 'text-muted-foreground'
  if (rank <= 3) return 'bg-brand-300 text-slate-800 dark:bg-brand-900/30 dark:text-slate-300 font-bold'
  if (rank <= 10) return 'bg-brand-300 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-semibold'
  if (rank <= 30) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold'
  return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

// 인라인 SVG 스파크라인 (64x24px, 끝점 dot 강조)
function Sparkline({ data, width = 64, height = 24 }: {
  data: { rank: number; checked_at: string }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <span className="text-xs text-muted-foreground">-</span>

  const ranks = data.map(d => d.rank)
  const min = Math.min(...ranks)
  const max = Math.max(...ranks)
  const range = max - min || 1

  // 순위는 낮을수록 좋으므로: 순위 1위 → y 작음(위쪽), 순위 큰 값 → y 큼(아래쪽)
  const points = ranks.map((r, i) => ({
    x: (i / (ranks.length - 1)) * (width - 4) + 2,
    y: ((r - min) / range) * (height - 6) + 3,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const lastPoint = points[points.length - 1]
  const isImproving = ranks[ranks.length - 1] < ranks[0]
  const isSame = ranks[ranks.length - 1] === ranks[0]
  const color = isSame ? '#94a3b8' : isImproving ? '#E4FD60' : '#ef4444'

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
    </svg>
  )
}

// 태그 인라인 편집 컴포넌트
function EditableTag({ keyword, onUpdated }: { keyword: Keyword; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(keyword.tag || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/keywords/${keyword.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: value }),
      })
      if (res.ok) {
        toast.success('태그가 수정되었습니다')
        onUpdated()
      } else {
        toast.error('태그 수정에 실패했습니다')
      }
    } catch {
      toast.error('태그 수정 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setValue(keyword.tag || '') }
  }

  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="태그 입력"
        className="h-7 w-24 text-xs"
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:opacity-70 transition-opacity"
      title="클릭하여 태그 수정"
    >
      {keyword.tag ? (
        <Badge variant="secondary" className="text-xs">{keyword.tag}</Badge>
      ) : (
        <span className="text-xs text-muted-foreground hover:text-foreground">+ 태그</span>
      )}
    </button>
  )
}

type RankFilter = 'all' | 'top10' | 'top30' | 'unranked'
type SortOption = 'rank' | 'created' | 'change' | 'volume'

const rankFilters: { key: RankFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'top10', label: 'TOP 10' },
  { key: 'top30', label: 'TOP 30' },
  { key: 'unranked', label: '미조회' },
]

const sortOptions: { key: SortOption; label: string }[] = [
  { key: 'rank', label: '순위순' },
  { key: 'created', label: '등록순' },
  { key: 'change', label: '변동순' },
  { key: 'volume', label: '검색량순' },
]

// 키워드 순위 목록 테이블
export function KeywordTable({ keywords, onRefreshed, onDeleted, onArchive, onDelete, isGuest = false }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rankFilter, setRankFilter] = useState<RankFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('rank')
  // 페이지당 표시 행 수 (사용자 선택, localStorage 영구 저장)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('keyword_page_size') : null
    const parsed = saved ? parseInt(saved, 10) : NaN
    if (PAGE_SIZE_OPTIONS.includes(parsed)) setPageSize(parsed)
  }, [])

  function changePageSize(n: number) {
    setPageSize(n)
    setPage(0)
    if (typeof window !== 'undefined') window.localStorage.setItem('keyword_page_size', String(n))
  }
  // 정렬 방향: asc(오름차순) / desc(내림차순). 각 옵션별 기본값 다름
  const defaultDir: Record<SortOption, 'asc' | 'desc'> = {
    rank: 'asc',      // 1위부터
    created: 'desc',  // 최신 등록 먼저
    change: 'desc',   // 상승폭 큰 것 먼저
    volume: 'desc',   // 검색량 많은 것 먼저
  }
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir.rank)

  function handleSortClick(key: SortOption) {
    if (sort === key) {
      // 같은 기준 클릭 시 방향 토글
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      // 다른 기준 클릭 시 해당 기준의 기본 방향으로
      setSort(key)
      setSortDir(defaultDir[key])
    }
    setPage(0)
  }

  // 등록된 태그 목록 자동 추출
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    keywords.forEach((kw) => { if (kw.tag) tags.add(kw.tag) })
    return Array.from(tags).sort()
  }, [keywords])

  // 검색 + 순위 필터
  const filtered = useMemo(() => {
    let result = keywords

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (kw) => kw.keyword.toLowerCase().includes(q) || kw.blog_url.toLowerCase().includes(q)
      )
    }

    if (tagFilter !== 'all') {
      result = result.filter((kw) => kw.tag === tagFilter)
    }

    if (rankFilter === 'top10') {
      result = result.filter((kw) => kw.current_rank !== null && kw.current_rank <= 10)
    } else if (rankFilter === 'top30') {
      result = result.filter((kw) => kw.current_rank !== null && kw.current_rank <= 30)
    } else if (rankFilter === 'unranked') {
      result = result.filter((kw) => kw.current_rank === null)
    }

    result = [...result].sort((a, b) => {
      let diff = 0
      if (sort === 'rank') {
        // rank는 작을수록 좋으므로 asc=1위부터, desc=마지막부터
        const ra = a.current_rank ?? 9999
        const rb = b.current_rank ?? 9999
        diff = ra - rb
      } else if (sort === 'created') {
        diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sort === 'volume') {
        const va = a.monthly_search_volume ?? -1
        const vb = b.monthly_search_volume ?? -1
        diff = va - vb
      } else {
        // change: previous_rank - current_rank (양수=상승)
        const da = a.current_rank !== null && a.previous_rank !== null ? a.previous_rank - a.current_rank : -9999
        const db = b.current_rank !== null && b.previous_rank !== null ? b.previous_rank - b.current_rank : -9999
        diff = da - db
      }
      return sortDir === 'asc' ? diff : -diff
    })

    return result
  }, [keywords, search, rankFilter, tagFilter, sort, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  async function handleDelete(id: string) {
    // 부모가 낙관적 업데이트 처리 (handleOptimisticDelete) — 즉시 행 제거 + 백그라운드 fetch
    if (onDelete) {
      await onDelete(id)
      toast.success('키워드가 삭제되었습니다')
      return
    }
    // 폴백: 콜백 미전달(비회원 등) 시 기존 동작
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    toast.success('키워드가 삭제되었습니다')
    onDeleted()
  }

  // 활성 키워드를 보관(비활성화)로 변경
  // 부모에서 onArchive 콜백 받으면 위임 (낙관적 업데이트 패턴) — 즉시 UI 반영
  // 미전달 시 폴백 — 직접 API 호출 + onRefreshed
  async function handleArchive(id: string) {
    if (onArchive) {
      await onArchive(id)
      return
    }
    // 폴백: 기존 동작 (콜백 미전달 시)
    try {
      const res = await fetch(`/api/keywords/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      if (res.ok) {
        toast.success('보관함으로 이동했습니다')
        onRefreshed()
      } else {
        toast.error('보관 처리에 실패했습니다')
      }
    } catch {
      toast.error('보관 처리 중 오류가 발생했습니다')
    }
  }

  if (keywords.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {/* 검색 + 필터 + 정렬 툴바 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="키워드 또는 URL 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="pl-8 h-9"
            />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block tabular-nums">
            {filtered.length}개 키워드
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 순위 필터 */}
          <div className="flex items-center gap-1">
            {rankFilters.map((f) => (
              <button
                key={f.key}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                  rankFilter === f.key
                    ? 'bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                onClick={() => { setRankFilter(f.key); setPage(0) }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 태그 필터 */}
          {availableTags.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                    tagFilter === 'all'
                      ? 'bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  onClick={() => { setTagFilter('all'); setPage(0) }}
                >
                  전체 태그
                </button>
                {availableTags.map((t) => (
                  <button
                    key={t}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                      tagFilter === t
                        ? 'bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                    onClick={() => { setTagFilter(t); setPage(0) }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* 정렬 */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            {sortOptions.map((s) => {
              const active = sort === s.key
              return (
                <button
                  key={s.key}
                  className={cn(
                    'text-xs px-2 py-1 rounded-lg font-medium transition-colors inline-flex items-center gap-1',
                    active
                      ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  onClick={() => handleSortClick(s.key)}
                  title={active ? '클릭하면 방향이 바뀝니다' : undefined}
                >
                  {s.label}
                  {active && (sortDir === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  ))}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 텔레그램 알림 CTA */}
      <div>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
        >
          <span>📱</span>
          폰으로 매일 순위 알림 받기
        </a>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center w-12">#</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">키워드</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 hidden sm:table-cell">태그</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">블로그 URL</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center hidden md:table-cell">월간 검색량</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">순위</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center hidden sm:table-cell">7일 추이</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">변동</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">마지막 조회</TableHead>
              <TableHead className="py-3 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((kw, idx) => (
              <TableRow key={kw.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <TableCell className="py-3.5 text-center text-muted-foreground tabular-nums text-sm">{page * pageSize + idx + 1}</TableCell>
                <TableCell className="font-medium text-card-foreground py-3.5">{kw.keyword}</TableCell>
                <TableCell className="py-3.5 hidden sm:table-cell">
                  <EditableTag keyword={kw} onUpdated={onRefreshed} />
                </TableCell>
                <TableCell className="py-3.5">
                  <a
                    href={kw.blog_url.startsWith('http') ? kw.blog_url : `https://${kw.blog_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                  >
                    {kw.blog_url.replace(/^https?:\/\//, '').slice(0, 30)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </TableCell>
                <TableCell className="text-center py-3.5 hidden md:table-cell">
                  {kw.monthly_search_volume !== null && kw.monthly_search_volume !== undefined ? (
                    <span className="text-sm tabular-nums text-card-foreground">
                      {kw.monthly_search_volume.toLocaleString('ko-KR')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-3.5">
                  {kw.current_rank !== null ? (
                    <span className={cn('inline-flex items-center justify-center h-7 min-w-[2rem] rounded-lg px-2 text-sm tabular-nums', getRankColor(kw.current_rank))}>
                      {kw.current_rank}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                {/* 7일 추이 SVG 스파크라인 */}
                <TableCell className="text-center py-3.5 hidden sm:table-cell">
                  {kw.rank_histories && kw.rank_histories.length >= 2 ? (
                    <Sparkline data={kw.rank_histories} />
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-3.5">
                  <RankBadge current={kw.current_rank} previous={kw.previous_rank} />
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground py-3.5 tabular-nums">
                  {kw.last_checked_at
                    ? new Date(kw.last_checked_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </TableCell>
                <TableCell className="py-3.5">
                  {!isGuest && (
                    <div className="flex gap-0.5 justify-end">
                      <RefreshButton keywordId={kw.id} lastCheckedAt={kw.last_checked_at} onRefreshed={onRefreshed} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(kw.id)}
                        className="h-8 w-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                        aria-label="보관함으로 이동"
                        title="활성 키워드 — 클릭하면 보관함으로 이동"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(kw.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500" aria-label="키워드 삭제">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 + 페이지 크기 선택 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {filtered.length === 0
              ? '0개'
              : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filtered.length)} / ${filtered.length}개`}
          </span>
          <div className="flex items-center gap-1">
            <span className="hidden sm:inline">페이지당</span>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                className={cn(
                  'px-2 py-0.5 rounded-md font-medium transition-colors',
                  pageSize === n
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                onClick={() => changePageSize(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2 font-medium tabular-nums">{page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

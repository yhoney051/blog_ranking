'use client'

import { useState, useMemo } from 'react'
import { Keyword } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RankBadge } from './rank-badge'
import { RefreshButton } from './refresh-button'
import { EmptyState } from './empty-state'
import { Trash2, Search, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PAGINATION } from '@/lib/constants'

type Props = { keywords: Keyword[]; onRefreshed: () => void; onDeleted: () => void }

const PAGE_SIZE = PAGINATION.KEYWORD_TABLE_PAGE_SIZE

// 순위에 따른 색상 위계 (blue → emerald → amber → red)
function getRankColor(rank: number | null) {
  if (rank === null) return 'text-muted-foreground'
  if (rank <= 3) return 'bg-lime-100 text-slate-800 dark:bg-lime-900/30 dark:text-slate-300 font-bold'
  if (rank <= 10) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold'
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

  // 순위는 낮을수록 좋으므로 y축 반전 (낮은 순위 = 높은 위치)
  const points = ranks.map((r, i) => ({
    x: (i / (ranks.length - 1)) * (width - 4) + 2,
    y: ((r - min) / range) * (height - 6) + 3,
  }))
  // 반전: 순위 낮을수록 위쪽
  const invertedPoints = points.map(p => ({ x: p.x, y: height - p.y }))

  const pathD = invertedPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const lastPoint = invertedPoints[invertedPoints.length - 1]
  const isImproving = ranks[ranks.length - 1] < ranks[0]
  const isSame = ranks[ranks.length - 1] === ranks[0]
  const color = isSame ? '#94a3b8' : isImproving ? '#10b981' : '#ef4444'

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
export function KeywordTable({ keywords, onRefreshed, onDeleted }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rankFilter, setRankFilter] = useState<RankFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('rank')

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
      if (sort === 'rank') {
        const ra = a.current_rank ?? 9999
        const rb = b.current_rank ?? 9999
        return ra - rb
      }
      if (sort === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sort === 'volume') {
        const va = a.monthly_search_volume ?? -1
        const vb = b.monthly_search_volume ?? -1
        return vb - va
      }
      const da = a.current_rank !== null && a.previous_rank !== null ? a.previous_rank - a.current_rank : -9999
      const db = b.current_rank !== null && b.previous_rank !== null ? b.previous_rank - b.current_rank : -9999
      return db - da
    })

    return result
  }, [keywords, search, rankFilter, tagFilter, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function handleDelete(id: string) {
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    toast.success('키워드가 삭제되었습니다')
    onDeleted()
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
                    ? 'bg-lime-400/20 text-slate-800 dark:bg-lime-400/15 dark:text-slate-300'
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
                      ? 'bg-lime-400/20 text-slate-800 dark:bg-lime-400/15 dark:text-slate-300'
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
                        ? 'bg-lime-400/20 text-slate-800 dark:bg-lime-400/15 dark:text-slate-300'
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
            {sortOptions.map((s) => (
              <button
                key={s.key}
                className={cn(
                  'text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                  sort === s.key
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50">
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
            {paged.map((kw) => (
              <TableRow key={kw.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
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
                  <div className="flex gap-0.5 justify-end">
                    <RefreshButton keywordId={kw.id} onRefreshed={onRefreshed} />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(kw.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}개
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
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
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

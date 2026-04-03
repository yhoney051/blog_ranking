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
import { LineChart, Line, ResponsiveContainer } from 'recharts'

type Props = { keywords: Keyword[]; onRefreshed: () => void; onDeleted: () => void }

const PAGE_SIZE = 10

// 순위에 따른 뱃지 색상
function getRankColor(rank: number | null) {
  if (rank === null) return 'text-muted-foreground'
  if (rank <= 3) return 'bg-primary/10 text-primary font-bold'
  if (rank <= 10) return 'bg-success/10 text-success font-semibold'
  if (rank <= 30) return 'bg-warning/10 text-warning-foreground font-semibold'
  return 'bg-muted text-muted-foreground'
}

type RankFilter = 'all' | 'top10' | 'top30' | 'unranked'
type SortOption = 'rank' | 'created' | 'change'

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
]

// 키워드 순위 목록 테이블
export function KeywordTable({ keywords, onRefreshed, onDeleted }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rankFilter, setRankFilter] = useState<RankFilter>('all')
  const [sort, setSort] = useState<SortOption>('rank')

  // 검색 + 순위 필터
  const filtered = useMemo(() => {
    let result = keywords

    // 텍스트 검색
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (kw) => kw.keyword.toLowerCase().includes(q) || kw.blog_url.toLowerCase().includes(q)
      )
    }

    // 순위 필터
    if (rankFilter === 'top10') {
      result = result.filter((kw) => kw.current_rank !== null && kw.current_rank <= 10)
    } else if (rankFilter === 'top30') {
      result = result.filter((kw) => kw.current_rank !== null && kw.current_rank <= 30)
    } else if (rankFilter === 'unranked') {
      result = result.filter((kw) => kw.current_rank === null)
    }

    // 정렬
    result = [...result].sort((a, b) => {
      if (sort === 'rank') {
        const ra = a.current_rank ?? 9999
        const rb = b.current_rank ?? 9999
        return ra - rb
      }
      if (sort === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      // 변동순: 순위 상승폭이 큰 순서
      const da = a.current_rank !== null && a.previous_rank !== null ? a.previous_rank - a.current_rank : -9999
      const db = b.current_rank !== null && b.previous_rank !== null ? b.previous_rank - b.current_rank : -9999
      return db - da
    })

    return result
  }, [keywords, search, rankFilter, sort])

  // 페이지네이션
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
          <span className="text-xs text-muted-foreground hidden sm:block">
            {filtered.length}개 키워드
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 순위 필터 */}
          <div className="flex items-center gap-1">
            {rankFilters.map((f) => (
              <Badge
                key={f.key}
                variant={rankFilter === f.key ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs px-2.5 py-0.5 transition-colors',
                  rankFilter === f.key
                    ? ''
                    : 'hover:bg-accent'
                )}
                onClick={() => { setRankFilter(f.key); setPage(0) }}
              >
                {f.label}
              </Badge>
            ))}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* 정렬 */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            {sortOptions.map((s) => (
              <Badge
                key={s.key}
                variant={sort === s.key ? 'secondary' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs px-2 py-0.5 transition-colors',
                  sort === s.key ? '' : 'hover:bg-accent'
                )}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">키워드</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">블로그 URL</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">순위</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center hidden sm:table-cell">추이</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">변동</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center">마지막 조회</TableHead>
              <TableHead className="py-3 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((kw) => (
              <TableRow key={kw.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <TableCell className="font-medium text-card-foreground py-3.5">{kw.keyword}</TableCell>
                <TableCell className="py-3.5">
                  <a
                    href={kw.blog_url.startsWith('http') ? kw.blog_url : `https://${kw.blog_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors truncate max-w-[200px]"
                  >
                    {kw.blog_url.replace(/^https?:\/\//, '').slice(0, 30)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </TableCell>
                <TableCell className="text-center py-3.5">
                  {kw.current_rank !== null ? (
                    <span className={cn('inline-flex items-center justify-center h-7 min-w-[2rem] rounded-md px-2 text-sm', getRankColor(kw.current_rank))}>
                      {kw.current_rank}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                {/* 순위 추이 미니차트 */}
                <TableCell className="text-center py-3.5 hidden sm:table-cell">
                  {kw.rank_histories && kw.rank_histories.length >= 2 ? (
                    <div className="w-20 h-7 mx-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kw.rank_histories.map((h) => ({ value: 100 - h.rank }))}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-3.5">
                  <RankBadge current={kw.current_rank} previous={kw.previous_rank} />
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground py-3.5">
                  {kw.last_checked_at
                    ? new Date(kw.last_checked_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex gap-0.5 justify-end">
                    <RefreshButton keywordId={kw.id} onRefreshed={onRefreshed} />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(kw.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
          <span>
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
            <span className="px-2 font-medium">{page + 1} / {totalPages}</span>
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

'use client'

// 다운그레이드 마법사 — 풀스크린 모달
// 활성 키워드 N개를 사용자가 직접 선택 → 나머지 보관 처리
// /api/billing/cancel/preview 로 정보 fetch → /api/billing/cancel 로 처리

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type ActiveKeyword = {
  id: string
  keyword: string
  blog_url: string
  current_rank: number | null
  previous_rank: number | null
  last_checked_at: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirmed: () => void
}

export function MigrationWizard({ open, onClose, onConfirmed }: Props) {
  const [loading, setLoading] = useState(true)
  const [activeKeywords, setActiveKeywords] = useState<ActiveKeyword[]>([])
  const [newLimit, setNewLimit] = useState(3)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  // 모달 열릴 때 preview API 호출
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelectedIds(new Set())
    setSearch('')
    fetch('/api/billing/cancel/preview')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setActiveKeywords(data.activeKeywords ?? [])
        setNewLimit(data.newLimit ?? 3)
      })
      .catch(() => toast.error('마법사 정보를 불러올 수 없습니다'))
      .finally(() => setLoading(false))
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, submitting, onClose])

  if (!open) return null

  const filtered = activeKeywords.filter(
    (kw) =>
      kw.keyword.toLowerCase().includes(search.toLowerCase()) ||
      kw.blog_url.toLowerCase().includes(search.toLowerCase())
  )

  const willBeArchived = Math.max(0, activeKeywords.length - selectedIds.size)
  const canConfirm = selectedIds.size > 0 && selectedIds.size <= newLimit && !loading

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      if (next.size >= newLimit) {
        toast.info(`최대 ${newLimit}개까지만 선택 가능합니다`)
        return prev
      }
      next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    if (!canConfirm) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepActiveIds: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('구독 취소가 예약되었습니다', {
          description: '현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다',
        })
        onConfirmed()
        onClose()
      } else {
        toast.error(data.error || '구독 취소에 실패했습니다')
      }
    } catch {
      toast.error('구독 취소 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="무료 플랜 전환 마법사"
    >
      <div className="bg-card w-full h-full sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">무료 플랜으로 전환</h2>
            <p className="text-sm text-muted-foreground mt-1">
              현재 활성 키워드 {activeKeywords.length}개 → 무료는 {newLimit}개까지 활성
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={submitting}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 안내 + 카운터 + 검색 */}
        <div className="px-5 pt-4 pb-3 border-b border-border space-y-3">
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
              <strong>무료에서도 계속 추적할 키워드 {newLimit}개를 골라주세요.</strong>
              <br />
              선택하지 않은 키워드는 <strong>보관</strong>됩니다 (데이터·순위 히스토리는 안전하게 유지, 언제든 다시 활성화 가능).
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {selectedIds.size === newLimit && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
              선택:{' '}
              <span
                className={
                  selectedIds.size === newLimit ? 'text-primary' : 'text-foreground'
                }
              >
                {selectedIds.size}/{newLimit}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">보관 예정: {willBeArchived}개</div>
          </div>

          {activeKeywords.length > 8 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="키워드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          )}
        </div>

        {/* 키워드 목록 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {search ? '검색 결과 없음' : '활성 키워드가 없습니다'}
            </div>
          ) : (
            filtered.map((kw) => {
              const checked = selectedIds.has(kw.id)
              const change =
                kw.current_rank !== null && kw.previous_rank !== null
                  ? kw.previous_rank - kw.current_rank
                  : null
              return (
                <label
                  key={kw.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                    checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(kw.id)}
                    className="h-4 w-4 rounded border-border accent-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{kw.keyword}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {kw.blog_url.replace(/^https?:\/\//, '').slice(0, 40)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {kw.current_rank !== null ? (
                      <>
                        <div className="text-sm font-bold tabular-nums">{kw.current_rank}위</div>
                        {change !== null && change !== 0 && (
                          <div
                            className={`text-xs tabular-nums ${
                              change > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            }`}
                          >
                            {change > 0 ? '↑' : '↓'} {Math.abs(change)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">미조회</div>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-border p-5 flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto sm:flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="w-full sm:w-auto sm:flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                처리 중
              </>
            ) : selectedIds.size === 0 ? (
              `${newLimit}개를 선택해주세요`
            ) : (
              `${selectedIds.size}개 선택 후 전환`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

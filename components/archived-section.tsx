'use client'

// 보관 키워드 섹션 — 접힘/펼침 가능
// 체크박스로 N개 선택 → 한 번에 일괄 활성화 (POST /api/keywords/bulk-activate)
// 한도 초과로 더 이상 체크 불가 시 흔들림 + Toast (업그레이드 CTA)

import { useState, forwardRef } from 'react'
import { Keyword } from '@/types'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Archive, Star, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Props = {
  archivedKeywords: Keyword[]
  activeCount: number
  keywordLimit: number
  onActivated: () => void
}

export const ArchivedSection = forwardRef<HTMLDivElement, Props>(function ArchivedSection(
  { archivedKeywords, activeCount, keywordLimit, onActivated },
  ref
) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActivating, setBulkActivating] = useState(false)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const router = useRouter()

  if (archivedKeywords.length === 0) return null

  const slotsAvailable = Math.max(0, keywordLimit - activeCount)

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      // 새로 체크하려는데 한도 초과
      if (next.size >= slotsAvailable) {
        // 흔들림 + 토스트
        setShakeId(id)
        setTimeout(() => setShakeId(null), 500)
        toast.error(
          slotsAvailable === 0
            ? '활성 키워드 한도에 도달했어요'
            : `최대 ${slotsAvailable}개까지만 선택 가능해요`,
          {
            description: '다른 키워드를 비활성화하거나 플랜을 업그레이드하세요',
            action: {
              label: '업그레이드',
              onClick: () => router.push('/dashboard/billing'),
            },
          }
        )
        return prev
      }
      next.add(id)
      return next
    })
  }

  // 전체 선택 토글 — 한도(slotsAvailable)까지만 자동 체크.
  // 이미 한도까지 또는 전부 체크된 상태면 해제로 동작.
  function handleSelectAll() {
    const cap = Math.min(slotsAvailable, archivedKeywords.length)
    // 이미 가능한 최대치만큼 체크되어 있으면 → 해제
    if (selectedIds.size >= cap && cap > 0) {
      setSelectedIds(new Set())
      return
    }
    // 위에서부터 cap개 자동 체크
    const ids = archivedKeywords.slice(0, cap).map((k) => k.id)
    setSelectedIds(new Set(ids))

    // 보관함 개수가 한도보다 많아 일부만 선택된 경우 안내
    if (cap < archivedKeywords.length) {
      toast.info(`${archivedKeywords.length}개 중 한도까지 ${cap}개를 선택했어요`, {
        description: '더 추가하려면 다른 키워드를 비활성화하거나 플랜을 업그레이드하세요',
        action: {
          label: '업그레이드',
          onClick: () => router.push('/dashboard/billing'),
        },
      })
    }
  }

  async function handleBulkActivate() {
    if (selectedIds.size === 0 || bulkActivating) return
    setBulkActivating(true)
    try {
      const res = await fetch('/api/keywords/bulk-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (res.ok) {
        const activatedCount = Array.isArray(data.activated) ? data.activated.length : 0
        const skippedCount = Array.isArray(data.skipped) ? data.skipped.length : 0
        if (activatedCount > 0) {
          toast.success(
            skippedCount > 0
              ? `${activatedCount}개 활성화 (${skippedCount}개는 한도 초과로 스킵)`
              : `${activatedCount}개 키워드를 활성화했습니다`
          )
        } else {
          toast.error('활성화된 키워드가 없습니다')
        }
        setSelectedIds(new Set())
        onActivated()
      } else {
        toast.error(data.error || '활성화에 실패했습니다')
      }
    } catch {
      toast.error('활성화 중 오류가 발생했습니다')
    } finally {
      setBulkActivating(false)
    }
  }

  return (
    <div
      ref={ref}
      className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Archive className="h-4 w-4 text-muted-foreground" />
          보관함
          <span className="text-xs text-muted-foreground font-normal">
            ({archivedKeywords.length}개)
          </span>
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-primary">· 선택 {selectedIds.size}</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <div className="flex items-start justify-between gap-2 text-xs">
            <p className="text-muted-foreground flex-1 leading-relaxed">
              보관 키워드는 메인 화면에서 가려져 있어요. 데이터·순위 히스토리는 안전하게 유지됩니다.
              {slotsAvailable > 0 ? (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  최대 {slotsAvailable}개까지 활성화 가능합니다.
                </span>
              ) : (
                <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                  활성 한도({keywordLimit}개) 도달 — 업그레이드하면 모두 자동 활성화됩니다.
                </span>
              )}
            </p>
            {/* 전체 선택 토글 — 슬롯 1개 이상 남아있을 때만 노출.
                이미 가능한 최대치만큼 체크되어 있으면 '선택 해제'로 토글.
                안내 문구 옆에서 묻히지 않도록 박스형 + 굵은 글씨로 강조. */}
            {slotsAvailable > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="shrink-0 h-7 px-2.5 text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              >
                {selectedIds.size >= Math.min(slotsAvailable, archivedKeywords.length) && selectedIds.size > 0
                  ? '선택 해제'
                  : '전체 선택'}
              </Button>
            )}
          </div>

          {/* 보관 키워드 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {archivedKeywords.map((kw) => {
              const checked = selectedIds.has(kw.id)
              return (
                <label
                  key={kw.id}
                  className={cn(
                    'rounded-lg border p-3 flex items-center gap-3 transition-all cursor-pointer select-none',
                    checked
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-200/60 dark:border-slate-700/50 bg-muted/30 hover:bg-muted/50',
                    shakeId === kw.id && 'animate-shake'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(kw.id)}
                    className="h-4 w-4 rounded border-border accent-brand-500 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground truncate">
                        {kw.keyword}
                      </span>
                    </div>
                    <a
                      href={kw.blog_url.startsWith('http') ? kw.blog_url : `https://${kw.blog_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors mt-0.5"
                    >
                      {kw.blog_url.replace(/^https?:\/\//, '').slice(0, 30)}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </label>
              )
            })}
          </div>

          {/* 일괄 활성화 버튼 (선택된 게 있을 때만 활성) */}
          {slotsAvailable > 0 && (
            <Button
              className="w-full h-10 text-sm font-semibold"
              onClick={handleBulkActivate}
              disabled={selectedIds.size === 0 || bulkActivating}
            >
              {bulkActivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  활성화 중...
                </>
              ) : selectedIds.size === 0 ? (
                <>
                  <Star className="h-4 w-4 mr-1.5" />
                  활성화할 키워드를 선택하세요 (최대 {slotsAvailable}개)
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-1.5 fill-current" />
                  선택한 {selectedIds.size}개 활성화
                </>
              )}
            </Button>
          )}

          {/* 한도 도달 시 업그레이드 CTA */}
          {slotsAvailable === 0 && (
            <Button
              className="w-full h-10 text-sm font-semibold"
              onClick={() => router.push('/dashboard/billing')}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              업그레이드하고 보관 키워드 {archivedKeywords.length}개 자동 추적 재개
            </Button>
          )}
        </div>
      )}
    </div>
  )
})

'use client'

// 보관 키워드 섹션 — 접힘/펼침 가능
// 회색 처리된 키워드 목록 + "활성화" 버튼 (한도 초과 시 비활성화)
// 한도 초과 상태에서 활성화 시도하면 흔들림 + Toast (업그레이드 CTA 포함)

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
  const [activating, setActivating] = useState<string | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const router = useRouter()

  if (archivedKeywords.length === 0) return null

  const canActivate = activeCount < keywordLimit

  async function handleActivate(id: string) {
    if (!canActivate) {
      // 한도 초과 — 흔들림 + Toast
      setShakeId(id)
      setTimeout(() => setShakeId(null), 500)
      toast.error('활성 키워드 한도에 도달했어요', {
        description: '다른 키워드를 비활성화하거나 플랜을 업그레이드하세요',
        action: {
          label: '업그레이드',
          onClick: () => router.push('/dashboard/billing'),
        },
      })
      return
    }

    setActivating(id)
    try {
      const res = await fetch(`/api/keywords/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (res.ok) {
        toast.success('키워드가 활성화되었습니다')
        onActivated()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || '활성화에 실패했습니다')
      }
    } catch {
      toast.error('활성화 중 오류가 발생했습니다')
    } finally {
      setActivating(null)
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
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            보관 키워드는 메인 화면에서 가려져 있어요. 데이터·순위 히스토리는 안전하게 유지됩니다.
            {!canActivate && (
              <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                활성 한도({keywordLimit}개) 도달 — 업그레이드하면 모두 자동 활성화됩니다.
              </span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {archivedKeywords.map((kw) => (
              <div
                key={kw.id}
                className={cn(
                  'rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-muted/30 p-3 flex items-center justify-between gap-2 transition-transform',
                  shakeId === kw.id && 'animate-shake'
                )}
              >
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
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors mt-0.5"
                  >
                    {kw.blog_url.replace(/^https?:\/\//, '').slice(0, 30)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <Button
                  size="sm"
                  variant={canActivate ? 'default' : 'outline'}
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleActivate(kw.id)}
                  disabled={activating === kw.id}
                >
                  {activating === kw.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : canActivate ? (
                    <>
                      <Star className="h-3 w-3 mr-1" />
                      활성화
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      잠금 해제
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {!canActivate && (
            <div className="pt-2">
              <Button
                className="w-full h-9 text-sm"
                onClick={() => router.push('/dashboard/billing')}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                업그레이드하고 보관 키워드 {archivedKeywords.length}개 자동 추적 재개
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

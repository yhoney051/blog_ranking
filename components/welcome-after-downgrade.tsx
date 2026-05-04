'use client'

// 다운그레이드 후 첫 대시보드 진입 모달
// localStorage flag로 사용자별 1회만 표시
// 보관 키워드가 있으면 = 다운그레이드 흔적 = 환영 모달

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Archive, Star } from 'lucide-react'

type Props = {
  activeCount: number
  archivedCount: number
  userId: string
}

export function WelcomeAfterDowngrade({ activeCount, archivedCount, userId }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!userId) return
    const flagKey = `welcome_after_downgrade_${userId}`
    const seen = window.localStorage.getItem(flagKey)
    // 보관 키워드가 있고 + 처음 보는 경우만 표시
    if (!seen && archivedCount > 0) {
      // 약간 지연 후 표시 (페이지 로드 완료 후)
      const timer = setTimeout(() => setOpen(true), 400)
      return () => clearTimeout(timer)
    }
  }, [archivedCount, userId])

  function handleClose() {
    if (typeof window === 'undefined') return
    const flagKey = `welcome_after_downgrade_${userId}`
    window.localStorage.setItem(flagKey, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="무료 플랜 전환 환영"
    >
      <div className="bg-card max-w-md w-full rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-brand-300 dark:bg-brand-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-brand-700 dark:text-brand-300" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-1">무료 플랜으로 전환되었어요</h2>
        <p className="text-sm text-muted-foreground text-center mb-5">
          데이터는 안전하게 유지됩니다
        </p>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-semibold">활성 {activeCount}개</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6">매일 자동으로 순위가 추적돼요</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">보관 {archivedCount}개</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
              데이터·순위 히스토리는 안전하게 보관돼요. 다시 업그레이드하시면 자동 추적이 즉시 재개됩니다.
            </p>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full mt-5 h-10">
          확인했어요
        </Button>
      </div>
    </div>
  )
}

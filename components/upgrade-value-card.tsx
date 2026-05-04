'use client'

// 결제 페이지에 조건부 표시 — 보관 키워드가 있으면 잠금해제 가치 강조
// 사용자가 결제 동기 강화

import { Unlock, Sparkles } from 'lucide-react'

type Props = {
  archivedCount: number
}

export function UpgradeValueCard({ archivedCount }: Props) {
  if (archivedCount === 0) return null

  return (
    <div className="rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-yellow-800 dark:text-yellow-200">
        <Sparkles className="h-4 w-4" />
        업그레이드하면 즉시 잠금 해제
      </div>
      <div className="flex items-start gap-2">
        <Unlock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
            보관된 <strong className="font-bold">{archivedCount}개 키워드</strong>의 자동 순위 추적이 즉시 재개됩니다.
          </p>
          <p className="text-xs text-yellow-700/80 dark:text-yellow-300/80 mt-1">
            새 플랜의 한도 안에서 가장 최근 보관된 순으로 자동 활성화돼요.
          </p>
        </div>
      </div>
    </div>
  )
}

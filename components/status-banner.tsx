'use client'

// 활성/보관 키워드 상태 배너
// - 한도 도달(active === limit, archived 0): 정보(파랑) + 업그레이드 CTA
// - 한도 초과(archived > 0): 주의(노랑) + 활성 변경 / 업그레이드 두 CTA
// - 정상(active < limit, archived 0): 표시 안 함 (null 반환)

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Info, AlertTriangle, Sparkles } from 'lucide-react'

type Props = {
  activeCount: number
  archivedCount: number
  keywordLimit: number
  plan: string
  onScrollToArchived?: () => void
}

export function StatusBanner({
  activeCount,
  archivedCount,
  keywordLimit,
  plan,
  onScrollToArchived,
}: Props) {
  const router = useRouter()
  const atLimit = activeCount >= keywordLimit
  const overLimit = archivedCount > 0

  // 정상 상태(여유 있음, 보관 0개) → 표시 안 함
  if (!atLimit && !overLimit) return null

  // 한도 초과(보관 키워드 있음) — 가장 강한 CTA 노란 배너
  if (overLimit) {
    return (
      <div
        role="status"
        className="rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-yellow-800 dark:text-yellow-200">
            보관된 키워드 {archivedCount}개
          </span>
          <span className="text-yellow-700 dark:text-yellow-300">
            {' '}— 자동 순위 체크가 멈췄어요. 플랜을 업그레이드하면 모두 다시 추적됩니다.
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onScrollToArchived && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs flex-1 sm:flex-none border-yellow-400"
              onClick={onScrollToArchived}
            >
              보관함 보기
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={() => router.push('/dashboard/billing')}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            업그레이드
          </Button>
        </div>
      </div>
    )
  }

  // 한도 도달 (active === limit, archived 0) — 정보 배너
  return (
    <div
      role="status"
      className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-semibold text-blue-800 dark:text-blue-200">
          활성 키워드 한도 도달 ({activeCount}/{keywordLimit})
        </span>
        <span className="text-blue-700 dark:text-blue-300">
          {plan === 'free'
            ? ' — 더 많은 키워드를 추적하려면 업그레이드하세요.'
            : ' — 더 많은 키워드를 추적하려면 상위 플랜으로 업그레이드하세요.'}
        </span>
      </div>
      <Button
        size="sm"
        className="h-8 text-xs w-full sm:w-auto"
        onClick={() => router.push('/dashboard/billing')}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1" />
        업그레이드
      </Button>
    </div>
  )
}

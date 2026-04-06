import { RankDelta } from '@/types'
import { cn } from '@/lib/utils'

// 순위 변동(▲▼) 표시 뱃지
function getRankDelta(current: number | null, previous: number | null): RankDelta {
  if (current === null) return 'new'
  if (previous === null) return 'new'
  if (current < previous) return 'up'
  if (current > previous) return 'down'
  return 'same'
}

type Props = { current: number | null; previous: number | null }

export function RankBadge({ current, previous }: Props) {
  const delta = getRankDelta(current, previous)
  const diff = previous !== null && current !== null ? Math.abs(previous - current) : 0

  const styles = {
    new: 'bg-lime-100 text-lime-500 dark:bg-lime-900/30 dark:text-lime-400',
    up: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    down: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    same: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  }

  const labels = {
    new: 'NEW',
    up: `▲ ${diff}`,
    down: `▼ ${diff}`,
    same: '-',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
        styles[delta]
      )}
    >
      {labels[delta]}
    </span>
  )
}

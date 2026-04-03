import { RankDelta } from '@/types'
import { ChevronUp, ChevronDown, Minus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// 순위 변동(▲▼) 표시 뱃지
function getRankDelta(current: number | null, previous: number | null): RankDelta {
  if (current === null) return 'new'
  if (previous === null) return 'new'
  if (current < previous) return 'up'    // 숫자 작을수록 순위 높음
  if (current > previous) return 'down'
  return 'same'
}

type Props = { current: number | null; previous: number | null }

export function RankBadge({ current, previous }: Props) {
  const delta = getRankDelta(current, previous)
  const diff = previous !== null && current !== null ? Math.abs(previous - current) : 0

  const styles = {
    new: 'bg-primary/10 text-primary border-primary/20',
    up: 'bg-success/10 text-success border-success/20',
    down: 'bg-destructive/10 text-destructive border-destructive/20',
    same: 'bg-muted text-muted-foreground border-border',
  }

  const icons = {
    new: <Sparkles className="h-3 w-3" />,
    up: <ChevronUp className="h-3 w-3" />,
    down: <ChevronDown className="h-3 w-3" />,
    same: <Minus className="h-3 w-3" />,
  }

  const labels = {
    new: 'NEW',
    up: `${diff}`,
    down: `${diff}`,
    same: '0',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
        styles[delta]
      )}
    >
      {icons[delta]}
      {labels[delta]}
    </span>
  )
}

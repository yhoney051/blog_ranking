// InlineSegment 배열을 서식 적용된 <span>들로 렌더링
import type { InlineSegment } from '@/types/formatter'
import { cn } from '@/lib/utils'

interface InlineTextProps {
  segments: InlineSegment[]
}

export function InlineText({ segments }: InlineTextProps) {
  return (
    <>
      {segments.map((seg, i) => {
        const className = cn(
          seg.bold && 'font-bold',
          seg.italic && 'italic',
          seg.underline && 'underline',
          seg.strike && 'line-through',
        )
        // color/highlight는 동적 값이라 인라인 style 사용
        const style: React.CSSProperties = {}
        if (seg.color) style.color = seg.color
        if (seg.highlight) style.backgroundColor = seg.highlight

        return (
          <span key={i} className={className || undefined} style={Object.keys(style).length ? style : undefined}>
            {seg.text}
          </span>
        )
      })}
    </>
  )
}

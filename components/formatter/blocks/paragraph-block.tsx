// 본문 문단 블록 렌더러 — InlineSegment + 정렬 지원
import type { InlineSegment, TextAlign } from '@/types/formatter'
import { InlineText } from '@/components/formatter/inline-text'
import { cn } from '@/lib/utils'

interface ParagraphBlockProps {
  content: InlineSegment[]
  align?: TextAlign
}

const alignClass: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function ParagraphBlock({ content, align = 'left' }: ParagraphBlockProps) {
  return (
    <div className={cn('py-6', alignClass[align])}>
      <p className="text-[15px] leading-loose text-foreground whitespace-pre-wrap">
        <InlineText segments={content} />
      </p>
    </div>
  )
}

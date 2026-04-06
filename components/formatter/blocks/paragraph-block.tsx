// 본문 문단 블록 렌더러 — InlineSegment 지원
import type { InlineSegment } from '@/types/formatter'
import { InlineText } from '@/components/formatter/inline-text'

interface ParagraphBlockProps {
  content: InlineSegment[]
}

export function ParagraphBlock({ content }: ParagraphBlockProps) {
  return (
    <div className="py-6">
      <p className="text-[15px] leading-loose text-foreground whitespace-pre-wrap">
        <InlineText segments={content} />
      </p>
    </div>
  )
}

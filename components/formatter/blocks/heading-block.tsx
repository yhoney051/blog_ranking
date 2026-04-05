// 제목 블록 렌더러 — 제목1/2/3 + 정렬 지원
import type { InlineSegment, TextAlign } from '@/types/formatter'
import { InlineText } from '@/components/formatter/inline-text'
import { cn } from '@/lib/utils'

interface HeadingBlockProps {
  level: 1 | 2 | 3
  content: InlineSegment[]
  align?: TextAlign
}

const levelStyles: Record<1 | 2 | 3, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-bold',
  3: 'text-lg font-semibold',
}

const alignClass: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function HeadingBlock({ level, content, align = 'left' }: HeadingBlockProps) {
  const Tag = `h${level}` as const
  return (
    <div className={cn('py-2', alignClass[align])}>
      <Tag className={cn(levelStyles[level], 'text-foreground')}>
        <InlineText segments={content} />
      </Tag>
    </div>
  )
}

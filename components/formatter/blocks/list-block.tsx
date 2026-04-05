// 리스트 블록 렌더러 — 번호/글머리 기호
import type { InlineSegment } from '@/types/formatter'
import { InlineText } from '@/components/formatter/inline-text'

interface ListBlockProps {
  style: 'ordered' | 'unordered'
  items: { content: InlineSegment[] }[]
}

export function ListBlock({ style, items }: ListBlockProps) {
  const Tag = style === 'ordered' ? 'ol' : 'ul'
  return (
    <div className="py-2">
      <Tag className={`pl-6 space-y-1.5 text-[15px] leading-relaxed text-foreground ${
        style === 'ordered' ? 'list-decimal' : 'list-disc'
      }`}>
        {items.map((item, i) => (
          <li key={i}>
            <InlineText segments={item.content} />
          </li>
        ))}
      </Tag>
    </div>
  )
}

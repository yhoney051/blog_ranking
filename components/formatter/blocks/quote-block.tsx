// 네이버 블로그 인용구 6종 렌더러 — 실제 네이버 스타일 기반
import type { QuoteVariant, InlineSegment } from '@/types/formatter'
import { InlineText } from '@/components/formatter/inline-text'
import { ToolBadge } from '@/components/formatter/tool-badge'

interface QuoteBlockProps {
  variant: QuoteVariant
  content: InlineSegment[]
  toolName: string
}

export function QuoteBlock({ variant, content, toolName }: QuoteBlockProps) {
  return (
    <div className="relative my-4">
      <ToolBadge toolName={toolName} />

      {/* 라인따옴표: 큰 따옴표 ❝ + 하단 실선 + 소제목용 */}
      {variant === 'quotemark' && (
        <blockquote className="py-6 px-4 border-b border-slate-300 dark:border-slate-600">
          <span className="block text-5xl text-slate-400 dark:text-slate-500 leading-none mb-4 font-serif">&ldquo;</span>
          <div className="pl-2 whitespace-pre-wrap">
            {content.map((seg, i) => (
              <span
                key={i}
                className={seg.bold ? 'block text-xl font-bold text-foreground leading-snug mt-1' : 'text-[15px] leading-relaxed text-foreground'}
                style={seg.color ? { color: seg.color } : undefined}
              >
                {seg.text}
              </span>
            ))}
          </div>
        </blockquote>
      )}

      {/* 버티컬 라인: 왼쪽 굵은 세로선 */}
      {variant === 'vertical-line' && (
        <blockquote className="border-l-[3px] border-slate-700 dark:border-slate-400 pl-4 py-3">
          <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
            <InlineText segments={content} />
          </p>
        </blockquote>
      )}

      {/* 말풍선: 둥근 카드 + 꼬리 */}
      {variant === 'speech-bubble' && (
        <div className="relative">
          <blockquote className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-5">
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
              <InlineText segments={content} />
            </p>
          </blockquote>
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-slate-100 dark:bg-slate-800 rotate-45" />
        </div>
      )}

      {/* 라인&따옴표: 꺾쇠 ┌ ┘ + 가운데 정렬 + 소제목용 */}
      {variant === 'line-quote' && (
        <blockquote className="relative py-8 px-8">
          <span className="absolute top-0 left-4 text-3xl text-slate-700 dark:text-slate-400 font-mono leading-none">&#x250C;</span>
          <div className="text-center whitespace-pre-wrap">
            {content.map((seg, i) => (
              <span
                key={i}
                className={seg.bold ? 'block text-xl font-bold text-foreground leading-snug mt-1' : 'text-[15px] leading-relaxed text-foreground'}
                style={seg.color ? { color: seg.color } : undefined}
              >
                {seg.text}
              </span>
            ))}
          </div>
          <span className="absolute bottom-0 right-4 text-3xl text-slate-700 dark:text-slate-400 font-mono leading-none">&#x2518;</span>
        </blockquote>
      )}

      {/* 포스트잇: 노란 배경, 넓은 패딩 */}
      {variant === 'postit' && (
        <blockquote className="bg-amber-50 dark:bg-amber-900/20 px-8 py-6 rounded-sm">
          <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
            <InlineText segments={content} />
          </p>
        </blockquote>
      )}

      {/* 프레임: 회색 배경 박스 + 약한 border */}
      {variant === 'frame' && (
        <blockquote className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-6 py-5 rounded-md">
          <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
            <InlineText segments={content} />
          </p>
        </blockquote>
      )}
    </div>
  )
}

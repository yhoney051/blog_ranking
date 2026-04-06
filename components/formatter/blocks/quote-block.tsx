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

      {/* 따옴표: 여는/닫는 큰따옴표 가운데 + 텍스트 가운데 정렬 */}
      {variant === 'quotemark' && (
        <blockquote className="py-6 px-4">
          <span className="block text-5xl text-slate-300 dark:text-slate-500 leading-none mb-4 font-serif text-center">&ldquo;</span>
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
          <span className="block text-5xl text-slate-300 dark:text-slate-500 leading-none mt-4 font-serif text-center">&rdquo;</span>
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

      {/* 라인따옴표: 큰따옴표 ❝ + 하단 실선 + 왼쪽 정렬 + 소제목용 */}
      {variant === 'line-quote' && (
        <blockquote className="py-6 px-4 border-b border-slate-300 dark:border-slate-600">
          <span className="block text-5xl text-slate-400 dark:text-slate-500 leading-none mb-4 font-serif">&ldquo;</span>
          <div className="pl-2 whitespace-normal">
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

      {/* 포스트잇: 흰 배경 + 회색 테두리 + 우하단 접힌 모서리 */}
      {variant === 'postit' && (
        <div className="relative">
          <blockquote className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 px-8 py-8 text-center">
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
              <InlineText segments={content} />
            </p>
          </blockquote>
          {/* 접힌 모서리 (dog-ear) */}
          <div className="absolute bottom-0 right-0 w-8 h-8 overflow-hidden">
            <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-t-[32px] border-l-slate-300 dark:border-l-slate-600 border-t-white dark:border-t-slate-900" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[30px] border-t-[30px] border-l-slate-100 dark:border-l-slate-800 border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}

// 포맷 분석 결과 프리뷰 — 모바일 네이버 블로그 스타일
import type { FormatResponse } from '@/types/formatter'
import { ParagraphBlock } from '@/components/formatter/blocks/paragraph-block'
import { QuoteBlock } from '@/components/formatter/blocks/quote-block'
import { Heart, MessageCircle, Share2 } from 'lucide-react'

interface FormatPreviewProps {
  result: FormatResponse
}

export function FormatPreview({ result }: FormatPreviewProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] overflow-hidden h-full flex flex-col">
      {/* 네이버 블로그 상단 바 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-bold text-[#03c75a]">blog</span>
        <div className="flex items-center gap-3 text-slate-400">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">&#9776;</span>
        </div>
      </div>

      {/* 프로필 영역 */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div>
            <p className="text-sm font-medium text-foreground">블로그 작성자</p>
            <p className="text-[11px] text-muted-foreground">방금 전</p>
          </div>
        </div>
      </div>

      {/* 본문 영역 — 모바일 네이버 블로그 너비 */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-[375px] mx-auto px-5 space-y-2">
          {result.blocks.map((block, i) => {
            switch (block.type) {
              case 'paragraph':
                return <ParagraphBlock key={i} content={block.content} />
              case 'quote':
                return <QuoteBlock key={i} variant={block.variant} content={block.content} toolName={block.toolName} />
              default:
                return null
            }
          })}
        </div>
      </div>

      {/* 하단 액션 바 */}
      <div className="flex items-center gap-5 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Heart className="h-4 w-4" />
          <span className="text-xs">0</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">0</span>
        </div>
        <div className="ml-auto text-slate-400">
          <Share2 className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

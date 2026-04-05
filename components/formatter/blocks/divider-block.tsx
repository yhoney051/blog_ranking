// 네이버 블로그 구분선 7종 렌더러
import type { DividerVariant } from '@/types/formatter'
import { ToolBadge } from '@/components/formatter/tool-badge'

interface DividerBlockProps {
  variant: DividerVariant
  toolName: string
}

const symbolMap: Partial<Record<DividerVariant, string>> = {
  diamond: '◇  ◆  ◇',
  star: '✦  ✦  ✦',
  heart: '♡  ♥  ♡',
  wave: '∿∿∿∿∿∿∿∿∿∿',
}

const lineStyles: Partial<Record<DividerVariant, string>> = {
  solid: 'border-t border-slate-300 dark:border-slate-600',
  bold: 'border-t-2 border-slate-400 dark:border-slate-500',
  dotted: 'border-t border-dotted border-slate-300 dark:border-slate-600',
}

export function DividerBlock({ variant, toolName }: DividerBlockProps) {
  const symbol = symbolMap[variant]
  const lineStyle = lineStyles[variant]

  return (
    <div className="relative my-6 py-2">
      <ToolBadge toolName={toolName} />
      {symbol ? (
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 tracking-[0.3em]">
          {symbol}
        </div>
      ) : (
        <hr className={lineStyle} />
      )}
    </div>
  )
}

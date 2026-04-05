// 네이버 에디터 도구명 뱃지 — 블록 상단에 inline 배치
import { Badge } from '@/components/ui/badge'

interface ToolBadgeProps {
  toolName: string
}

export function ToolBadge({ toolName }: ToolBadgeProps) {
  return (
    <div className="flex justify-end mb-1">
      <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0.5">
        {toolName}
      </Badge>
    </div>
  )
}

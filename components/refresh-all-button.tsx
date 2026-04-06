'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type Props = { keywordIds: string[]; onRefreshed: () => void }

// 모든 키워드를 한 번에 순위 조회하는 버튼
export function RefreshAllButton({ keywordIds, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        keywordIds.map((id) =>
          fetch('/api/rank-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
        )
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      toast.success(`${succeeded}/${keywordIds.length}개 키워드 조회 완료`)
      onRefreshed()
    } catch {
      toast.error('순위 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading || keywordIds.length === 0} size="sm" variant="outline" className="border-lime-300 text-lime-700 hover:bg-lime-50 dark:border-lime-700 dark:text-lime-400 dark:hover:bg-lime-900/20">
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? '조회 중...' : '전체 새로고침'}
    </Button>
  )
}

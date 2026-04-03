'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  keywordId: string
  onRefreshed: () => void
}

// 개별 키워드 순위 새로고침 버튼
export function RefreshButton({ keywordId, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/rank-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keywordId }),
      })
      if (!res.ok) throw new Error()
      toast.success('순위를 조회했습니다')
      onRefreshed()
    } catch {
      toast.error('순위 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} disabled={loading} className="h-8 w-8">
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  )
}

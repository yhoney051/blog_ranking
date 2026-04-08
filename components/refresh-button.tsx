'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  keywordId: string
  lastCheckedAt: string | null
  onRefreshed: () => void
}

// 오늘 날짜(KST) 기준으로 이미 조회되었는지 확인
function isCheckedToday(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return false
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const kstChecked = new Date(new Date(lastCheckedAt).getTime() + 9 * 60 * 60 * 1000)
  return kstNow.toISOString().slice(0, 10) === kstChecked.toISOString().slice(0, 10)
}

// 개별 키워드 순위 새로고침 버튼
export function RefreshButton({ keywordId, lastCheckedAt, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    // 오늘 이미 조회된 경우 확인 다이얼로그
    if (isCheckedToday(lastCheckedAt)) {
      if (!window.confirm('오늘 이미 순위가 반영되었습니다. 다시 새로고침 하시겠습니까?')) return
    }

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

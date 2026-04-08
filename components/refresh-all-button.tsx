'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Keyword } from '@/types'

type Props = { keywords: Keyword[]; onRefreshed: () => void }

// 오늘 날짜(KST) 기준으로 이미 조회되었는지 확인
function isCheckedToday(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return false
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const kstChecked = new Date(new Date(lastCheckedAt).getTime() + 9 * 60 * 60 * 1000)
  return kstNow.toISOString().slice(0, 10) === kstChecked.toISOString().slice(0, 10)
}

// 모든 키워드를 한 번에 순위 조회하는 버튼
// 오늘 이미 조회된 키워드가 있으면 확인 후 진행
export function RefreshAllButton({ keywords, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    // 오늘 이미 조회된 키워드 확인
    const alreadyChecked = keywords.filter((kw) => isCheckedToday(kw.last_checked_at))

    if (alreadyChecked.length === keywords.length) {
      // 모든 키워드가 오늘 조회됨
      if (!window.confirm('오늘 이미 모든 키워드의 순위가 반영되었습니다. 전체를 다시 새로고침 하시겠습니까?')) return
    } else if (alreadyChecked.length > 0) {
      // 일부만 오늘 조회됨
      if (!window.confirm(`오늘 이미 순위가 반영된 키워드가 ${alreadyChecked.length}개 있습니다. 전체를 다시 새로고침 하시겠습니까?`)) return
    }

    setLoading(true)
    try {
      const results = await Promise.allSettled(
        keywords.map((kw) =>
          fetch('/api/rank-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: kw.id }),
          })
        )
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      toast.success(`${succeeded}/${keywords.length}개 키워드 조회 완료`)
      onRefreshed()
    } catch {
      toast.error('순위 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading || keywords.length === 0} size="sm">
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? '조회 중...' : '전체 새로고침'}
    </Button>
  )
}

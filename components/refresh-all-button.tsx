'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Keyword } from '@/types'

type Props = { keywords: Keyword[]; onRefreshed: () => void }

// 모든 키워드를 한 번에 순위 조회하는 버튼
// 1시간 이내 조회된 키워드는 자동 스킵하여 Bright Data 비용 절감
export function RefreshAllButton({ keywords, onRefreshed }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    // 1시간 이내 조회된 키워드 필터링
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const staleKeywords = keywords.filter(
      (kw) => !kw.last_checked_at || kw.last_checked_at < oneHourAgo
    )
    const skipped = keywords.length - staleKeywords.length

    if (staleKeywords.length === 0) {
      toast.info('모든 키워드가 최근 1시간 이내 조회되었습니다')
      return
    }

    // 확인 다이얼로그
    const msg = skipped > 0
      ? `${staleKeywords.length}개 키워드를 조회합니다 (${skipped}개는 최근 조회로 스킵). 계속할까요?`
      : `${staleKeywords.length}개 키워드를 조회합니다. 계속할까요?`
    if (!window.confirm(msg)) return

    setLoading(true)
    try {
      const results = await Promise.allSettled(
        staleKeywords.map((kw) =>
          fetch('/api/rank-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: kw.id }),
          })
        )
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      toast.success(`${succeeded}/${staleKeywords.length}개 키워드 조회 완료${skipped > 0 ? ` (${skipped}개 스킵)` : ''}`)
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

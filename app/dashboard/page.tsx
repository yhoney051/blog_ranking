'use client'

import { useCallback, useEffect, useState } from 'react'
import { Keyword } from '@/types'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { KeywordForm } from '@/components/keyword-form'
import { KeywordTable } from '@/components/keyword-table'
import { RefreshAllButton } from '@/components/refresh-all-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// 메인 대시보드 — 인증된 사용자의 키워드 관리
export default function Home() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keywords')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        setError('데이터를 불러오는데 실패했습니다.')
        return
      }
      const data = await res.json()
      setKeywords(Array.isArray(data) ? data : [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])

  return (
    <>
      <Header title="대시보드">
        <RefreshAllButton keywordIds={keywords.map((kw) => kw.id)} onRefreshed={fetchKeywords} />
      </Header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-8 max-w-[1400px] mx-auto">
          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-xl border border-red-200/60 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4 flex items-center justify-between">
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              <Button variant="ghost" size="sm" onClick={fetchKeywords} className="text-red-600 hover:text-red-700 h-7 text-xs">
                재시도
              </Button>
            </div>
          )}

          {/* 통계 카드 */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          ) : (
            <StatsCards keywords={keywords} />
          )}

          {/* 순위 분포 차트 */}
          {!loading && keywords.length > 0 && (
            <OverviewChart keywords={keywords} />
          )}

          {/* 키워드 등록 폼 */}
          <KeywordForm onAdded={fetchKeywords} />

          {/* 순위 테이블 */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <KeywordTable keywords={keywords} onRefreshed={fetchKeywords} onDeleted={fetchKeywords} />
          )}
        </div>
      </main>
    </>
  )
}

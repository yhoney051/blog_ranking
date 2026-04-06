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
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

// 메인 대시보드 — 회원/비회원 모두 접근 가능
export default function Home() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  // localStorage에서 비회원 키워드 로드
  const loadGuestKeywords = useCallback(() => {
    try {
      const stored = localStorage.getItem('guest_keywords')
      if (stored) {
        const parsed = JSON.parse(stored) as Keyword[]
        setKeywords(parsed)
      }
    } catch {
      // localStorage 파싱 실패 시 무시
    }
    setLoading(false)
  }, [])

  // 로그인 사용자: localStorage 키워드 → DB 자동 이전
  const migrateGuestKeywords = useCallback(async () => {
    try {
      const stored = localStorage.getItem('guest_keywords')
      if (!stored) return
      const guestKeywords = JSON.parse(stored) as Keyword[]
      if (guestKeywords.length === 0) return

      for (const kw of guestKeywords) {
        await fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw.keyword, blog_url: kw.blog_url }),
        })
      }
      localStorage.removeItem('guest_keywords')
    } catch {
      // 이전 실패 시 무시 (다음 로그인 시 재시도)
    }
  }, [])

  // 회원용: API에서 키워드 로드
  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keywords')
      if (res.status === 401) {
        // 비회원 — localStorage에서 로드
        setIsLoggedIn(false)
        loadGuestKeywords()
        return
      }
      if (!res.ok) {
        setError('데이터를 불러오는데 실패했습니다.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setKeywords(Array.isArray(data) ? data : [])
      setIsLoggedIn(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [loadGuestKeywords])

  useEffect(() => {
    // 로그인 확인 + 데이터 로드
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        // 비회원 키워드 자동 이전
        await migrateGuestKeywords()
        fetchKeywords()
      } else {
        setIsLoggedIn(false)
        loadGuestKeywords()
      }
    })
  }, [fetchKeywords, loadGuestKeywords, migrateGuestKeywords])

  return (
    <>
      <Header title="대시보드">
        {isLoggedIn && (
          <RefreshAllButton keywordIds={keywords.map((kw) => kw.id)} onRefreshed={fetchKeywords} />
        )}
      </Header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-8 max-w-[1400px] mx-auto">
          {/* 비회원 배너 */}
          {isLoggedIn === false && (
            <div className="rounded-xl border border-lime-200/60 dark:border-lime-800/50 bg-lime-50 dark:bg-lime-900/20 p-4 flex items-center justify-between">
              <span className="text-sm text-slate-800 dark:text-slate-400">
                가입하면 키워드가 영구 저장되고, 매일 자동으로 순위를 추적해요
              </span>
              <Link href="/signup">
                <Button size="sm" className="h-7 text-xs">
                  무료 가입하기
                </Button>
              </Link>
            </div>
          )}

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

          {/* 키워드 등록: 회원은 폼, 비회원은 루트로 이동 */}
          {isLoggedIn ? (
            <KeywordForm onAdded={fetchKeywords} />
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full h-11 rounded-xl text-sm font-medium border-slate-200/60 dark:border-slate-700/50"
            >
              <Plus className="h-4 w-4 mr-1.5 text-emerald-500" />
              키워드 추가하기
            </Button>
          )}

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

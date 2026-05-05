'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyword } from '@/types'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { KeywordForm } from '@/components/keyword-form'
import { KeywordTable } from '@/components/keyword-table'
import { ArchivedSection } from '@/components/archived-section'
import { StatusBanner } from '@/components/status-banner'
import { WelcomeAfterDowngrade } from '@/components/welcome-after-downgrade'
import { RefreshAllButton } from '@/components/refresh-all-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

// 메인 대시보드 — 회원/비회원 모두 접근 가능
// 회원: 활성/보관 키워드 분리 표시 + 상태 배너 + 한도 안내
// 비회원: localStorage 키워드 (가입 유도 배너만)
export default function Home() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  // 회원의 플랜 정보 (한도 검사용)
  const [profilePlan, setProfilePlan] = useState<string>('free')
  const [keywordLimit, setKeywordLimit] = useState<number>(3)
  // 사용자 ID (WelcomeAfterDowngrade의 localStorage flag 키 생성용)
  const [userId, setUserId] = useState<string | null>(null)
  // ref로 관리하여 useCallback 클로저 문제 방지
  const volumeFetchedRef = useRef(false)
  // ArchivedSection 스크롤 타겟
  const archivedRef = useRef<HTMLDivElement>(null)

  // 활성/보관 키워드 분리
  const { activeKeywords, archivedKeywords } = useMemo(() => {
    if (isLoggedIn === false) {
      // 비회원은 localStorage 기반이라 분리 안 함 (모두 활성으로 취급)
      return { activeKeywords: keywords, archivedKeywords: [] as Keyword[] }
    }
    return {
      activeKeywords: keywords.filter((k) => k.is_active !== false),
      archivedKeywords: keywords.filter((k) => k.is_active === false),
    }
  }, [keywords, isLoggedIn])

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

  // 회원의 프로필(plan + keyword_limit) 조회
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        if (typeof data.plan === 'string') setProfilePlan(data.plan)
        if (typeof data.keyword_limit === 'number') setKeywordLimit(data.keyword_limit)
      }
    } catch {
      // 실패 시 default(free, 3) 유지
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
      const kwList: Keyword[] = Array.isArray(data) ? data : []
      setKeywords(kwList)
      setIsLoggedIn(true)

      // 검색량이 없는 키워드 자동 조회 (최초 1회만, 활성 키워드만)
      if (!volumeFetchedRef.current) {
        const noVolume = kwList.filter(
          (kw) => kw.is_active !== false && kw.monthly_search_volume == null
        )
        if (noVolume.length > 0) {
          volumeFetchedRef.current = true
          fetch('/api/search-volume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: noVolume.map((kw) => kw.id) }),
          })
            .then((r) => { if (r.ok) fetchKeywords() })
            .catch(() => {})
        }
      }
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
        setUserId(user.id)
        // 비회원 키워드 자동 이전
        await migrateGuestKeywords()
        // 프로필 + 키워드 동시 fetch
        fetchProfile()
        fetchKeywords()
      } else {
        setIsLoggedIn(false)
        loadGuestKeywords()
      }
    })
  }, [fetchKeywords, fetchProfile, loadGuestKeywords, migrateGuestKeywords])

  const scrollToArchived = useCallback(() => {
    archivedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // 보관 섹션이 닫혀 있으면 클릭 효과를 위해... 일단 스크롤만
  }, [])

  // 활성 → 보관 낙관적 업데이트 — 별 클릭 즉시 UI에 반영, 백엔드는 백그라운드 처리
  // 실패 시 자동 롤백 + 에러 토스트
  const handleOptimisticArchive = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    // 1. 즉시 로컬 state 업데이트 (UI 즉각 반응)
    setKeywords((prev) =>
      prev.map((kw) =>
        kw.id === id ? { ...kw, is_active: false, deactivated_at: now } : kw
      )
    )

    // 2. 백엔드 호출 (백그라운드)
    try {
      const res = await fetch(`/api/keywords/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) {
        // 실패 → 롤백
        setKeywords((prev) =>
          prev.map((kw) =>
            kw.id === id ? { ...kw, is_active: true, deactivated_at: null } : kw
          )
        )
        toast.error('보관 처리에 실패했습니다')
      }
    } catch {
      // 네트워크 오류 → 롤백
      setKeywords((prev) =>
        prev.map((kw) =>
          kw.id === id ? { ...kw, is_active: true, deactivated_at: null } : kw
        )
      )
      toast.error('보관 처리 중 오류가 발생했습니다')
    }
  }, [])

  return (
    <>
      <Header title="대시보드">
        {isLoggedIn && (
          <RefreshAllButton keywords={activeKeywords} onRefreshed={fetchKeywords} />
        )}
      </Header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-8 max-w-[1400px] mx-auto">
          {/* 비회원 배너 */}
          {isLoggedIn === false && (
            <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-300 dark:bg-brand-900 p-4 flex items-center justify-between">
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

          {/* 회원: 활성/보관 상태 배너 */}
          {isLoggedIn === true && !loading && (
            <StatusBanner
              activeCount={activeKeywords.length}
              archivedCount={archivedKeywords.length}
              keywordLimit={keywordLimit}
              plan={profilePlan}
              onScrollToArchived={archivedKeywords.length > 0 ? scrollToArchived : undefined}
            />
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

          {/* 통계 카드 — 활성 키워드 기준 */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          ) : (
            <StatsCards keywords={activeKeywords} />
          )}

          {/* 순위 분포 차트 — 활성 키워드 기준 */}
          {!loading && activeKeywords.length > 0 && (
            <OverviewChart keywords={activeKeywords} />
          )}

          {/* 키워드 등록: 회원은 폼(한도 정보 전달), 비회원은 루트로 이동 */}
          {isLoggedIn ? (
            <KeywordForm
              onAdded={fetchKeywords}
              currentActiveCount={activeKeywords.length}
              keywordLimit={keywordLimit}
            />
          ) : keywords.length >= 3 ? (
            <Button
              onClick={() => router.push('/signup')}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              가입하고 더 추가하기
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full h-11 rounded-xl text-sm font-medium border-slate-200/60 dark:border-slate-700/50"
            >
              <Plus className="h-4 w-4 mr-1.5 text-brand-500" />
              다음
            </Button>
          )}

          {/* 활성 키워드 테이블 */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <KeywordTable
              keywords={activeKeywords}
              onRefreshed={fetchKeywords}
              onDeleted={fetchKeywords}
              onArchive={isLoggedIn ? handleOptimisticArchive : undefined}
              isGuest={isLoggedIn === false}
            />
          )}

          {/* 보관 키워드 섹션 — 회원 + 보관 키워드 있을 때만 */}
          {isLoggedIn === true && !loading && archivedKeywords.length > 0 && (
            <ArchivedSection
              ref={archivedRef}
              archivedKeywords={archivedKeywords}
              activeCount={activeKeywords.length}
              keywordLimit={keywordLimit}
              onActivated={fetchKeywords}
            />
          )}
        </div>
      </main>

      {/* 다운그레이드 후 첫 진입 환영 모달 (보관 키워드가 있을 때만 1회 표시) */}
      {isLoggedIn === true && userId && archivedKeywords.length > 0 && (
        <WelcomeAfterDowngrade
          activeCount={activeKeywords.length}
          archivedCount={archivedKeywords.length}
          userId={userId}
        />
      )}
    </>
  )
}

// 대시보드 로딩 스켈레톤 — 데이터 로드 중 표시
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'

export default function DashboardLoading() {
  return (
    <>
      <Header title="대시보드" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6">
          {/* 통계 카드 스켈레톤 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* 테이블 스켈레톤 */}
          <div className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

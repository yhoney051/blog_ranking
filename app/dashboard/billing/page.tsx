'use client'

// 결제 관리 페이지 — 4티어 플랜 비교 + 업그레이드/다운그레이드 + 결제 이력
// 현재 플랜은 라임 그린으로 강조 표시되어 사용자가 한눈에 식별 가능

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PLANS, PLAN_DISPLAY_ORDER, type PlanType } from '@/lib/billing/constants'
import { Check, Crown, Loader2 } from 'lucide-react'
import type { Subscription, Payment } from '@/types'

const PAID_PLANS: PlanType[] = ['standard', 'pro', 'premium']

export default function BillingPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  const fetchBillingStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setPayments(data.payments)
      }
    } catch {
      toast.error('결제 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingStatus()
  }, [fetchBillingStatus])

  // 현재 플랜 판별 (subscription이 active인 유료 플랜이면 그것, 아니면 free)
  const currentPlan: PlanType =
    subscription?.status === 'active' && PAID_PLANS.includes(subscription.plan as PlanType)
      ? (subscription.plan as PlanType)
      : 'free'
  const isPaid = currentPlan !== 'free'
  const isCancelScheduled = isPaid && !!subscription?.cancel_at_period_end
  const currentPlanConfig = PLANS[currentPlan]

  // 구독 취소 (다운그레이드)
  const handleCancel = async () => {
    if (!confirm('정말 구독을 취소하시겠습니까?\n현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.')) {
      return
    }

    setCanceling(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
        fetchBillingStatus()
      } else {
        toast.error(data.error || '구독 취소에 실패했습니다.')
      }
    } catch {
      toast.error('구독 취소 중 오류가 발생했습니다.')
    } finally {
      setCanceling(false)
    }
  }

  // 결제일 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // 금액 포맷
  const formatPrice = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원'
  }

  // 결제 상태 배지
  const paymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">결제 완료</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      case 'refunded':
        return <Badge variant="secondary">환불</Badge>
      default:
        return <Badge variant="outline">대기</Badge>
    }
  }

  return (
    <>
      <Header title="결제 관리" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
          {/* 현재 플랜 카드 — 한눈에 보이도록 강조 */}
          <Card className={isPaid ? 'border-2 border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    현재 플랜
                    <Badge
                      className={
                        isPaid
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }
                    >
                      {currentPlanConfig.label}
                    </Badge>
                  </CardTitle>
                  <CardDescription>구독 상태와 사용량을 확인합니다</CardDescription>
                </div>
                {isPaid && (
                  <span className="text-xl font-bold">
                    {formatPrice(currentPlanConfig.price)}
                    <span className="text-sm font-normal text-muted-foreground">/월</span>
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">키워드 한도</span>
                    <span className="text-sm font-medium">{currentPlanConfig.keywordLimit}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">자동 순위 체크</span>
                    <span className="text-sm font-medium">
                      {currentPlanConfig.autoCheckCadence === 'daily' ? '매일' : '수동만'}
                    </span>
                  </div>
                  {isPaid && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">다음 결제일</span>
                        <span className="text-sm font-medium">
                          {formatDate(subscription?.current_period_end ?? null)}
                        </span>
                      </div>
                      {isCancelScheduled && (
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          구독 취소가 예약되었습니다. 위 날짜에 무료 플랜으로 전환됩니다.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 플랜 비교 — 4티어 그리드, 현재 플랜 강조 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">플랜 비교</CardTitle>
              <CardDescription>
                현재 사용 중인 플랜은 라임 그린으로 강조 표시됩니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLAN_DISPLAY_ORDER.map((planKey) => {
                  const p = PLANS[planKey]
                  const isThisCurrent = planKey === currentPlan
                  const isThisPaid = planKey !== 'free'
                  const isPopular = planKey === 'pro'

                  return (
                    <div
                      key={planKey}
                      className={`relative rounded-xl border p-4 flex flex-col ${
                        isThisCurrent
                          ? 'border-2 border-primary bg-primary/10 shadow-sm'
                          : 'border-border'
                      }`}
                    >
                      {/* "현재 사용 중" 라벨 */}
                      {isThisCurrent && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
                          ✓ 현재 사용 중
                        </div>
                      )}

                      {/* "인기" 라벨 (Pro 한정, 단 현재 플랜이 아닐 때만) */}
                      {isPopular && !isThisCurrent && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold whitespace-nowrap">
                          🔥 인기
                        </div>
                      )}

                      <h3 className="font-semibold flex items-center gap-1.5 mt-1">
                        {isThisPaid && <Crown className="h-4 w-4 text-yellow-500" />}
                        {p.label}
                      </h3>
                      <p className="text-2xl font-bold mt-2">
                        {p.price === 0 ? '0' : p.price.toLocaleString('ko-KR')}
                        <span className="text-sm font-normal text-muted-foreground">원/월</span>
                      </p>

                      <ul className="space-y-2 text-sm mt-3 flex-1">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-brand-500 shrink-0" />
                          키워드 {p.keywordLimit}개
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-brand-500 shrink-0" />
                          {planKey === 'free' ? '수동 순위 체크' : '매일 자동 순위 체크'}
                        </li>
                        {(planKey === 'pro' || planKey === 'premium') && (
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-brand-500 shrink-0" />
                            우선 고객 지원
                          </li>
                        )}
                      </ul>

                      {/* 액션 버튼 */}
                      <div className="mt-4">
                        {isThisCurrent ? (
                          <Button variant="outline" className="w-full" disabled>
                            현재 플랜
                          </Button>
                        ) : isThisPaid ? (
                          <Button
                            className="w-full"
                            onClick={() => router.push(`/dashboard/billing/checkout?plan=${planKey}`)}
                          >
                            {isPaid ? '플랜 변경' : '업그레이드'}
                          </Button>
                        ) : (
                          // 무료 카드 — 현재 유료 사용자만 다운그레이드 가능
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleCancel}
                            disabled={canceling || !!isCancelScheduled || !isPaid}
                          >
                            {canceling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                처리 중
                              </>
                            ) : isCancelScheduled ? (
                              '취소 예약됨'
                            ) : !isPaid ? (
                              '현재 플랜'
                            ) : (
                              '다운그레이드'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 결제 이력 */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">결제 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatPrice(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.paid_at || payment.created_at)}
                        </p>
                      </div>
                      {paymentStatusBadge(payment.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}

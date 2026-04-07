'use client'

// 결제 관리 페이지 — 플랜 비교, 업그레이드, 구독 취소, 결제 이력

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PLANS } from '@/lib/billing/constants'
import { Check, Crown, Loader2 } from 'lucide-react'
import type { Subscription, Payment } from '@/types'

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
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

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'
  const isCancelScheduled = isPro && subscription?.cancel_at_period_end

  // 업그레이드: 포트원 SDK로 빌링키 발급 → 즉시 구독 활성화
  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const { requestIssueBillingKey } = await import('@/lib/billing/portone-client')

      // 사용자 프로필에서 customerKey 생성 (user_id 기반)
      const profileRes = await fetch('/api/profile')
      if (!profileRes.ok) throw new Error('프로필 조회 실패')
      const profile = await profileRes.json()

      const customerKey = `cust_${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}`
      const customerName = profile.name || profile.email.split('@')[0]

      // 포트원 빌링키 발급 (카드 등록 결제창)
      const billingResult = await requestIssueBillingKey(customerKey, customerName)

      if (!billingResult.success) {
        toast.error(billingResult.error)
        return
      }

      // 빌링키로 구독 활성화 API 호출
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingKey: billingResult.billingKey,
          customerKey,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Pro 플랜이 활성화되었습니다!')
        fetchBillingStatus()
      } else {
        toast.error(data.error || '구독 활성화에 실패했습니다.')
      }
    } catch (err) {
      console.error('[Upgrade] 오류:', err)
      toast.error('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setUpgrading(false)
    }
  }

  // 구독 취소
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
        <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
          {/* 현재 플랜 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">현재 플랜</CardTitle>
              <CardDescription>구독 상태와 사용량을 확인합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">플랜</span>
                    <Badge variant={isPro ? 'default' : 'secondary'}>
                      {isPro ? 'Pro' : '무료'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">키워드 한도</span>
                    <span className="text-sm font-medium">
                      {isPro ? PLANS.pro.keywordLimit : PLANS.free.keywordLimit}개
                    </span>
                  </div>
                  {isPro && (
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

          {/* 플랜 비교 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">플랜 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* 무료 플랜 */}
                <div className={`rounded-lg border p-4 space-y-3 ${!isPro ? 'border-primary bg-primary' : ''}`}>
                  <h3 className="font-semibold">{PLANS.free.label}</h3>
                  <p className="text-2xl font-bold">0<span className="text-sm font-normal text-muted-foreground">원/월</span></p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-500" />
                      키워드 {PLANS.free.keywordLimit}개
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-500" />
                      일 1회 자동 순위 체크
                    </li>
                  </ul>
                  {!isPro ? (
                    <Button variant="outline" className="w-full" disabled>
                      현재 플랜
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCancel}
                      disabled={canceling || !!isCancelScheduled}
                    >
                      {canceling ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />처리 중</>
                      ) : isCancelScheduled ? (
                        '취소 예약됨'
                      ) : (
                        '다운그레이드'
                      )}
                    </Button>
                  )}
                </div>

                {/* Pro 플랜 */}
                <div className={`rounded-lg border p-4 space-y-3 ${isPro ? 'border-primary bg-primary' : ''}`}>
                  <h3 className="font-semibold flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {PLANS.pro.label}
                  </h3>
                  <p className="text-2xl font-bold">
                    {formatPrice(PLANS.pro.price)}
                    <span className="text-sm font-normal text-muted-foreground">/월</span>
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-500" />
                      키워드 {PLANS.pro.keywordLimit}개
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-500" />
                      일 1회 자동 순위 체크
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand-500" />
                      우선 고객 지원
                    </li>
                  </ul>
                  {isPro ? (
                    <Button variant="outline" className="w-full" disabled>
                      현재 플랜
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleUpgrade}
                      disabled={upgrading}
                    >
                      {upgrading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />처리 중</>
                      ) : (
                        '업그레이드'
                      )}
                    </Button>
                  )}
                </div>
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
                    <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
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

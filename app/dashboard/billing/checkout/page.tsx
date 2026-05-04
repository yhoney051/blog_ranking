'use client'

// 결제 확인 페이지
// /dashboard/billing 의 "업그레이드" 버튼이 이 페이지로 라우팅함
// 사용자가 요금제·결제 내역·약관을 확인하고 동의 체크 후 "결제하기" 클릭 시
// PortOne SDK 빌링키 발급 → /api/billing/subscribe → /dashboard/billing 복귀

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PLANS } from '@/lib/billing/constants'
import { Check, Crown, Loader2, ArrowLeft } from 'lucide-react'
import type { Subscription } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // 가입자 가드: 이미 Pro 활성 상태면 메인 결제 페이지로 즉시 리다이렉트
  useEffect(() => {
    let cancelled = false
    const checkSubscription = async () => {
      try {
        const res = await fetch('/api/billing/status')
        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }
        const data = await res.json()
        const sub: Subscription | null = data.subscription
        if (sub && sub.plan === 'pro' && sub.status === 'active') {
          if (!cancelled) {
            toast.info('이미 Pro 플랜에 가입되어 있습니다.')
            router.replace('/dashboard/billing')
          }
          return
        }
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    checkSubscription()
    return () => {
      cancelled = true
    }
  }, [router])

  // 결제하기: 빌링키 발급 → 구독 활성화 → 메인 페이지 복귀
  const handleSubmit = useCallback(async () => {
    if (!agreed || submitting) return
    setSubmitting(true)
    try {
      const { requestIssueBillingKey } = await import('@/lib/billing/portone-client')

      const profileRes = await fetch('/api/profile')
      if (!profileRes.ok) {
        if (profileRes.status === 401) {
          toast.error('로그인이 필요합니다. 다시 로그인해주세요.')
          router.push('/login')
          return
        }
        throw new Error('프로필 조회 실패')
      }
      const profile = await profileRes.json()

      const customerKey = `cust_${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}`
      const customerName = profile.name || profile.email.split('@')[0]

      const billingResult = await requestIssueBillingKey(customerKey, customerName)
      if (!billingResult.success) {
        toast.error(billingResult.error)
        return
      }

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
        router.push('/dashboard/billing')
      } else {
        toast.error(data.error || '구독 활성화에 실패했습니다.')
      }
    } catch (err) {
      console.error('[Checkout] 오류:', err)
      toast.error('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [agreed, submitting, router])

  // 결제일 / 다음 결제 예정일 (오늘 + 1개월)
  const today = new Date()
  const nextBillingDate = new Date(today)
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  const formatDate = (d: Date) =>
    d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <>
        <Header title="결제 확인" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-xl mx-auto">
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="결제 확인" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6 max-w-xl mx-auto">
          {/* 선택한 요금제 — 라임 그린 강조 카드 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">선택한 요금제</h2>
            <div className="rounded-2xl border-2 border-primary bg-primary/10 p-5 space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Crown className="h-4 w-4 text-yellow-500" />
                {PLANS.pro.label}
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {PLANS.pro.price.toLocaleString('ko-KR')}원
                <span className="text-sm font-normal text-muted-foreground"> /월</span>
              </p>
              <ul className="space-y-2 text-sm pt-1">
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
            </div>
          </section>

          {/* 자동/정기결제 — 결제 방법 표시 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">자동/정기결제</h2>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">결제 방법</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                  신용/체크카드
                  <span className="ml-2 text-xs text-muted-foreground">
                    (결제 시 카드 정보를 안전하게 등록합니다)
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 결제 내역 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">결제 내역</h2>
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    월 {PLANS.pro.price.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">결제일</span>
                  <span className="font-medium">{formatDate(today)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">다음 결제 예정일</span>
                  <span className="font-medium">{formatDate(nextBillingDate)}</span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 약관 안내 + 동의 체크박스 */}
          <section className="space-y-3 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              결제 후 유료 제공 사용량을 사용하시는 경우 환불이 불가능합니다.
            </p>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand-500"
              />
              <span>위 내용을 확인하였으며 자동결제에 동의합니다.</span>
            </label>
          </section>

          {/* 결제하기 + 뒤로가기 */}
          <section className="space-y-3 pt-2">
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!agreed || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  결제 진행 중
                </>
              ) : (
                '결제하기'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/dashboard/billing')}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              메인으로 돌아가기
            </Button>
          </section>
        </div>
      </main>
    </>
  )
}

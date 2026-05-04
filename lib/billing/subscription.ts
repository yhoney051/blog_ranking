// 구독 비즈니스 로직
// 구독 활성화, 취소, 갱신, 다운그레이드 처리

import { supabaseServer } from '@/lib/supabase/server'
import { PLANS, type PlanType } from './constants'
import { requestBillingKeyPayment, cancelPayment } from './portone'

type PaidPlan = 'standard' | 'pro' | 'premium'

// 고유 결제 ID 생성 (포트원은 paymentId를 가맹점에서 생성)
function generatePaymentId(userId: string): string {
  return `payment_${userId.slice(0, 8)}_${Date.now()}`
}

// 현재 시점에서 30일 후 날짜
function getNextPeriodEnd(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString()
}

type ActivateResult =
  | { success: true }
  | { success: false; error: string }

// 유료 구독 활성화: 빌링키로 즉시 결제 → DB 업데이트
// 포트원에서는 프론트엔드에서 빌링키를 직접 발급받아서 전달
// plan 파라미터로 standard/pro/premium 중 선택 (기본값 standard)
export async function activateSubscription(
  userId: string,
  billingKey: string,
  customerKey: string,
  plan: PaidPlan = 'standard'
): Promise<ActivateResult> {
  const planConfig = PLANS[plan]
  const paymentId = generatePaymentId(userId)
  const amount = planConfig.price

  // 1. 빌링키로 즉시 결제
  const paymentResult = await requestBillingKeyPayment(
    billingKey,
    paymentId,
    amount,
    `수니 ${planConfig.label} 플랜`,
    customerKey
  )

  if (!paymentResult.success) {
    console.error('[activateSubscription] 결제 실패:', paymentResult.error)
    return { success: false, error: paymentResult.error.message }
  }

  const { paidAt } = paymentResult.data
  const now = new Date().toISOString()
  const periodEnd = getNextPeriodEnd()

  // 2. DB 업데이트 (subscriptions + payments + profiles)
  try {
    // subscriptions upsert
    const { data: subscription, error: subError } = await supabaseServer
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan,
          status: 'active',
          billing_key: billingKey,
          toss_customer_key: customerKey,
          current_period_start: now,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          retry_count: 0,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select('id')
      .single()

    if (subError) throw subError

    // payments insert
    const { error: payError } = await supabaseServer
      .from('payments')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        toss_payment_key: paymentId,
        toss_order_id: paymentId,
        amount,
        status: 'paid',
        paid_at: paidAt,
      })

    if (payError) throw payError

    // profiles 동기화
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({ plan, keyword_limit: planConfig.keywordLimit })
      .eq('id', userId)

    if (profileError) throw profileError

    return { success: true }
  } catch (dbError) {
    // DB 실패 시 결제 환불
    console.error('[activateSubscription] DB 업데이트 실패, 환불 처리:', dbError)
    await cancelPayment(paymentId, 'DB 업데이트 실패로 인한 자동 환불')
    return { success: false, error: '결제는 성공했으나 처리 중 오류가 발생하여 환불되었습니다.' }
  }
}

// 구독 취소 예약 (기간 만료 시 다운그레이드)
export async function cancelSubscription(userId: string): Promise<ActivateResult> {
  const { error } = await supabaseServer
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    console.error('[cancelSubscription] 취소 예약 실패:', error)
    return { success: false, error: '구독 취소에 실패했습니다.' }
  }

  return { success: true }
}

// 갱신 결제 처리 (Cron에서 호출)
export async function processRenewal(subscriptionId: string): Promise<ActivateResult> {
  const { data: sub, error } = await supabaseServer
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()

  if (error || !sub) {
    return { success: false, error: '구독 정보를 찾을 수 없습니다.' }
  }

  if (!sub.billing_key || !sub.toss_customer_key) {
    return { success: false, error: '빌링 정보가 없습니다.' }
  }

  const paymentId = generatePaymentId(sub.user_id)
  const planKey = (sub.plan ?? 'pro') as PlanType
  const planConfig = PLANS[planKey] ?? PLANS.pro
  const amount = planConfig.price

  const paymentResult = await requestBillingKeyPayment(
    sub.billing_key,
    paymentId,
    amount,
    `수니 ${planConfig.label} 플랜 갱신`,
    sub.toss_customer_key
  )

  if (!paymentResult.success) {
    await handlePaymentFailure(subscriptionId)
    return { success: false, error: paymentResult.error.message }
  }

  const { paidAt } = paymentResult.data
  const now = new Date().toISOString()
  const periodEnd = getNextPeriodEnd()

  // 구독 기간 갱신 + 결제 이력 저장 (에러 처리 포함)
  try {
    const { error: updateError } = await supabaseServer
      .from('subscriptions')
      .update({
        current_period_start: now,
        current_period_end: periodEnd,
        retry_count: 0,
        updated_at: now,
      })
      .eq('id', subscriptionId)

    if (updateError) throw updateError

    const { error: payError } = await supabaseServer
      .from('payments')
      .insert({
        user_id: sub.user_id,
        subscription_id: subscriptionId,
        toss_payment_key: paymentId,
        toss_order_id: paymentId,
        amount,
        status: 'paid',
        paid_at: paidAt,
      })

    if (payError) throw payError

    return { success: true }
  } catch (dbError) {
    console.error('[processRenewal] DB 업데이트 실패, 환불 처리:', dbError)
    await cancelPayment(paymentId, '갱신 DB 업데이트 실패로 인한 자동 환불')
    return { success: false, error: '갱신 결제 처리 중 오류가 발생했습니다.' }
  }
}

// 결제 실패 처리: retry_count 증가, 3회 초과 시 구독 정지
export async function handlePaymentFailure(subscriptionId: string): Promise<void> {
  const { data: sub } = await supabaseServer
    .from('subscriptions')
    .select('retry_count, user_id')
    .eq('id', subscriptionId)
    .single()

  if (!sub) return

  const newRetryCount = (sub.retry_count ?? 0) + 1

  if (newRetryCount >= 3) {
    // 3회 실패: 구독 정지 + 다운그레이드
    await supabaseServer
      .from('subscriptions')
      .update({
        status: 'past_due',
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    await downgradeToFree(sub.user_id)
  } else {
    // 재시도 횟수 증가
    await supabaseServer
      .from('subscriptions')
      .update({
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
  }
}

// Free 플랜으로 다운그레이드
export async function downgradeToFree(userId: string): Promise<void> {
  // subscription 상태 변경
  await supabaseServer
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'expired',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  // profiles 동기화
  await supabaseServer
    .from('profiles')
    .update({ plan: 'free', keyword_limit: PLANS.free.keywordLimit })
    .eq('id', userId)
}

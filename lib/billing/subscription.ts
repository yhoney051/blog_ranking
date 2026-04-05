// 구독 비즈니스 로직
// 구독 활성화, 취소, 갱신, 다운그레이드 처리

import { supabaseServer } from '@/lib/supabase/server'
import { PLANS } from './constants'
import { issueBillingKey, requestBillingPayment, cancelPayment } from './toss'

// 고유 주문 ID 생성
function generateOrderId(userId: string): string {
  return `order_${userId.slice(0, 8)}_${Date.now()}`
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

// Pro 구독 활성화: 빌링키 발급 → 즉시 결제 → DB 업데이트
export async function activateSubscription(
  userId: string,
  authKey: string,
  customerKey: string
): Promise<ActivateResult> {
  // 1. 빌링키 발급
  const billingResult = await issueBillingKey(authKey, customerKey)
  if (!billingResult.success) {
    console.error('[activateSubscription] 빌링키 발급 실패:', billingResult.error)
    return { success: false, error: billingResult.error.message }
  }

  const { billingKey } = billingResult.data
  const orderId = generateOrderId(userId)
  const amount = PLANS.pro.price

  // 2. 즉시 결제
  const paymentResult = await requestBillingPayment(
    billingKey,
    customerKey,
    orderId,
    amount,
    `블로그 순위 체커 ${PLANS.pro.label} 플랜`
  )

  if (!paymentResult.success) {
    console.error('[activateSubscription] 결제 실패:', paymentResult.error)
    return { success: false, error: paymentResult.error.message }
  }

  const { paymentKey, approvedAt } = paymentResult.data
  const now = new Date().toISOString()
  const periodEnd = getNextPeriodEnd()

  // 3. DB 업데이트 (subscriptions + payments + profiles)
  try {
    // subscriptions upsert
    const { data: subscription, error: subError } = await supabaseServer
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan: 'pro',
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
        toss_payment_key: paymentKey,
        toss_order_id: orderId,
        amount,
        status: 'paid',
        paid_at: approvedAt,
      })

    if (payError) throw payError

    // profiles 동기화
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({ plan: 'pro', keyword_limit: PLANS.pro.keywordLimit })
      .eq('id', userId)

    if (profileError) throw profileError

    return { success: true }
  } catch (dbError) {
    // DB 실패 시 결제 환불
    console.error('[activateSubscription] DB 업데이트 실패, 환불 처리:', dbError)
    await cancelPayment(paymentKey, 'DB 업데이트 실패로 인한 자동 환불')
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

  const orderId = generateOrderId(sub.user_id)
  const amount = PLANS.pro.price

  const paymentResult = await requestBillingPayment(
    sub.billing_key,
    sub.toss_customer_key,
    orderId,
    amount,
    `블로그 순위 체커 ${PLANS.pro.label} 플랜 갱신`
  )

  if (!paymentResult.success) {
    await handlePaymentFailure(subscriptionId)
    return { success: false, error: paymentResult.error.message }
  }

  const { paymentKey, approvedAt } = paymentResult.data
  const now = new Date().toISOString()
  const periodEnd = getNextPeriodEnd()

  // 구독 기간 갱신
  await supabaseServer
    .from('subscriptions')
    .update({
      current_period_start: now,
      current_period_end: periodEnd,
      retry_count: 0,
      updated_at: now,
    })
    .eq('id', subscriptionId)

  // 결제 이력 저장
  await supabaseServer
    .from('payments')
    .insert({
      user_id: sub.user_id,
      subscription_id: subscriptionId,
      toss_payment_key: paymentKey,
      toss_order_id: orderId,
      amount,
      status: 'paid',
      paid_at: approvedAt,
    })

  return { success: true }
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

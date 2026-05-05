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

  // 영구 grandfather 보너스 한도 조회 (없으면 0)
  // profile에 bonus_keyword_limit 컬럼이 없는 환경(마이그레이션 전)에서는 fallback 0
  const { data: profileBonusData } = await supabaseServer
    .from('profiles')
    .select('bonus_keyword_limit')
    .eq('id', userId)
    .single()
  const bonus = (profileBonusData as { bonus_keyword_limit?: number } | null)?.bonus_keyword_limit ?? 0
  const effectiveKeywordLimit = planConfig.keywordLimit + bonus

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

    // profiles 동기화 (effective limit = plan 한도 + 영구 보너스)
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({ plan, keyword_limit: effectiveKeywordLimit })
      .eq('id', userId)

    if (profileError) throw profileError

    // Auto-restore: 보관 키워드 중 가장 최근 비활성된 것부터 새 한도 안에서 자동 재활성
    // (다운그레이드 후 재가입 시 사용자가 잃었던 키워드 자동 복원)
    const { count: currentActiveCount } = await supabaseServer
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    const slotsAvailable = Math.max(0, effectiveKeywordLimit - (currentActiveCount ?? 0))
    if (slotsAvailable > 0) {
      const { data: archivedKeywords } = await supabaseServer
        .from('keywords')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', false)
        .order('deactivated_at', { ascending: false, nullsFirst: false })
        .limit(slotsAvailable)

      const idsToActivate = (archivedKeywords ?? []).map((k) => k.id)
      if (idsToActivate.length > 0) {
        await supabaseServer
          .from('keywords')
          .update({ is_active: true, deactivated_at: null })
          .in('id', idsToActivate)
      }
    }

    return { success: true }
  } catch (dbError) {
    // DB 실패 시 결제 환불
    console.error('[activateSubscription] DB 업데이트 실패, 환불 처리:', dbError)
    await cancelPayment(paymentId, 'DB 업데이트 실패로 인한 자동 환불')
    return { success: false, error: '결제는 성공했으나 처리 중 오류가 발생하여 환불되었습니다.' }
  }
}

// 구독 취소 예약 (기간 만료 시 다운그레이드)
// 즉시 활성 키워드 보관 처리: keepActiveIds 외 나머지는 is_active=false로 보관
// keepActiveIds 미전송 시 → 가장 최근 created_at 활성 키워드 N개 자동 유지
export async function cancelSubscription(
  userId: string,
  keepActiveIds?: string[]
): Promise<ActivateResult> {
  const now = new Date().toISOString()
  const newLimit = PLANS.free.keywordLimit

  // 1. 활성 키워드 중 유지할 ID 결정
  let idsToKeepActive: string[]
  if (keepActiveIds && keepActiveIds.length > 0) {
    idsToKeepActive = keepActiveIds.slice(0, newLimit)
  } else {
    const { data: recentActive } = await supabaseServer
      .from('keywords')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(newLimit)
    idsToKeepActive = (recentActive ?? []).map((k) => k.id)
  }

  // 2. 활성 키워드 중 keep 외의 것들 보관 처리
  const { data: allActive } = await supabaseServer
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  const idsToArchive = (allActive ?? [])
    .map((k) => k.id)
    .filter((id) => !idsToKeepActive.includes(id))

  if (idsToArchive.length > 0) {
    await supabaseServer
      .from('keywords')
      .update({ is_active: false, deactivated_at: now })
      .in('id', idsToArchive)
  }

  // 3. subscription cancel 예약
  const { error } = await supabaseServer
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: now,
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
// 안전장치: 활성 키워드 한도(free=3) 초과 시 자동 보관 처리
// (cancelSubscription을 거치지 않은 직접 호출 흐름 대비)
export async function downgradeToFree(userId: string): Promise<void> {
  const newLimit = PLANS.free.keywordLimit
  const now = new Date().toISOString()

  // 활성 키워드 한도 초과 시 자동 보관 (가장 최근 created_at 보존, 나머지 보관)
  const { data: allActive } = await supabaseServer
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if ((allActive?.length ?? 0) > newLimit) {
    const idsToArchive = allActive!.slice(newLimit).map((k) => k.id)
    await supabaseServer
      .from('keywords')
      .update({ is_active: false, deactivated_at: now })
      .in('id', idsToArchive)
  }

  // subscription 상태 변경
  await supabaseServer
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'expired',
      cancel_at_period_end: false,
      updated_at: now,
    })
    .eq('user_id', userId)

  // profiles 동기화 — 영구 보너스 보존 (effective = free 한도 + bonus)
  const { data: profileBonusData } = await supabaseServer
    .from('profiles')
    .select('bonus_keyword_limit')
    .eq('id', userId)
    .single()
  const bonus = (profileBonusData as { bonus_keyword_limit?: number } | null)?.bonus_keyword_limit ?? 0

  await supabaseServer
    .from('profiles')
    .update({ plan: 'free', keyword_limit: PLANS.free.keywordLimit + bonus })
    .eq('id', userId)
}

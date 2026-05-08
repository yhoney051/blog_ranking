// GET /api/cron/billing-renewal — 만료된 구독의 갱신/다운그레이드 처리 (Vercel Cron)
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { processRenewal, downgradeToFree } from '@/lib/billing/subscription'
import { recordCronStart, recordCronEnd, notifyAdminCronFailure } from '@/lib/cron-runner'

export async function GET(request: Request) {
  let runId: string | null = null
  // CRON_SECRET 검증 (기존 check-ranks와 동일한 패턴)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[BILLING CRON] CRON_SECRET 환경변수가 설정되지 않았습니다.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  runId = await recordCronStart('billing-renewal')

  try {
    // 만료된 active 구독 조회 (current_period_end <= now)
    const { data: expiredSubs, error } = await supabaseServer
      .from('subscriptions')
      .select('id, user_id, cancel_at_period_end')
      .eq('status', 'active')
      .eq('plan', 'pro')
      .lte('current_period_end', new Date().toISOString())

    if (error) {
      console.error('[BILLING CRON] 조회 실패:', error)
      await recordCronEnd(runId, 'failed', { error: error.message })
      await notifyAdminCronFailure('billing-renewal', error.message)
      return NextResponse.json({ error: '구독 조회 실패' }, { status: 500 })
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      const empty = { message: '처리할 구독이 없습니다.', processed: 0 }
      await recordCronEnd(runId, 'success', { result: empty })
      return NextResponse.json(empty)
    }

    let renewed = 0
    let downgraded = 0
    let failed = 0

    for (const sub of expiredSubs) {
      if (sub.cancel_at_period_end) {
        // 취소 예약된 구독 → 다운그레이드
        await downgradeToFree(sub.user_id)
        downgraded++
      } else {
        // 갱신 결제
        const result = await processRenewal(sub.id)
        if (result.success) {
          renewed++
        } else {
          failed++
        }
      }
    }

    console.log(`[BILLING CRON] 처리 완료: 갱신 ${renewed}, 다운그레이드 ${downgraded}, 실패 ${failed}`)

    const payload = {
      message: '빌링 갱신 처리 완료',
      total: expiredSubs.length,
      renewed,
      downgraded,
      failed,
    }
    await recordCronEnd(runId, 'success', { result: payload })
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[BILLING CRON] 처리 중 오류:', err)
    await recordCronEnd(runId, 'failed', { error: err })
    await notifyAdminCronFailure('billing-renewal', err)
    return NextResponse.json({ error: '처리 중 오류 발생' }, { status: 500 })
  }
}

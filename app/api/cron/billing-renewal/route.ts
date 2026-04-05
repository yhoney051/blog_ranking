// GET /api/cron/billing-renewal — 만료된 구독의 갱신/다운그레이드 처리 (Vercel Cron)
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { processRenewal, downgradeToFree } from '@/lib/billing/subscription'

export async function GET(request: Request) {
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
      return NextResponse.json({ error: '구독 조회 실패' }, { status: 500 })
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      return NextResponse.json({ message: '처리할 구독이 없습니다.', processed: 0 })
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

    return NextResponse.json({
      message: '빌링 갱신 처리 완료',
      total: expiredSubs.length,
      renewed,
      downgraded,
      failed,
    })
  } catch (err) {
    console.error('[BILLING CRON] 처리 중 오류:', err)
    return NextResponse.json({ error: '처리 중 오류 발생' }, { status: 500 })
  }
}

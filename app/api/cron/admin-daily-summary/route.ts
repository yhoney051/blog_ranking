// GET /api/cron/admin-daily-summary — 매일 KST 09시(UTC 0시) 운영자 요약 발송
// 어제 가입/결제/활성 사용자/cron 결과를 1메시지로 합쳐 텔레그램으로 운영자에게만 전송
// vercel.json: { path: '/api/cron/admin-daily-summary', schedule: '0 0 * * *' }

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'
import {
  recordCronStart,
  recordCronEnd,
  notifyAdminCronFailure,
  type CronJobName,
} from '@/lib/cron-runner'

export const maxDuration = 60

// 빌드 시 prerender 시도 차단 — request.headers 사용으로 인한 빌드 단계 false alarm 방지
export const dynamic = 'force-dynamic'

// 어제 KST 자정 ~ 오늘 KST 자정 범위를 ISO 문자열로 반환
function getYesterdayKstRange(): { start: string; end: string; dateLabel: string } {
  const now = new Date()
  // KST 기준 오늘 날짜 추출 (현재 UTC + 9h의 yyyy-mm-dd)
  const kstNow = new Date(now.getTime() + 9 * 3600_000)
  const y = kstNow.getUTCFullYear()
  const m = kstNow.getUTCMonth()
  const d = kstNow.getUTCDate()
  // 오늘 KST 자정을 UTC timestamp로: Date.UTC(y,m,d,0)는 UTC 0시 → KST 9시. -9h가 KST 자정.
  const todayKstMidnightUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600_000)
  const yesterdayKstMidnightUtc = new Date(todayKstMidnightUtc.getTime() - 24 * 3600_000)
  // 어제 날짜 라벨 (yyyy-mm-dd KST)
  const yKst = new Date(yesterdayKstMidnightUtc.getTime() + 9 * 3600_000)
  const dateLabel = `${yKst.getUTCFullYear()}-${String(yKst.getUTCMonth() + 1).padStart(2, '0')}-${String(yKst.getUTCDate()).padStart(2, '0')}`
  return {
    start: yesterdayKstMidnightUtc.toISOString(),
    end: todayKstMidnightUtc.toISOString(),
    dateLabel,
  }
}

export async function GET(request: Request) {
  // CRON_SECRET 검증
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[ADMIN-SUMMARY] CRON_SECRET 미설정')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runId = await recordCronStart('admin-daily-summary')

  try {
    const { start, end, dateLabel } = getYesterdayKstRange()

    // 1. 어제 신규 가입자 수 (profiles.created_at 기준)
    const { count: signupCount } = await supabaseServer
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lt('created_at', end)

    // 2. 어제 결제 건수·매출
    const { data: paidRows } = await supabaseServer
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', start)
      .lt('paid_at', end)
    const paymentCount = paidRows?.length ?? 0
    const totalRevenue = paidRows?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0

    // 3. 현재 활성 키워드 보유 사용자 수 (스냅샷)
    const { data: activeKwRows } = await supabaseServer
      .from('keywords')
      .select('user_id')
      .eq('is_active', true)
      .not('user_id', 'is', null)
    const activeUsers = new Set(activeKwRows?.map((r) => r.user_id) ?? []).size

    // 4. 어제 cron 실행 결과 (last 24h 시작 시각 기준)
    const { data: cronRuns } = await supabaseServer
      .from('cron_runs')
      .select('job_name, status, started_at, error_text')
      .gte('started_at', start)
      .lt('started_at', end)
      .order('started_at', { ascending: false })

    // 핵심 cron이 어제 1회 이상 성공했는지 확인 — 5일 미동작 사고 재발 방지
    const requiredOnce: CronJobName[] = ['check-ranks', 'billing-renewal']
    const missing: string[] = []
    for (const job of requiredOnce) {
      const ok = cronRuns?.some((r) => r.job_name === job && r.status === 'success')
      if (!ok) missing.push(job)
    }
    const sendOk = cronRuns?.filter(
      (r) => r.job_name === 'send-notifications' && r.status === 'success'
    ).length ?? 0
    if (sendOk < 3) missing.push(`send-notifications(${sendOk}/3회)`)

    const failedRuns = cronRuns?.filter((r) => r.status === 'failed') ?? []

    // 메시지 조립
    const lines: string[] = [
      `📊 <b>일일 요약</b> (${dateLabel} KST)`,
      '',
      `🆕 신규 가입: <b>${signupCount ?? 0}명</b>`,
      `💰 결제: <b>${paymentCount}건</b> / ${totalRevenue.toLocaleString('ko-KR')}원`,
      `👥 활성 사용자: <b>${activeUsers}명</b> (활성 키워드 보유)`,
      '',
      `⏰ <b>어제 cron 결과</b>`,
    ]

    if (missing.length === 0 && failedRuns.length === 0) {
      lines.push('✅ 모든 작업 정상')
    } else {
      if (missing.length > 0) {
        lines.push(`🚨 누락: ${missing.map(escapeAdminHtml).join(', ')}`)
      }
      for (const f of failedRuns) {
        lines.push(
          `❌ ${escapeAdminHtml(f.job_name)} — ${escapeAdminHtml((f.error_text ?? '').slice(0, 80))}`
        )
      }
    }

    lines.push('')
    lines.push(`📈 사이트 조회수: vercel.com/analytics`)

    await notifyAdmin(lines.join('\n'))

    const result = {
      dateLabel,
      signupCount: signupCount ?? 0,
      paymentCount,
      totalRevenue,
      activeUsers,
      missingCron: missing,
      failedCron: failedRuns.length,
    }
    await recordCronEnd(runId, 'success', { result })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[ADMIN-SUMMARY] 처리 중 오류:', err)
    await recordCronEnd(runId, 'failed', { error: err })
    await notifyAdminCronFailure('admin-daily-summary', err)
    return NextResponse.json({ error: '요약 발송 중 오류' }, { status: 500 })
  }
}

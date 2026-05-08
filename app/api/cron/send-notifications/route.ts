// GET /api/cron/send-notifications — 매시간 호출되는 알림 발송 (Vercel Cron)
// 현재 KST 시각이 9/12/19 중 하나면 그 시각을 선택한 사용자만 발송, 아니면 즉시 skip.
import { NextResponse } from 'next/server'
import { sendDailyNotifications } from '@/lib/notifications'
import { recordCronStart, recordCronEnd, notifyAdminCronFailure } from '@/lib/cron-runner'

export const maxDuration = 60

// 빌드 시 prerender 시도 차단 — request.headers 사용으로 인한 빌드 단계 false alarm 방지
export const dynamic = 'force-dynamic'

const NOTIFY_HOURS_KST = [9, 12, 19] as const

export async function GET(request: Request) {
  // CRON_SECRET 검증
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET 환경변수가 설정되지 않았습니다.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // KST 현재 시각 → 알림 시각 후보(9/12/19) 매칭 확인
  // 알림 시각이 아닌 경우 cron_runs 기록 안 함 (매시 호출 → 데이터 폭증 방지)
  const kstHour = (new Date().getUTCHours() + 9) % 24
  if (!(NOTIFY_HOURS_KST as readonly number[]).includes(kstHour)) {
    return NextResponse.json({
      skipped: true,
      reason: 'not a notify hour',
      kstHour,
      sent_at: new Date().toISOString(),
    })
  }

  const runId = await recordCronStart('send-notifications')

  try {
    const result = await sendDailyNotifications({ kstHour })
    const payload = {
      ...result,
      kstHour,
      sent_at: new Date().toISOString(),
    }
    await recordCronEnd(runId, 'success', { result: payload })
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[CRON] send-notifications 에러:', err)
    await recordCronEnd(runId, 'failed', { error: err })
    await notifyAdminCronFailure('send-notifications', err)
    return NextResponse.json({ error: '알림 발송 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

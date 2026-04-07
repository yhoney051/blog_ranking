// GET /api/cron/send-notifications — 일일 순위 알림 발송 (Vercel Cron)
// check-ranks 완료 후 30분 뒤(1:30 AM UTC)에 실행
import { NextResponse } from 'next/server'
import { sendDailyNotifications } from '@/lib/notifications'

export const maxDuration = 60

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

  try {
    const result = await sendDailyNotifications()
    return NextResponse.json({
      ...result,
      sent_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[CRON] send-notifications 에러:', err)
    return NextResponse.json({ error: '알림 발송 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

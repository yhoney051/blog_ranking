// 일회성 백필 라우트
// 첫 결제 알림이 누락된 경우, 가장 최근 paid 상태 payments row를 조회해 운영자 텔레그램에 한 번 발송한다.
// 사용 후 이 파일(또는 폴더)을 삭제할 것.
//
// 호출 방법:
//   브라우저: https://your-domain/api/admin/backfill-payment-notify?secret=<CRON_SECRET 값>
//   curl:    curl "https://your-domain/api/admin/backfill-payment-notify?secret=<CRON_SECRET 값>"

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'

export async function GET(request: Request) {
  // 인증: 기존 CRON_SECRET 재사용 (Vercel 환경변수에 이미 존재)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET 환경변수가 설정되지 않았습니다.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const provided =
    url.searchParams.get('secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 가장 최근 paid 결제 1건 조회
  const { data: payment, error: payError } = await supabaseServer
    .from('payments')
    .select('amount, user_id, subscription_id, paid_at, toss_payment_key')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (payError) {
    return NextResponse.json({ error: 'payments 조회 실패', detail: payError.message }, { status: 500 })
  }
  if (!payment) {
    return NextResponse.json({ error: 'paid 상태 payments row가 없습니다.' }, { status: 404 })
  }

  // 이메일/플랜 동시 조회
  const [profileRes, subRes] = await Promise.all([
    supabaseServer.from('profiles').select('email').eq('id', payment.user_id).single(),
    payment.subscription_id
      ? supabaseServer
          .from('subscriptions')
          .select('plan')
          .eq('id', payment.subscription_id)
          .single()
      : Promise.resolve({ data: null as { plan: string } | null }),
  ])

  const email = (profileRes.data as { email?: string } | null)?.email ?? '(이메일 미상)'
  const plan = subRes.data?.plan ?? 'unknown'
  const amount = (payment.amount ?? 0).toLocaleString('ko-KR')
  const paidAt = payment.paid_at ?? '(시각 미상)'

  await notifyAdmin(
    `💰 <b>[백필] 결제 완료</b>\n${escapeAdminHtml(email)} — ${escapeAdminHtml(plan)} ${amount}원\npaid_at: ${escapeAdminHtml(paidAt)}\n\n※ 이 라우트는 일회성이므로 사용 후 삭제하세요.`
  )

  return NextResponse.json({
    success: true,
    payment: {
      email,
      plan,
      amount,
      paid_at: paidAt,
      toss_payment_key: payment.toss_payment_key,
    },
    note: '운영자 텔레그램에 알림 발송 완료. 사용 후 app/api/admin/backfill-payment-notify 폴더를 삭제하세요.',
  })
}

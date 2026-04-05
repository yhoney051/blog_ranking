// 토스페이먼츠 웹훅 수신
// 결제 성공/실패/환불 이벤트를 처리
// 미들웨어 인증을 건너뛰므로 (matcher에서 webhooks 제외) 자체 검증 필요

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventType, data } = body

    console.log('[Webhook] 이벤트 수신:', eventType)

    switch (eventType) {
      // 결제 승인 완료
      case 'PAYMENT_STATUS_CHANGED': {
        if (data?.status === 'DONE' && data?.paymentKey) {
          await supabaseServer
            .from('payments')
            .update({ status: 'paid', paid_at: data.approvedAt })
            .eq('toss_payment_key', data.paymentKey)
        }

        if (data?.status === 'CANCELED' && data?.paymentKey) {
          await supabaseServer
            .from('payments')
            .update({ status: 'refunded' })
            .eq('toss_payment_key', data.paymentKey)
        }
        break
      }

      default:
        console.log('[Webhook] 처리하지 않는 이벤트:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Webhook] 처리 실패:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

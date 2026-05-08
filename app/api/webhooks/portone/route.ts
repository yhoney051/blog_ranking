// 포트원 V2 웹훅 수신
// 결제 성공/취소 이벤트를 처리
// Standard Webhooks 서명 검증 포함 (HMAC-SHA256)

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'
import crypto from 'crypto'

// payments + subscriptions + profiles를 합쳐 운영자에게 한 줄 발송
async function notifyAdminPayment(paymentId: string, type: 'paid' | 'refunded') {
  try {
    const { data: payment } = await supabaseServer
      .from('payments')
      .select('amount, user_id, subscription_id')
      .eq('toss_payment_key', paymentId)
      .single()
    if (!payment) return

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
    const icon = type === 'paid' ? '💰' : '↩️'
    const label = type === 'paid' ? '결제 완료' : '환불 처리'

    await notifyAdmin(
      `${icon} <b>${label}</b>\n${escapeAdminHtml(email)} — ${escapeAdminHtml(plan)} ${amount}원`
    )
  } catch (err) {
    console.error('[ADMIN-NOTIFY] 결제 알림 실패:', err)
  }
}

// 포트원 웹훅 서명 검증
function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  webhookId: string | null,
  webhookTimestamp: string | null
): boolean {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Webhook] PORTONE_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.')
    return false
  }

  if (!signatureHeader || !webhookId || !webhookTimestamp) {
    return false
  }

  // Standard Webhooks: 타임스탬프 검증 (5분 이내)
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(webhookTimestamp, 10)
  if (Math.abs(now - ts) > 300) {
    console.error('[Webhook] 타임스탬프 만료')
    return false
  }

  // HMAC-SHA256 서명 검증
  // secret은 "whsec_" 접두사 제거 후 Base64 디코딩
  const secretBytes = Buffer.from(
    webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret,
    'base64'
  )

  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // 서명 헤더에서 v1 서명 추출 (v1,{base64} 형식)
  const signatures = signatureHeader.split(' ')
  for (const sig of signatures) {
    const [version, value] = sig.split(',')
    if (version === 'v1' && value === expectedSignature) {
      return true
    }
  }

  return false
}

export async function POST(request: Request) {
  try {
    // 원본 body를 문자열로 읽기 (서명 검증에 필요)
    const rawBody = await request.text()

    // 서명 검증
    const isValid = verifyWebhookSignature(
      rawBody,
      request.headers.get('webhook-signature'),
      request.headers.get('webhook-id'),
      request.headers.get('webhook-timestamp')
    )

    if (!isValid) {
      console.error('[Webhook] 서명 검증 실패')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    console.log('[Webhook] 이벤트 수신:', type)

    switch (type) {
      // 결제 완료
      case 'Transaction.Paid': {
        const paymentId = data?.paymentId
        if (paymentId) {
          await supabaseServer
            .from('payments')
            .update({ status: 'paid', paid_at: data.paidAt || new Date().toISOString() })
            .eq('toss_payment_key', paymentId)
          await notifyAdminPayment(paymentId, 'paid')
        }
        break
      }

      // 결제 취소
      case 'Transaction.Cancelled': {
        const paymentId = data?.paymentId
        if (paymentId) {
          await supabaseServer
            .from('payments')
            .update({ status: 'refunded' })
            .eq('toss_payment_key', paymentId)
          await notifyAdminPayment(paymentId, 'refunded')
        }
        break
      }

      default:
        console.log('[Webhook] 처리하지 않는 이벤트:', type)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Webhook] 처리 실패:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

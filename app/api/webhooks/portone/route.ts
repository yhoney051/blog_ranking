// 포트원 V2 웹훅 수신
// 결제 성공/취소 이벤트를 처리
// Standard Webhooks 서명 검증 포함 (HMAC-SHA256)

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'
import crypto from 'crypto'

// 환불(Transaction.Cancelled) 시 운영자에게 한 줄 발송
// 결제 완료(Transaction.Paid) 알림은 lib/billing/subscription.ts의 activateSubscription에서 즉시 발송하므로 여기서는 다루지 않음
async function notifyAdminRefund(paymentId: string) {
  try {
    const { data: payment } = await supabaseServer
      .from('payments')
      .select('amount, user_id, subscription_id')
      .eq('toss_payment_key', paymentId)
      .single()

    // 매칭되는 payments row가 없으면 운영자에게 디버그 알림 (silent fail 방지)
    if (!payment) {
      await notifyAdmin(
        `⚠️ <b>웹훅 매칭 실패</b>\nrefund webhook 도착했으나 payments에서 매칭 없음\npaymentId: ${escapeAdminHtml(paymentId)}`
      )
      return
    }

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

    await notifyAdmin(
      `↩️ <b>환불 처리</b>\n${escapeAdminHtml(email)} — ${escapeAdminHtml(plan)} ${amount}원`
    )
  } catch (err) {
    console.error('[ADMIN-NOTIFY] 환불 알림 실패:', err)
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
      // 알림은 activateSubscription/processRenewal에서 즉시 발송하므로 여기서는 DB 멱등성 update만 수행
      case 'Transaction.Paid': {
        const paymentId = data?.paymentId
        if (paymentId) {
          await supabaseServer
            .from('payments')
            .update({ status: 'paid', paid_at: data.paidAt || new Date().toISOString() })
            .eq('toss_payment_key', paymentId)
        }
        break
      }

      // 결제 취소(환불)
      case 'Transaction.Cancelled': {
        const paymentId = data?.paymentId
        if (paymentId) {
          await supabaseServer
            .from('payments')
            .update({ status: 'refunded' })
            .eq('toss_payment_key', paymentId)
          await notifyAdminRefund(paymentId)
        }
        break
      }

      // 명시적으로 무시할 이벤트 (디버그 알림 노이즈 방지)
      case 'Transaction.Ready':
      case 'Transaction.VirtualAccountIssued':
        console.log('[Webhook] 무시 이벤트:', type)
        break

      // 그 외 처음 보는 이벤트는 운영자에게 디버그 알림 (silent skip 방지)
      default:
        console.log('[Webhook] 처리하지 않는 이벤트:', type)
        await notifyAdmin(
          `⚠️ <b>웹훅 미지원 이벤트</b>\ntype: ${escapeAdminHtml(String(type ?? 'unknown'))}`
        )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Webhook] 처리 실패:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

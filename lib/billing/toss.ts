// 토스페이먼츠 서버 API 클라이언트
// 빌링키 발급, 자동결제, 결제 취소 등 서버 전용 호출

const TOSS_BILLING_URL = 'https://api.tosspayments.com/v1/billing'
const TOSS_PAYMENTS_URL = 'https://api.tosspayments.com/v1/payments'

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) throw new Error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.')
  return `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
}

export type TossError = {
  code: string
  message: string
}

type TossResponse<T> = { success: true; data: T } | { success: false; error: TossError }

// authKey로 빌링키 발급
export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossResponse<{ billingKey: string; card: { number: string; company: string } }>> {
  try {
    const res = await fetch(`${TOSS_BILLING_URL}/authorizations/issue`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey, customerKey }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: { code: data.code, message: data.message } }
    }

    return {
      success: true,
      data: {
        billingKey: data.billingKey,
        card: { number: data.card?.number ?? '', company: data.card?.company ?? '' },
      },
    }
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
  }
}

// 빌링키로 자동 결제 실행
export async function requestBillingPayment(
  billingKey: string,
  customerKey: string,
  orderId: string,
  amount: number,
  orderName: string
): Promise<TossResponse<{ paymentKey: string; approvedAt: string }>> {
  try {
    const res = await fetch(`${TOSS_BILLING_URL}/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        orderId,
        amount,
        orderName,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: { code: data.code, message: data.message } }
    }

    return {
      success: true,
      data: { paymentKey: data.paymentKey, approvedAt: data.approvedAt },
    }
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
  }
}

// 결제 취소 (환불)
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string
): Promise<TossResponse<{ canceledAt: string }>> {
  try {
    const res = await fetch(`${TOSS_PAYMENTS_URL}/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: { code: data.code, message: data.message } }
    }

    return { success: true, data: { canceledAt: data.cancels?.[0]?.canceledAt ?? '' } }
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
  }
}

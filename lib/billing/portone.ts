// 포트원 V2 서버 API 클라이언트
// 빌링키 결제 실행, 결제 취소 등 서버 전용 호출

const PORTONE_API_URL = 'https://api.portone.io'

function getAuthHeader(): string {
  const apiSecret = process.env.PORTONE_API_SECRET
  if (!apiSecret) throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.')
  return `PortOne ${apiSecret}`
}

export type PortOneError = {
  code: string
  message: string
}

type PortOneResponse<T> = { success: true; data: T } | { success: false; error: PortOneError }

// 빌링키로 정기결제 실행
export async function requestBillingKeyPayment(
  billingKey: string,
  paymentId: string,
  amount: number,
  orderName: string,
  customerKey: string
): Promise<PortOneResponse<{ paymentId: string; paidAt: string }>> {
  try {
    const res = await fetch(`${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingKey,
        orderName,
        customer: {
          id: customerKey,
        },
        amount: {
          total: amount,
        },
        currency: 'KRW',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: data.type || 'UNKNOWN_ERROR',
          message: data.message || '결제에 실패했습니다.',
        },
      }
    }

    return {
      success: true,
      data: {
        paymentId: data.payment?.id || paymentId,
        paidAt: data.payment?.paidAt || new Date().toISOString(),
      },
    }
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
  }
}

// 결제 취소 (환불)
export async function cancelPayment(
  paymentId: string,
  cancelReason: string
): Promise<PortOneResponse<{ cancelledAt: string }>> {
  try {
    const res = await fetch(`${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: cancelReason }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: data.type || 'UNKNOWN_ERROR',
          message: data.message || '결제 취소에 실패했습니다.',
        },
      }
    }

    return {
      success: true,
      data: {
        cancelledAt: data.cancellation?.cancelledAt || new Date().toISOString(),
      },
    }
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
  }
}

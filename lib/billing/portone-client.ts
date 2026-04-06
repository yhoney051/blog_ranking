'use client'

// 포트원 V2 프론트엔드 SDK 래퍼
// 빌링키 발급 (카드 등록) 처리
import * as PortOne from '@portone/browser-sdk/v2'

type IssueBillingKeyResult =
  | { success: true; billingKey: string }
  | { success: false; error: string }

// 빌링키 발급 요청 (카드 등록 결제창 표시)
export async function requestIssueBillingKey(
  customerKey: string
): Promise<IssueBillingKeyResult> {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY

  if (!storeId || !channelKey) {
    return { success: false, error: '결제 설정이 올바르지 않습니다.' }
  }

  const response = await PortOne.requestIssueBillingKey({
    storeId,
    channelKey,
    billingKeyMethod: 'CARD',
    customer: {
      customerId: customerKey,
    },
  })

  if (!response || response.code != null) {
    // 사용자가 결제창을 닫았거나 에러 발생
    const errorMessage = response?.message || '빌링키 발급에 실패했습니다.'
    return { success: false, error: errorMessage }
  }

  if (!response.billingKey) {
    return { success: false, error: '빌링키를 받지 못했습니다.' }
  }

  return { success: true, billingKey: response.billingKey }
}

'use client'

// 토스페이먼츠 프론트엔드 SDK 래퍼
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

let tossInstance: Awaited<ReturnType<typeof loadTossPayments>> | null = null

export async function getTossPayments() {
  if (!tossInstance) {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!clientKey) throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.')
    tossInstance = await loadTossPayments(clientKey)
  }
  return tossInstance
}

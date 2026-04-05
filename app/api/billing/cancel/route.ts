// 구독 취소 예약: 현재 결제 기간 만료 시 무료 플랜으로 전환
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/billing/subscription'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const result = await cancelSubscription(userId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    message: '구독 취소가 예약되었습니다. 현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.',
  })
}

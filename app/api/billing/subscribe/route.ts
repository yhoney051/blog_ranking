// 구독 시작: 빌링키 발급 → 즉시 결제 → Pro 플랜 활성화
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase/server'
import { subscribeSchema } from '@/lib/validations'
import { activateSubscription } from '@/lib/billing/subscription'

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 입력값 검증
  const body = await request.json()
  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 이미 Pro 구독 중인지 확인
  const { data: existingSub } = await supabaseServer
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  if (existingSub?.plan === 'pro' && existingSub?.status === 'active') {
    return NextResponse.json(
      { error: '이미 Pro 플랜을 구독 중입니다.', code: 'ALREADY_SUBSCRIBED' },
      { status: 400 }
    )
  }

  // 구독 활성화
  const result = await activateSubscription(userId, parsed.data.authKey, parsed.data.customerKey)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ message: 'Pro 플랜이 활성화되었습니다.' })
}

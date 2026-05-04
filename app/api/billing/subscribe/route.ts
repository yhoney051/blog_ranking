// 구독 시작: 포트원 빌링키로 즉시 결제 → Pro 플랜 활성화
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase/server'
import { subscribeSchema } from '@/lib/validations'
import { activateSubscription } from '@/lib/billing/subscription'

export async function POST(request: Request) {
  try {
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

    // 이미 유료(standard/pro/premium) 구독 중인지 확인
    const { data: existingSub } = await supabaseServer
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()

    if (
      existingSub?.status === 'active' &&
      ['standard', 'pro', 'premium'].includes(existingSub?.plan ?? '')
    ) {
      return NextResponse.json(
        { error: '이미 유료 플랜을 구독 중입니다.', code: 'ALREADY_SUBSCRIBED' },
        { status: 400 }
      )
    }

    // 구독 활성화 (plan: standard | pro | premium)
    const result = await activateSubscription(
      userId,
      parsed.data.billingKey,
      parsed.data.customerKey,
      parsed.data.plan
    )

    if (!result.success) {
      console.error('[POST /api/billing/subscribe] 구독 활성화 실패:', result.error)
      return NextResponse.json({ error: '결제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
    }

    return NextResponse.json({ message: '플랜이 활성화되었습니다.' })
  } catch (err) {
    console.error('[POST /api/billing/subscribe] 예상치 못한 에러:', err)
    return NextResponse.json({ error: '구독 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

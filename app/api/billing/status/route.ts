// 구독 상태 + 최근 결제 이력 조회
import { NextResponse } from 'next/server'
import { getAuthUserId, createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    // 구독 정보 조회 (billing_key 제외)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, toss_customer_key, current_period_start, current_period_end, cancel_at_period_end, retry_count, created_at, updated_at')
      .eq('user_id', userId)
      .single()

    // 최근 결제 이력 5건
    const { data: payments } = await supabase
      .from('payments')
      .select('id, toss_order_id, amount, status, paid_at, failed_reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      subscription: subscription ?? null,
      payments: payments ?? [],
    })
  } catch (err) {
    console.error('[GET /api/billing/status] 예상치 못한 에러:', err)
    return NextResponse.json({ error: '구독 정보 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

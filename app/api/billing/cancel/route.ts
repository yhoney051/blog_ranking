// 구독 취소 예약: 즉시 활성 키워드 보관 처리 + 결제 기간 만료 시 무료 플랜으로 전환
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/billing/subscription'

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // body는 optional. keepActiveIds 미전송 시 가장 최근 활성된 free 한도 N개 자동 유지
    let keepActiveIds: string[] | undefined
    try {
      const body = await request.json()
      if (Array.isArray(body?.keepActiveIds)) {
        keepActiveIds = body.keepActiveIds.filter((id: unknown) => typeof id === 'string')
      }
    } catch {
      // body 없거나 파싱 실패 시 undefined → 자동 결정
    }

    const result = await cancelSubscription(userId, keepActiveIds)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      message: '구독 취소가 예약되었습니다. 현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.',
    })
  } catch (err) {
    console.error('[POST /api/billing/cancel] 예상치 못한 에러:', err)
    return NextResponse.json({ error: '구독 취소 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

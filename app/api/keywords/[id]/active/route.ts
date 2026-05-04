import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'

// PATCH /api/keywords/[id]/active — 키워드 활성/보관 토글
// body: { is_active: boolean }
// 활성화 시 활성 한도 검사, 비활성화는 항상 가능
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const isActive = body?.is_active === true

  const supabase = await createSupabaseServerClient()

  // 활성화 시 한도 검사
  if (isActive) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('keyword_limit')
      .eq('id', userId)
      .single()

    const { count } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (profile && count !== null && count >= profile.keyword_limit) {
      return NextResponse.json(
        {
          error: `활성 키워드 한도(${profile.keyword_limit}개)에 도달했습니다. 다른 키워드를 비활성화하거나 플랜을 업그레이드해주세요.`,
          code: 'ACTIVE_LIMIT_REACHED',
        },
        { status: 403 }
      )
    }
  }

  // 본인 키워드만 토글 가능
  const { error } = await supabase
    .from('keywords')
    .update({
      is_active: isActive,
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('user_id', userId)

  if (error) {
    console.error('[PATCH /api/keywords/[id]/active]', error.message)
    return NextResponse.json({ error: '활성 상태 변경에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, is_active: isActive })
}

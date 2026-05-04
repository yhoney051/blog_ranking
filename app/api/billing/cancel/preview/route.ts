import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'
import { PLANS } from '@/lib/billing/constants'

// GET /api/billing/cancel/preview — 다운그레이드 마법사용 미리보기
// 응답: 현재 활성 키워드 목록 + 다운그레이드 후 무료 한도 + 보관될 개수
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const supabase = await createSupabaseServerClient()

  // 현재 활성 키워드 조회 (마법사에서 사용자가 N개 선택 — 어떤 키워드인지 결정 도움 정보 포함)
  const { data: keywords } = await supabase
    .from('keywords')
    .select('id, keyword, blog_url, current_rank, previous_rank, last_checked_at, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const activeKeywords = keywords ?? []
  const newLimit = PLANS.free.keywordLimit
  const willBeArchived = Math.max(0, activeKeywords.length - newLimit)

  return NextResponse.json({
    activeKeywords,
    currentActiveCount: activeKeywords.length,
    newLimit,
    willBeArchived,
  })
}

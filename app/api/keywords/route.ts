import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'
import { keywordCreateSchema } from '@/lib/validations'

// GET /api/keywords — 로그인한 사용자의 키워드 목록 조회 (최근 7일 순위 히스토리 포함)
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('keywords')
    .select('*, rank_histories(rank, checked_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/keywords]', error.message)
    return NextResponse.json({ error: '키워드 목록 조회에 실패했습니다.' }, { status: 500 })
  }

  // rank_histories를 최근 7개로 제한하고 날짜순 정렬
  const result = (data ?? []).map((kw) => {
    const histories = (kw.rank_histories ?? [])
      .sort((a: { checked_at: string }, b: { checked_at: string }) =>
        new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
      )
      .slice(-7)
    return { ...kw, rank_histories: histories }
  })

  return NextResponse.json(result)
}

// POST /api/keywords — 새 키워드 등록 (user_id 포함)
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const parsed = keywordCreateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // 플랜별 키워드 등록 한도 검사
  const { data: profile } = await supabase
    .from('profiles')
    .select('keyword_limit')
    .eq('id', userId)
    .single()

  const { count } = await supabase
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (profile && count !== null && count >= profile.keyword_limit) {
    return NextResponse.json(
      { error: `키워드 등록 한도(${profile.keyword_limit}개)에 도달했습니다.`, code: 'KEYWORD_LIMIT_REACHED' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('keywords')
    .insert({
      keyword: parsed.data.keyword,
      blog_url: parsed.data.blog_url,
      tag: parsed.data.tag || null,
      user_id: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/keywords]', error.message)
    return NextResponse.json({ error: '키워드 등록에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

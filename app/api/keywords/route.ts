import { NextResponse } from 'next/server'
import { supabaseServer, getAuthUserId } from '@/lib/supabase/server'
import { KeywordFormInput } from '@/types'

// GET /api/keywords — 로그인한 사용자의 키워드 목록 조회 (최근 7일 순위 히스토리 포함)
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data, error } = await supabaseServer
    .from('keywords')
    .select('*, rank_histories(rank, checked_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  const body: KeywordFormInput = await req.json()

  if (!body.keyword || !body.blog_url) {
    return NextResponse.json({ error: '키워드와 URL을 입력해주세요.' }, { status: 400 })
  }

  // 플랜별 키워드 등록 한도 검사
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('keyword_limit')
    .eq('id', userId)
    .single()

  const { count } = await supabaseServer
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (profile && count !== null && count >= profile.keyword_limit) {
    return NextResponse.json(
      { error: `키워드 등록 한도(${profile.keyword_limit}개)에 도달했습니다.`, code: 'KEYWORD_LIMIT_REACHED' },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseServer
    .from('keywords')
    .insert({ keyword: body.keyword, blog_url: body.blog_url, user_id: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

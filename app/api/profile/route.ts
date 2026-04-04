import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'

// GET /api/profile — 로그인 사용자의 프로필 정보 반환
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, plan, keyword_limit, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[GET /api/profile]', error.message)
    return NextResponse.json({ error: '프로필 조회에 실패했습니다.' }, { status: 500 })
  }

  // 현재 키워드 사용량도 함께 반환
  const { count } = await supabase
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return NextResponse.json({ ...data, keyword_count: count ?? 0 })
}

import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'

// DELETE /api/keywords/[id] — 본인 키워드만 삭제 (연결된 rank_histories도 cascade 삭제)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('keywords')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId)

  if (error) {
    console.error('[DELETE /api/keywords]', error.message)
    return NextResponse.json({ error: '키워드 삭제에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

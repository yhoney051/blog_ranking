import { NextResponse } from 'next/server'
import { supabaseServer, getAuthUserId } from '@/lib/supabase/server'

// DELETE /api/keywords/[id] — 본인 키워드만 삭제 (연결된 rank_histories도 cascade 삭제)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { error } = await supabaseServer
    .from('keywords')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

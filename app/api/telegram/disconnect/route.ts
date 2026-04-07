// POST /api/telegram/disconnect — 텔레그램 연동 해제
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { error } = await supabaseServer
    .from('notification_settings')
    .update({
      telegram_chat_id: null,
      telegram_username: null,
      enabled: false,
      connect_token: null,
      connect_token_expires_at: null,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[TELEGRAM] 연동 해제 실패:', error.message)
    return NextResponse.json({ error: '연동 해제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

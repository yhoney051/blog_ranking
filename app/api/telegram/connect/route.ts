// POST /api/telegram/connect — 텔레그램 연동용 딥링크 생성
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase/server'
import { TELEGRAM } from '@/lib/constants'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME
  if (!botUsername) {
    return NextResponse.json({ error: '텔레그램 봇이 설정되지 않았습니다.' }, { status: 500 })
  }

  // 연동 토큰 생성 (5분 유효)
  const connectToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + TELEGRAM.CONNECT_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabaseServer
    .from('notification_settings')
    .upsert(
      {
        user_id: userId,
        connect_token: connectToken,
        connect_token_expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[TELEGRAM] 연동 토큰 생성 실패:', error.message)
    return NextResponse.json({ error: '연동 토큰 생성에 실패했습니다.' }, { status: 500 })
  }

  // 텔레그램 딥링크 URL 반환
  const deepLink = `https://t.me/${botUsername}?start=${connectToken}`
  return NextResponse.json({ url: deepLink })
}

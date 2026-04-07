// POST /api/telegram/webhook — 텔레그램 봇 업데이트 수신
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(request: Request) {
  // 웹훅 시크릿 검증
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const update = await request.json()
    const message = update.message

    // 메시지가 없으면 무시
    if (!message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const username = message.from?.username || null
    const text = message.text.trim()

    // /start 명령 처리 (딥링크 연동)
    if (text.startsWith('/start')) {
      const token = text.split(' ')[1]

      if (!token) {
        await sendTelegramMessage(chatId, '연동 링크를 통해 다시 시도해주세요.')
        return NextResponse.json({ ok: true })
      }

      // 토큰 검증 및 chat_id 저장
      const now = new Date().toISOString()
      const { data, error } = await supabaseServer
        .from('notification_settings')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          enabled: true,
          connect_token: null,
          connect_token_expires_at: null,
          updated_at: now,
        })
        .eq('connect_token', token)
        .gt('connect_token_expires_at', now)
        .select('id')

      if (error || !data || data.length === 0) {
        await sendTelegramMessage(
          chatId,
          '연동 토큰이 만료되었거나 유효하지 않습니다.\n설정 페이지에서 다시 시도해주세요.'
        )
        return NextResponse.json({ ok: true })
      }

      await sendTelegramMessage(
        chatId,
        '✅ <b>연동 완료!</b>\n\n매일 아침 순위 변동 리포트를 이 채팅방으로 보내드립니다.\n설정 페이지에서 알림 옵션을 변경할 수 있습니다.',
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TELEGRAM WEBHOOK] 에러:', err)
    return NextResponse.json({ ok: true }) // 텔레그램에는 항상 200 반환
  }
}

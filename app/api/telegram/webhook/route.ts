// POST /api/telegram/webhook — 텔레그램 봇 업데이트 수신
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { sendTelegramMessage, formatCurrentRanks, formatRankSummary } from '@/lib/telegram'
import { filterByPreferences } from '@/lib/notifications'
import {
  buildOverallStat,
  buildRecentUsers,
  buildRecentPayments,
  buildCronStatus,
} from '@/lib/admin-stats'

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

    // 운영자 명령어 처리 (ADMIN_TELEGRAM_CHAT_ID 일치 시에만)
    // 다른 사용자가 같은 명령어를 쳐도 이 분기는 건너뛰고 일반 사용자 명령어로 떨어짐
    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID
    const isAdmin = !!adminChatId && chatId === adminChatId

    if (isAdmin) {
      if (text === '/admin') {
        await sendTelegramMessage(
          chatId,
          [
            '🛎️ <b>운영자 명령어</b>',
            '',
            '/stat — 종합 통계 (오늘 + 누적 + 최근활동)',
            '/users — 최근 가입자 20명',
            '/pay — 최근 결제 20건',
            '/cron — cron 실행 상태',
            '',
            '※ 사용자용 명령어(/rank, /today, /keywords)도 그대로 사용 가능',
          ].join('\n')
        )
        return NextResponse.json({ ok: true })
      }

      if (text === '/stat') {
        await sendTelegramMessage(chatId, await buildOverallStat())
        return NextResponse.json({ ok: true })
      }

      if (text === '/users') {
        await sendTelegramMessage(chatId, await buildRecentUsers(20))
        return NextResponse.json({ ok: true })
      }

      if (text === '/pay') {
        await sendTelegramMessage(chatId, await buildRecentPayments(20))
        return NextResponse.json({ ok: true })
      }

      if (text === '/cron') {
        await sendTelegramMessage(chatId, await buildCronStatus())
        return NextResponse.json({ ok: true })
      }
    }

    // /help 명령 처리 (사용법 안내) — 운영자에게는 운영자 명령어도 함께 안내
    if (text === '/help') {
      const helpLines = [
        '📋 <b>사용 가능한 명령어</b>',
        '',
        '/rank — 지금 내 키워드 순위 보기',
        '/today — 오늘의 변동 리포트 즉시 보기',
        '/keywords — 추적 중인 키워드 목록',
        '/stop — 자동 알림 끄기 (다시 켜려면 설정 페이지)',
        '/help — 이 도움말 보기',
      ]
      if (isAdmin) {
        helpLines.push(
          '',
          '🛎️ <b>운영자 전용</b>',
          '/admin — 운영자 명령어 도움말',
          '/stat — 종합 통계',
          '/users — 최근 가입자',
          '/pay — 최근 결제',
          '/cron — cron 상태'
        )
      } else {
        helpLines.push('', '매일 설정한 시각에 자동 리포트를 보내드려요.')
      }
      await sendTelegramMessage(chatId, helpLines.join('\n'))
      return NextResponse.json({ ok: true })
    }

    // /rank 명령 처리 (현재 순위 조회)
    if (text === '/rank') {
      const { data: setting } = await supabaseServer
        .from('notification_settings')
        .select('user_id')
        .eq('telegram_chat_id', chatId)
        .single()

      if (!setting) {
        await sendTelegramMessage(chatId, '먼저 설정 페이지에서 텔레그램을 연동해주세요.')
        return NextResponse.json({ ok: true })
      }

      const { data: keywords } = await supabaseServer
        .from('keywords')
        .select('keyword, current_rank')
        .eq('user_id', setting.user_id)
        .order('current_rank', { ascending: true, nullsFirst: false })

      const message = formatCurrentRanks(keywords || [])
      await sendTelegramMessage(chatId, message)
      return NextResponse.json({ ok: true })
    }

    // /today 명령 — 사용자 설정에 맞춘 오늘의 변동 리포트 즉시 발송
    if (text === '/today') {
      const { data: setting } = await supabaseServer
        .from('notification_settings')
        .select(
          'user_id, notify_rank_up, notify_rank_down, notify_new_entry, notify_dropped_out, notify_first_page_only'
        )
        .eq('telegram_chat_id', chatId)
        .single()

      if (!setting) {
        await sendTelegramMessage(chatId, '먼저 설정 페이지에서 텔레그램을 연동해주세요.')
        return NextResponse.json({ ok: true })
      }

      const { data: keywords } = await supabaseServer
        .from('keywords')
        .select('keyword, current_rank, previous_rank')
        .eq('user_id', setting.user_id)

      const filtered = filterByPreferences(
        (keywords || []).map((k) => ({
          keyword: k.keyword,
          previous_rank: k.previous_rank,
          current_rank: k.current_rank,
        })),
        setting
      )
      const today = new Date().toISOString().split('T')[0]
      const summary = formatRankSummary(filtered, today)
      await sendTelegramMessage(
        chatId,
        summary || '오늘은 알림 조건에 맞는 변동이 없습니다.'
      )
      return NextResponse.json({ ok: true })
    }

    // /keywords 명령 — 추적 중(활성) 키워드 목록
    if (text === '/keywords') {
      const { data: setting } = await supabaseServer
        .from('notification_settings')
        .select('user_id')
        .eq('telegram_chat_id', chatId)
        .single()

      if (!setting) {
        await sendTelegramMessage(chatId, '먼저 설정 페이지에서 텔레그램을 연동해주세요.')
        return NextResponse.json({ ok: true })
      }

      const { data: keywords } = await supabaseServer
        .from('keywords')
        .select('keyword, current_rank, is_active')
        .eq('user_id', setting.user_id)
        .eq('is_active', true)
        .order('current_rank', { ascending: true, nullsFirst: false })

      if (!keywords || keywords.length === 0) {
        await sendTelegramMessage(
          chatId,
          '추적 중인 키워드가 없습니다.\n대시보드에서 키워드를 추가해 주세요.'
        )
      } else {
        const lines = ['📋 <b>추적 중인 키워드</b>', '']
        for (const k of keywords) {
          const rank = k.current_rank ? `${k.current_rank}위` : '순위 밖'
          lines.push(`• ${k.keyword} — ${rank}`)
        }
        lines.push('', `총 ${keywords.length}개`)
        await sendTelegramMessage(chatId, lines.join('\n'))
      }
      return NextResponse.json({ ok: true })
    }

    // /stop 명령 — 자동 알림 일시 중지 (enabled=false). 다시 켜려면 설정 페이지에서.
    if (text === '/stop') {
      const { error } = await supabaseServer
        .from('notification_settings')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('telegram_chat_id', chatId)

      if (error) {
        await sendTelegramMessage(chatId, '알림 중지에 실패했습니다. 잠시 후 다시 시도해주세요.')
      } else {
        await sendTelegramMessage(
          chatId,
          '🔕 자동 알림을 껐습니다.\n다시 켜려면 설정 페이지에서 "알림 받기"를 ON으로 바꿔주세요.\n언제든 /rank, /today, /keywords 명령은 여전히 사용 가능합니다.'
        )
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TELEGRAM WEBHOOK] 에러:', err)
    return NextResponse.json({ ok: true }) // 텔레그램에는 항상 200 반환
  }
}

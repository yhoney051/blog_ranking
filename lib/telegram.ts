// 텔레그램 Bot API 클라이언트 (외부 패키지 없이 fetch만 사용)

const TELEGRAM_API = 'https://api.telegram.org/bot'

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다.')
  return token
}

// 텔레그램 메시지 발송
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<{ ok: boolean; blocked?: boolean }> {
  try {
    const res = await fetch(`${TELEGRAM_API}${getBotToken()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    })

    const data = await res.json()

    // 사용자가 봇을 차단한 경우
    if (!res.ok && data.error_code === 403) {
      console.warn(`[TELEGRAM] 사용자 차단됨 (chat_id: ${chatId})`)
      return { ok: false, blocked: true }
    }

    if (!data.ok) {
      console.error(`[TELEGRAM] 메시지 발송 실패:`, data.description)
      return { ok: false }
    }

    return { ok: true }
  } catch (err) {
    console.error(`[TELEGRAM] 네트워크 에러:`, err)
    return { ok: false }
  }
}

// 순위 변동 결과 타입
export type RankResult = {
  keyword: string
  previous_rank: number | null
  current_rank: number | null
}

// 일일 순위 리포트 메시지 포맷팅
export function formatRankSummary(results: RankResult[], date: string): string {
  const up: string[] = []
  const down: string[] = []
  const same: string[] = []
  const newEntry: string[] = []
  const droppedOut: string[] = []

  for (const r of results) {
    const kw = escapeHtml(r.keyword)

    if (r.previous_rank === null && r.current_rank !== null) {
      // 신규 진입
      newEntry.push(`• "${kw}" — ${r.current_rank}위 진입`)
    } else if (r.previous_rank !== null && r.current_rank === null) {
      // 순위권 이탈
      droppedOut.push(`• "${kw}" — ${r.previous_rank}위에서 이탈`)
    } else if (r.previous_rank !== null && r.current_rank !== null) {
      const diff = r.previous_rank - r.current_rank
      if (diff > 0) {
        up.push(`• "${kw}" — ${r.previous_rank}위 → ${r.current_rank}위 (▲${diff})`)
      } else if (diff < 0) {
        down.push(`• "${kw}" — ${r.previous_rank}위 → ${r.current_rank}위 (▼${Math.abs(diff)})`)
      } else {
        same.push(`• "${kw}" — ${r.current_rank}위 유지`)
      }
    }
    // previous_rank === null && current_rank === null → 아직 미조회, 생략
  }

  const lines: string[] = [`📊 <b>일일 순위 리포트</b> (${date})\n`]

  if (up.length > 0) {
    lines.push(`🟢 <b>순위 상승</b>`, ...up, '')
  }
  if (down.length > 0) {
    lines.push(`🔴 <b>순위 하락</b>`, ...down, '')
  }
  if (newEntry.length > 0) {
    lines.push(`🔵 <b>신규 진입</b>`, ...newEntry, '')
  }
  if (droppedOut.length > 0) {
    lines.push(`❌ <b>순위권 이탈</b>`, ...droppedOut, '')
  }
  if (same.length > 0) {
    lines.push(`⚪ <b>변동 없음</b>`, ...same, '')
  }

  const total = results.filter(r => r.previous_rank !== null || r.current_rank !== null).length
  lines.push(`총 ${total}개 | 상승 ${up.length} | 하락 ${down.length} | 신규 ${newEntry.length} | 이탈 ${droppedOut.length} | 유지 ${same.length}`)

  return lines.join('\n')
}

// HTML 특수문자 이스케이프 (텔레그램 HTML parse_mode용)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

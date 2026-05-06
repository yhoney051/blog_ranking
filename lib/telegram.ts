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

// 일일 순위 리포트 메시지 포맷팅 — 진입/상승/하락/이탈 4섹션
// filterByPreferences가 사용자 토글로 미리 필터한 결과를 받으므로,
// 여기에서는 모든 케이스를 분류해 메시지로 만든다.
export function formatRankSummary(results: RankResult[], date: string): string {
  const newEntry: string[] = []
  const rankUp: string[] = []
  const rankDown: string[] = []
  const droppedOut: string[] = []

  for (const r of results) {
    const kw = escapeHtml(r.keyword)

    if (r.previous_rank === null && r.current_rank !== null) {
      // 신규 진입
      newEntry.push(`• "${kw}" — ${r.current_rank}위`)
    } else if (r.previous_rank !== null && r.current_rank === null) {
      // 순위권 이탈
      droppedOut.push(`• "${kw}"`)
    } else if (r.previous_rank !== null && r.current_rank !== null) {
      const diff = r.previous_rank - r.current_rank // 양수 = 상승, 음수 = 하락
      if (diff > 0) {
        rankUp.push(`• "${kw}" ${r.previous_rank}위 → ${r.current_rank}위 (▲${diff})`)
      } else if (diff < 0) {
        rankDown.push(`• "${kw}" ${r.previous_rank}위 → ${r.current_rank}위 (▼${-diff})`)
      }
      // diff === 0: 변동 없음 → 메시지에 포함하지 않음
    }
  }

  // 모든 섹션 비면 발송 안 함 (skip)
  if (
    newEntry.length === 0 &&
    rankUp.length === 0 &&
    rankDown.length === 0 &&
    droppedOut.length === 0
  ) {
    return ''
  }

  const lines: string[] = [`📊 <b>일일 순위 리포트</b> (${date})\n`]

  if (newEntry.length > 0) {
    lines.push(`🔵 <b>신규 진입</b>`, ...newEntry, '')
  }
  if (rankUp.length > 0) {
    lines.push(`📈 <b>순위 상승</b>`, ...rankUp, '')
  }
  if (rankDown.length > 0) {
    lines.push(`📉 <b>순위 하락</b>`, ...rankDown, '')
  }
  if (droppedOut.length > 0) {
    lines.push(`❌ <b>순위권 이탈</b>`, ...droppedOut, '')
    lines.push(`💡 이탈 키워드는 오늘 새로 블로그를 작성해 보는 건 어떨까요?`)
  }

  return lines.join('\n')
}

// 현재 순위 현황 메시지 포맷팅 (/rank 명령어용)
export function formatCurrentRanks(
  keywords: { keyword: string; current_rank: number | null }[]
): string {
  if (keywords.length === 0) {
    return '등록된 키워드가 없습니다.\n대시보드에서 키워드를 추가해주세요.'
  }

  const ranked = keywords
    .filter((k) => k.current_rank !== null)
    .sort((a, b) => a.current_rank! - b.current_rank!)
  const unranked = keywords.filter((k) => k.current_rank === null)

  const lines: string[] = ['📋 <b>현재 순위 현황</b>\n']

  for (const k of ranked) {
    lines.push(`${k.current_rank}위 — "${escapeHtml(k.keyword)}"`)
  }
  for (const k of unranked) {
    lines.push(`❌ — "${escapeHtml(k.keyword)}" (순위권 밖)`)
  }

  lines.push(`\n총 ${keywords.length}개 키워드`)
  return lines.join('\n')
}

// HTML 특수문자 이스케이프 (텔레그램 HTML parse_mode용)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

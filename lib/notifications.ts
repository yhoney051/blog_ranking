// 일일 알림 발송 서비스 — 텔레그램으로 순위 변동 리포트 전송

import { supabaseServer } from '@/lib/supabase/server'
import { sendTelegramMessage, formatRankSummary, type RankResult } from '@/lib/telegram'
import type { NotificationSettings } from '@/types'

// 일일 순위 알림 발송 (크론 잡에서 호출)
// kstHour 인자가 주어지면 그 시각으로 설정한 사용자만 발송. 미지정 시 모든 활성 사용자.
export async function sendDailyNotifications(opts: { kstHour?: number } = {}): Promise<{
  sent: number
  failed: number
  skipped: number
}> {
  // 1. 알림 활성화된 사용자 조회 (kstHour 매칭)
  let query = supabaseServer
    .from('notification_settings')
    .select('*')
    .eq('enabled', true)
    .not('telegram_chat_id', 'is', null)
  if (typeof opts.kstHour === 'number') {
    query = query.eq('notify_hour_kst', opts.kstHour)
  }
  const { data: settings, error: settingsErr } = await query

  if (settingsErr || !settings || settings.length === 0) {
    console.log('[NOTIFY] 알림 대상 없음')
    return { sent: 0, failed: 0, skipped: 0 }
  }

  // 2. 모든 키워드 조회 (current_rank, previous_rank 비교용)
  const userIds = settings.map((s: NotificationSettings) => s.user_id)
  const { data: keywords, error: kwErr } = await supabaseServer
    .from('keywords')
    .select('user_id, keyword, current_rank, previous_rank')
    .in('user_id', userIds)

  if (kwErr || !keywords) {
    console.error('[NOTIFY] 키워드 조회 실패:', kwErr?.message)
    return { sent: 0, failed: 0, skipped: 0 }
  }

  // 3. 사용자별 키워드 그룹핑
  const keywordsByUser = new Map<string, RankResult[]>()
  for (const kw of keywords) {
    const list = keywordsByUser.get(kw.user_id) || []
    list.push({
      keyword: kw.keyword,
      previous_rank: kw.previous_rank,
      current_rank: kw.current_rank,
    })
    keywordsByUser.set(kw.user_id, list)
  }

  // 4. 사용자별 알림 발송
  const today = new Date().toISOString().split('T')[0]
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const setting of settings as NotificationSettings[]) {
    const userKeywords = keywordsByUser.get(setting.user_id)
    if (!userKeywords || userKeywords.length === 0) {
      skipped++
      continue
    }

    // 알림 설정에 따라 필터링
    const filtered = filterByPreferences(userKeywords, setting)
    if (filtered.length === 0) {
      skipped++
      continue
    }

    const message = formatRankSummary(filtered, today)
    // 진입/이탈 모두 없으면 알림 발송하지 않음
    if (!message) {
      skipped++
      continue
    }
    const result = await sendTelegramMessage(setting.telegram_chat_id!, message)

    if (result.ok) {
      sent++
    } else if (result.blocked) {
      // 봇 차단 시 자동 비활성화
      await supabaseServer
        .from('notification_settings')
        .update({ enabled: false })
        .eq('id', setting.id)
      failed++
    } else {
      failed++
    }
  }

  console.log(`[NOTIFY] 발송 완료: sent=${sent}, failed=${failed}, skipped=${skipped}`)
  return { sent, failed, skipped }
}

// 사용자 알림 설정에 따라 키워드 필터링
function filterByPreferences(
  keywords: RankResult[],
  settings: NotificationSettings
): RankResult[] {
  return keywords.filter((kw) => {
    // 신규 진입
    if (kw.previous_rank === null && kw.current_rank !== null) {
      return settings.notify_new_entry
    }
    // 순위권 이탈
    if (kw.previous_rank !== null && kw.current_rank === null) {
      return settings.notify_dropped_out
    }
    // 순위 변동
    if (kw.previous_rank !== null && kw.current_rank !== null) {
      const diff = kw.previous_rank - kw.current_rank
      if (diff > 0) return settings.notify_rank_up
      if (diff < 0) return settings.notify_rank_down
      return true // 변동 없음은 항상 포함
    }
    return false
  })
}

// 테스트 알림 발송 (설정 페이지에서 호출)
export async function sendTestNotification(chatId: string): Promise<boolean> {
  const testMessage = [
    '📊 <b>테스트 알림</b>\n',
    '텔레그램 알림이 정상적으로 연동되었습니다!',
    '매일 자동으로 순위 변동 리포트를 받아보실 수 있습니다.',
  ].join('\n')

  const result = await sendTelegramMessage(chatId, testMessage)
  return result.ok
}

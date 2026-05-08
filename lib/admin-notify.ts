// 운영자(사장님) 전용 텔레그램 알림 헬퍼
// ADMIN_TELEGRAM_CHAT_ID 환경변수에 저장된 단일 chat_id로만 발송 → 다른 사용자에게 절대 가지 않음
// 알림 실패가 본 비즈니스 로직(가입·결제·cron)을 깨뜨리지 않도록 try/catch로 격리

import { sendTelegramMessage } from '@/lib/telegram'

const PREFIX = '🛎️ <b>[운영자]</b>\n'

// 운영자에게 텔레그램 메시지 발송
// chat_id 미설정 환경(개발/PR 프리뷰)에서는 silent skip
export async function notifyAdmin(text: string): Promise<void> {
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID
  if (!chatId) {
    return
  }

  try {
    await sendTelegramMessage(chatId, `${PREFIX}${text}`)
  } catch (err) {
    console.error('[ADMIN-NOTIFY] 발송 실패:', err)
  }
}

// HTML 특수문자 이스케이프 (텔레그램 HTML parse_mode용)
// lib/telegram.ts의 escapeHtml은 모듈 내부 private이라 별도 정의
export function escapeAdminHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

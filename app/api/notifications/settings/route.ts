// GET/PUT /api/notifications/settings — 알림 설정 조회/수정
import { NextResponse } from 'next/server'
import { getAuthUserId, supabaseServer } from '@/lib/supabase/server'
import { sendTestNotification } from '@/lib/notifications'

// 알림 설정 조회
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabaseServer
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (아직 설정 안 함)
    console.error('[GET /api/notifications/settings]', error.message)
    return NextResponse.json({ error: '알림 설정 조회에 실패했습니다.' }, { status: 500 })
  }

  // 설정이 없으면 기본값 반환
  if (!data) {
    return NextResponse.json({
      telegram_chat_id: null,
      telegram_username: null,
      enabled: true,
      notify_rank_up: true,
      notify_rank_down: true,
      notify_new_entry: true,
      notify_dropped_out: true,
      notify_first_page_only: false,
      notify_hour_kst: 9,
    })
  }

  return NextResponse.json(data)
}

// 알림 설정 수정
export async function PUT(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()

  // 허용된 필드만 추출 (boolean 6종 + 정수 1종)
  const booleanFields = [
    'enabled',
    'notify_rank_up',
    'notify_rank_down',
    'notify_new_entry',
    'notify_dropped_out',
    'notify_first_page_only',
  ] as const
  const allowedHours = [9, 12, 19]

  const updates: Record<string, boolean | number> = {}
  for (const field of booleanFields) {
    if (typeof body[field] === 'boolean') {
      updates[field] = body[field]
    }
  }
  if (typeof body.notify_hour_kst === 'number' && allowedHours.includes(body.notify_hour_kst)) {
    updates.notify_hour_kst = body.notify_hour_kst
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 설정이 없습니다.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('notification_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    console.error('[PUT /api/notifications/settings]', error.message)
    return NextResponse.json({ error: '알림 설정 수정에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// POST /api/notifications/settings — 테스트 알림 발송
export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabaseServer
    .from('notification_settings')
    .select('telegram_chat_id')
    .eq('user_id', userId)
    .single()

  if (error || !data?.telegram_chat_id) {
    return NextResponse.json({ error: '텔레그램이 연동되지 않았습니다.' }, { status: 400 })
  }

  const success = await sendTestNotification(data.telegram_chat_id)

  // 테스트 발송도 이력에 기록 → 사용자가 화면에서 바로 확인 가능
  // history 테이블이 아직 마이그레이션 안 됐어도 발송 자체는 영향 없도록 에러 무시
  const { error: histErr } = await supabaseServer.from('notification_history').insert({
    user_id: userId,
    channel: 'telegram',
    status: success ? 'sent' : 'failed',
    keyword_count: 0,
    message_preview: '테스트 알림 — 연동 확인용',
  })
  if (histErr) console.error('[POST settings/test] history insert 실패 (무시):', histErr.message)

  if (!success) {
    return NextResponse.json({ error: '알림 발송에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

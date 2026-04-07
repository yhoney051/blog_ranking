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

  // 허용된 필드만 추출
  const allowedFields = [
    'enabled',
    'notify_rank_up',
    'notify_rank_down',
    'notify_new_entry',
    'notify_dropped_out',
  ] as const

  const updates: Record<string, boolean> = {}
  for (const field of allowedFields) {
    if (typeof body[field] === 'boolean') {
      updates[field] = body[field]
    }
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
  if (!success) {
    return NextResponse.json({ error: '알림 발송에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

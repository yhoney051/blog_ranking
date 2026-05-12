// 블로그 마케팅 대행 문의 접수 — 비로그인 사용자도 호출 가능
// 1) Zod 검증 → 2) IP 기반 Rate limit → 3) Supabase INSERT(service_role) → 4) 운영자 텔레그램 푸시

import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseServer, getAuthUserId } from '@/lib/supabase/server'
import { contactCreateSchema } from '@/lib/validations'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'

// IP를 SHA-256 해시로 변환 (평문 IP를 DB에 저장하지 않기 위함)
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export async function POST(req: Request) {
  // Rate limit: 같은 IP에서 10분 동안 3번까지
  const ip = getClientIp(req)
  const ipHash = hashIp(ip)
  const limit = rateLimit(`contact:${ipHash}`, 3, 10 * 60 * 1000)
  if (!limit.success) {
    return NextResponse.json(
      { error: '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = contactCreateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = await getAuthUserId() // 비로그인이면 null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null
  const referrer = req.headers.get('referer')?.slice(0, 500) ?? null

  // service_role로 INSERT (RLS 우회 — 익명도 접수 가능, 단 조회는 service_role 전용)
  const { data, error } = await supabaseServer
    .from('inquiries')
    .insert({
      name: parsed.data.name,
      contact: parsed.data.contact,
      message: parsed.data.message,
      user_id: userId,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/contact]', error.message)
    return NextResponse.json({ error: '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }

  // 운영자 텔레그램 알림 (실패해도 사용자 성공 응답은 유지)
  const text =
    `📩 <b>대행 문의</b>\n` +
    `이름: ${escapeAdminHtml(parsed.data.name)}\n` +
    `연락처: ${escapeAdminHtml(parsed.data.contact)}\n` +
    `─────────\n` +
    `${escapeAdminHtml(parsed.data.message)}\n` +
    `─────────\n` +
    `로그인: ${userId ? 'O' : '-'}`
  await notifyAdmin(text)

  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 })
}

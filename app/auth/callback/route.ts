// Supabase Auth 콜백 처리
// OAuth 로그인 후 이 경로로 리다이렉트됨
// 리다이렉트 응답에 직접 쿠키 설정 (OAuth 세션 유실 방지)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  // 리다이렉트 응답을 먼저 생성하여 쿠키를 직접 설정
  const redirectPath = type === 'recovery' ? '/reset-password' : '/dashboard'
  const response = NextResponse.redirect(new URL(redirectPath, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  // 신규 가입 감지 — user.created_at이 60초 이내면 신규로 판정해 운영자에게 즉시 알림
  // 매 로그인마다 발송되지 않도록 시간창으로 제한
  const user = data?.user
  if (user?.created_at) {
    const ageMs = Date.now() - new Date(user.created_at).getTime()
    if (ageMs < 60_000) {
      await notifyAdmin(`✨ <b>신규 가입</b>\n${escapeAdminHtml(user.email ?? '(이메일 미상)')}`)
    }
  }

  return response
}

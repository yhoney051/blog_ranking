// Supabase Auth 콜백 처리
// 이메일 확인, OAuth 로그인 후 이 경로로 리다이렉트됨

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  // 비밀번호 재설정 요청인 경우 재설정 페이지로 이동
  const type = searchParams.get('type')
  const redirectPath = type === 'recovery' ? '/reset-password' : '/dashboard'

  // 리다이렉트 응답에 인증 쿠키를 명시적으로 포함 (OAuth 후 세션 유실 방지)
  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  cookieStore.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  })
  return response
}

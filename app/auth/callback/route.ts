// Supabase Auth 콜백 처리
// 이메일 확인, OAuth 로그인 후 이 경로로 리다이렉트됨
// cookies() 대신 NextRequest/NextResponse 기반 쿠키 관리 (OAuth 세션 유실 방지)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  // NextResponse.next()를 사용하여 쿠키를 요청/응답 모두에 반영
  const response = NextResponse.next({ request })

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
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
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
  const redirectUrl = new URL(
    type === 'recovery' ? '/reset-password' : '/dashboard',
    request.url
  )

  // 최종 리다이렉트 응답 생성 후, 세션 쿠키를 복사
  const redirectResponse = NextResponse.redirect(redirectUrl)
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  })
  return redirectResponse
}

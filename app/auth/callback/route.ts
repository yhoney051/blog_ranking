// Supabase Auth 콜백 처리
// OAuth 로그인 후 이 경로로 리다이렉트됨
// 리다이렉트 응답에 직접 쿠키 설정 (OAuth 세션 유실 방지)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  return response
}

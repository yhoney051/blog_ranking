// Supabase Auth 콜백 처리
// 이메일 확인, OAuth 로그인 후 이 경로로 리다이렉트됨

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

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
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  // 신규 사용자(키워드 0개)는 온보딩으로, 기존 사용자는 대시보드로
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { count } = await supabaseServer
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 0) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}

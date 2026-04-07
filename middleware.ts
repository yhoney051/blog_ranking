// 인증 미들웨어 — 미인증 사용자를 /login으로 리다이렉트
// /dashboard, /api/* (auth, cron, webhooks, guest-rank-check 제외) 경로를 보호

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 미인증 사용자 → /dashboard 및 하위 경로 보호 (/dashboard/formatter만 비회원 허용)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const publicDashboardPaths = ['/dashboard/formatter']
    const isPublic = request.nextUrl.pathname === '/dashboard' || publicDashboardPaths.some(p => request.nextUrl.pathname.startsWith(p))
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // 미인증 사용자 → API 요청 차단
  if (!user && request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 이미 로그인한 사용자가 /, /onboarding, /login, /signup 접근 시 → /dashboard로
  if (user && ['/', '/onboarding', '/login', '/signup'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/onboarding', '/dashboard/:path*', '/login', '/signup', '/api/((?!auth|cron|webhooks|guest-rank-check|format|telegram).*)'],
}

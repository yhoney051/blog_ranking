// 브라우저 환경에서 사용하는 Supabase 클라이언트
// Auth 세션 자동 관리 (쿠키 기반)

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

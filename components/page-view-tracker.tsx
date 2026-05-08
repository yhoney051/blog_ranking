'use client'

// 페이지뷰 / 순방문자 추적 — Vercel Analytics와 동일한 fire-and-forget 패턴
// localStorage에 vid(고유 브라우저 ID) + last_visit_date 저장
// 같은 날 첫 방문이면 isUnique=true → 서버에서 unique_visitors +1
// 매 방문마다 page_views +1
// AdBlocker나 JS 비활성 환경에서는 누락 (Vercel Analytics와 동일 한계)

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// KST 기준 오늘 yyyy-mm-dd
function getTodayKstDate(): string {
  const kstNow = new Date(Date.now() + 9 * 3600_000)
  return kstNow.toISOString().split('T')[0]
}

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const today = getTodayKstDate()

    // localStorage 접근은 시크릿 모드 등에서 throw 가능 → 안전하게 try/catch
    let isUnique = false
    try {
      const lastVisitDate = localStorage.getItem('last_visit_date')
      isUnique = lastVisitDate !== today
      if (isUnique) {
        localStorage.setItem('last_visit_date', today)
      }
      // vid는 단순 식별용으로 보관 (현재 서버에서는 사용 안 하지만 향후 확장 대비)
      if (!localStorage.getItem('vid')) {
        localStorage.setItem('vid', crypto.randomUUID())
      }
    } catch {
      // localStorage 차단 환경 → unique 판단 불가 → 보수적으로 false (page_views만 +1)
      isUnique = false
    }

    // fire-and-forget: 응답 안 기다림, 실패해도 사용자 경험 영향 없음
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isUnique }),
      keepalive: true,
    }).catch(() => {
      // 네트워크 실패 무시
    })
  }, [pathname])

  return null
}

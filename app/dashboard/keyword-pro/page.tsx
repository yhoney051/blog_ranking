'use client'

// 전문 키워드 검색 도구 페이지
// 비회원도 접근 가능 (가독성King 자리 패턴, middleware의 publicDashboardPaths에 등록됨).
// 인증 여부만 확인해서 KeywordProTool에 prop으로 넘김.

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { KeywordProTool } from '@/components/keyword-pro/keyword-pro-tool'
import { supabase } from '@/lib/supabase/client'

export default function KeywordProPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <Header title="전문 키워드 검색" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <KeywordProTool isLoggedIn={isLoggedIn} />
        </div>
      </main>
    </div>
  )
}

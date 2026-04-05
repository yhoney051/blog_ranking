'use client'

// 결제 실패 페이지 — 토스 빌링 인증 실패 시 표시

import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BillingFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const errorCode = searchParams.get('code') || '알 수 없음'
  const errorMessage = searchParams.get('message') || '결제 인증에 실패했습니다.'

  return (
    <>
      <Header title="결제 실패" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-md mx-auto mt-12">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-lg font-semibold">결제에 실패했습니다</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <p className="text-xs text-muted-foreground">에러 코드: {errorCode}</p>
              <Button onClick={() => router.push('/dashboard/billing')}>
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

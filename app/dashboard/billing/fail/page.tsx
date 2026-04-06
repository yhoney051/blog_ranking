'use client'

// 결제 실패 페이지 — 포트원은 인라인 방식이므로 이 페이지는 fallback용

import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BillingFailPage() {
  const router = useRouter()

  return (
    <>
      <Header title="결제 실패" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-md mx-auto mt-12">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-lg font-semibold">결제에 실패했습니다</p>
              <p className="text-sm text-muted-foreground">
                다시 시도하거나, 다른 결제 수단을 이용해 주세요.
              </p>
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

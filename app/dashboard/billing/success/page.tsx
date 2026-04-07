'use client'

// 결제 성공 페이지 — 포트원은 인라인 방식이므로 이 페이지는 fallback용
// 직접 URL로 접근한 경우 결제 관리 페이지로 안내

import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BillingSuccessPage() {
  const router = useRouter()

  return (
    <>
      <Header title="결제 완료" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-md mx-auto mt-12">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-brand-500" />
              <p className="text-lg font-semibold">결제가 완료되었습니다</p>
              <p className="text-sm text-muted-foreground">
                결제 관리 페이지에서 구독 상태를 확인할 수 있습니다.
              </p>
              <Button onClick={() => router.push('/dashboard/billing')}>
                결제 관리로 이동
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

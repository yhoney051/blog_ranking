'use client'

// 결제 성공 콜백 페이지 — 토스 빌링 인증 성공 후 구독 활성화 처리

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    // 중복 호출 방지 (StrictMode 대응)
    if (calledRef.current) return
    calledRef.current = true

    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')

    if (!authKey || !customerKey) {
      setStatus('error')
      setErrorMessage('인증 정보가 누락되었습니다.')
      return
    }

    async function subscribe() {
      try {
        const res = await fetch('/api/billing/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey }),
        })

        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          toast.success('Pro 플랜이 활성화되었습니다!')
          setTimeout(() => router.push('/dashboard/billing'), 2000)
        } else {
          setStatus('error')
          setErrorMessage(data.error || '구독 활성화에 실패했습니다.')
        }
      } catch {
        setStatus('error')
        setErrorMessage('처리 중 오류가 발생했습니다.')
      }
    }

    subscribe()
  }, [searchParams, router])

  return (
    <>
      <Header title="결제 처리" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-md mx-auto mt-12">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              {status === 'processing' && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-lg font-semibold">결제를 처리하고 있습니다...</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                  <p className="text-lg font-semibold">Pro 플랜 활성화 완료!</p>
                  <p className="text-sm text-muted-foreground">결제 관리 페이지로 이동합니다...</p>
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="h-12 w-12 mx-auto text-destructive" />
                  <p className="text-lg font-semibold">결제 처리 실패</p>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  <Button onClick={() => router.push('/dashboard/billing')}>
                    돌아가기
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

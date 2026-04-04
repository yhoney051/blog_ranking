'use client'

// 전역 에러 바운더리 — 예기치 않은 오류 발생 시 표시
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <p className="text-5xl font-bold text-muted-foreground">오류</p>
        <h1 className="text-xl font-semibold">문제가 발생했습니다</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <Button onClick={reset} className="mt-4">
          다시 시도
        </Button>
      </div>
    </div>
  )
}

'use client'

// 전역 에러 핸들러 (Sentry 연동) — root layout 에러 포함
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4">
            <p className="text-5xl font-bold text-muted-foreground">오류</p>
            <h1 className="text-xl font-semibold">심각한 오류가 발생했습니다</h1>
            <p className="text-sm text-muted-foreground">
              문제가 자동으로 보고되었습니다. 잠시 후 다시 시도해주세요.
            </p>
            <Button onClick={reset} className="mt-4">
              다시 시도
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

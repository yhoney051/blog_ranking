// Sentry 클라이언트 설정 — 브라우저 에러 추적
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 프로덕션: 10% 샘플링 (비용 절감)
  replaysSessionSampleRate: 0, // Session Replay 비활성화
  replaysOnErrorSampleRate: 0.1, // 에러 발생 시 10% 리플레이
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
})

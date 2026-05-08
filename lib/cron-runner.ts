// Vercel Cron 실행 추적 헬퍼
// cron_runs 테이블에 시작/종료를 기록하고, 실패 시 운영자에게 즉시 텔레그램 알림
// 일일 요약에서 last 24h를 조회해 누락된 cron을 감지 → 5일 미동작 사고 재발 방지

import { supabaseServer } from '@/lib/supabase/server'
import { notifyAdmin, escapeAdminHtml } from '@/lib/admin-notify'

export type CronJobName =
  | 'check-ranks'
  | 'send-notifications'
  | 'billing-renewal'
  | 'admin-daily-summary'

// cron 시작 시점 기록 → run id 반환 (실패해도 cron 본체는 계속 진행)
export async function recordCronStart(jobName: CronJobName): Promise<string | null> {
  try {
    const { data, error } = await supabaseServer
      .from('cron_runs')
      .insert({ job_name: jobName, status: 'running' })
      .select('id')
      .single()
    if (error) {
      console.error(`[CRON-RUNNER] start 기록 실패 (${jobName}):`, error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error(`[CRON-RUNNER] start 예외 (${jobName}):`, err)
    return null
  }
}

// cron 종료 시점 기록 (성공/실패/스킵)
export async function recordCronEnd(
  runId: string | null,
  status: 'success' | 'failed' | 'skipped',
  payload: { result?: unknown; error?: unknown } = {}
): Promise<void> {
  if (!runId) return
  try {
    await supabaseServer
      .from('cron_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        result_json:
          payload.result && typeof payload.result === 'object' ? payload.result : null,
        error_text: payload.error
          ? (payload.error instanceof Error ? payload.error.message : String(payload.error)).slice(
              0,
              500
            )
          : null,
      })
      .eq('id', runId)
  } catch (err) {
    console.error(`[CRON-RUNNER] end 예외:`, err)
  }
}

// cron 실패 시 운영자에게 즉시 텔레그램 알림
export async function notifyAdminCronFailure(
  jobName: CronJobName,
  error: unknown
): Promise<void> {
  const errMsg = error instanceof Error ? error.message : String(error)
  await notifyAdmin(
    `🚨 <b>cron 실패</b>\n${escapeAdminHtml(jobName)} — ${escapeAdminHtml(errMsg.slice(0, 300))}`
  )
}

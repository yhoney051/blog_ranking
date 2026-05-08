-- cron_runs 테이블 — Vercel Cron 실행 이력 기록
-- 운영자 일일 요약(admin-daily-summary)에서 last 24h 조회 → cron 누락/실패 감지
-- 직전 출시 직전 진단(2026-05-08): cron 5일 미동작 사고 재발 방지

CREATE TABLE IF NOT EXISTS cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL, -- 'check-ranks' | 'send-notifications' | 'billing-renewal' | 'admin-daily-summary'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'failed' | 'skipped'
  result_json JSONB,
  error_text TEXT
);

COMMENT ON TABLE cron_runs IS 'Vercel Cron 실행 이력. 일일 요약에서 24시간 내 누락 작업 감지용.';

-- 작업명 + 최근 시각 인덱스 (last 24h 조회 빠르게)
CREATE INDEX IF NOT EXISTS idx_cron_runs_job_recent
ON cron_runs(job_name, started_at DESC);

-- RLS: 사용자에게 노출 0%, service_role만 접근 (정책 미생성 = 일반 사용자 접근 차단)
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

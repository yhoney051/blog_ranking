-- 1) 임계값 옵션: 1페이지(1~10위) 진입/이탈만 알림
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS notify_first_page_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN notification_settings.notify_first_page_only IS 'true이면 1~10위 관련 변동만 알림 (소상공인 노이즈 감소)';

-- 2) 알림 발송 이력 테이블 — 어떤 알림이 누구에게 언제 갔는지 기록
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL DEFAULT 'telegram',
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'blocked'
  keyword_count INTEGER NOT NULL DEFAULT 0,
  message_preview TEXT
);

-- 사용자별 최근 이력 조회용 인덱스 (DESC 정렬 빠르게)
CREATE INDEX IF NOT EXISTS idx_notification_history_user_recent
ON notification_history(user_id, sent_at DESC);

-- 자동 정리: 90일 지난 이력은 사용자 화면에 안 띄움 (DB는 유지). 추후 cron으로 삭제 가능.

-- RLS: 사용자 본인 이력만 조회 가능 (INSERT는 service role로만)
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_history' AND policyname = '사용자 본인 알림 이력 조회'
  ) THEN
    CREATE POLICY "사용자 본인 알림 이력 조회"
      ON notification_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

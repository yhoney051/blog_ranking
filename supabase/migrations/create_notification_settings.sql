-- 알림 설정 테이블: 텔레그램 연동 및 알림 환경설정
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notify_rank_up BOOLEAN NOT NULL DEFAULT true,
  notify_rank_down BOOLEAN NOT NULL DEFAULT true,
  notify_new_entry BOOLEAN NOT NULL DEFAULT true,
  notify_dropped_out BOOLEAN NOT NULL DEFAULT true,
  connect_token TEXT,
  connect_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_enabled ON notification_settings(user_id) WHERE enabled = true AND telegram_chat_id IS NOT NULL;
CREATE INDEX idx_notification_settings_connect_token ON notification_settings(connect_token) WHERE connect_token IS NOT NULL;

-- RLS 활성화
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 조회 가능
CREATE POLICY "사용자 본인 알림 설정 조회"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자 본인만 수정 가능
CREATE POLICY "사용자 본인 알림 설정 수정"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자 본인만 생성 가능
CREATE POLICY "사용자 본인 알림 설정 생성"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

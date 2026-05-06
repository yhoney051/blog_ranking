-- 알림 발송 시각(한국 시간 기준) 컬럼 추가
-- 사용자가 매일 알림을 받을 시각을 선택 (오전 9시 / 정오 / 저녁 7시)
-- 적용 방법: Supabase Dashboard → SQL Editor → 아래 SQL 실행

ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS notify_hour_kst INTEGER NOT NULL DEFAULT 9
CHECK (notify_hour_kst IN (9, 12, 19));

-- 기존 사용자는 default 9시(아침)로 자동 설정됨.
-- 이후 사용자가 설정 페이지에서 자유롭게 변경 가능.

COMMENT ON COLUMN notification_settings.notify_hour_kst IS '알림 발송 시각(KST 기준): 9=오전 9시, 12=정오, 19=저녁 7시';

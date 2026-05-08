-- daily_stats 테이블 — 일자별 페이지뷰/순방문자 카운터 (KST 기준)
-- /api/track 라우트가 페이지 로드마다 increment_daily_stats RPC를 호출해 atomic INCR
-- 운영자 텔레그램 봇 /stat 명령어와 일일 요약 메시지에 표시

CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- atomic INCR: 행 없으면 INSERT(1, 0|1), 있으면 +1 / unique는 p_is_unique=true일 때만 +1
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date DATE,
  p_is_unique BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_unique_inc INTEGER := CASE WHEN p_is_unique THEN 1 ELSE 0 END;
BEGIN
  INSERT INTO daily_stats (date, page_views, unique_visitors)
  VALUES (p_date, 1, v_unique_inc)
  ON CONFLICT (date) DO UPDATE
  SET page_views = daily_stats.page_views + 1,
      unique_visitors = daily_stats.unique_visitors + v_unique_inc,
      updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- RLS: 사용자에게 노출 0%, service_role만 접근 (정책 미생성 = 일반 사용자 차단)
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

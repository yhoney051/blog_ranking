-- 키워드 테이블에 월간 검색량 컬럼 추가
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS monthly_search_volume integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS search_volume_updated_at timestamptz DEFAULT NULL;

-- 검색량 기반 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_keywords_search_volume
  ON keywords (monthly_search_volume DESC NULLS LAST);

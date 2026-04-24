-- 키워드 데이터 정규화 + 중복 방지 unique 제약
-- Supabase SQL Editor에서 순서대로 실행

-- 1) 기존 키워드의 모든 공백 제거 ("강남 맛집" → "강남맛집")
UPDATE keywords
SET keyword = REGEXP_REPLACE(keyword, '\s+', '', 'g')
WHERE keyword ~ '\s';

-- 2) 기존 blog_url 정규화
--    - http(s):// 제거
--    - trailing slash 제거
--    - 전체 lowercase (네이버 블로그 URL은 대소문자 구분 없음)
UPDATE keywords
SET blog_url = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(blog_url, '^https?://', ''),
    '/+$', ''
  )
);

-- 3) 중복 레코드 제거 (같은 user_id+keyword+blog_url 중 가장 오래된 것만 유지)
--    rank_histories는 ON DELETE CASCADE로 자동 정리됨 (아니라면 먼저 삭제 필요)
DELETE FROM keywords k1
USING keywords k2
WHERE k1.user_id = k2.user_id
  AND k1.keyword = k2.keyword
  AND k1.blog_url = k2.blog_url
  AND k1.created_at > k2.created_at;

-- 4) Unique 제약 추가 (race condition 방어)
ALTER TABLE keywords
ADD CONSTRAINT keywords_user_keyword_url_unique
UNIQUE (user_id, keyword, blog_url);

-- 검증: 중복이 없는지 확인 (결과 0행이어야 함)
-- SELECT user_id, keyword, blog_url, COUNT(*)
-- FROM keywords
-- GROUP BY 1, 2, 3
-- HAVING COUNT(*) > 1;

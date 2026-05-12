-- inquiries 테이블 — 블로그 마케팅 대행 문의 접수
-- 비로그인 사용자도 접수 가능. 운영자는 service_role(supabaseServer)로만 조회.

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,         -- 이메일·전화 자유 입력
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 로그인 상태였으면 기록
  ip_hash TEXT,                  -- IP 평문 X, SHA-256 해시만 (남용 추적용)
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE inquiries IS '블로그 마케팅 대행 문의 접수. /api/contact로 들어옴.';

-- 운영자 콘솔에서 최신순 조회용
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at
ON inquiries(created_at DESC);

-- RLS 활성화 — 정책 미생성 시 service_role만 접근(일반 사용자 SELECT/UPDATE/DELETE 차단)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

# CLAUDE.md — 블로그 순위 체커 프로젝트 헌법

## 기술 스택
- 프레임워크: Next.js 14 (App Router)
- UI: Shadcn UI + Tailwind CSS
- DB: Supabase (PostgreSQL)
- 순위 조회: Bright Data SERP API (네이버 블로그탭)
- 배포: Vercel
- 패키지 매니저: pnpm 우선 사용

## 환경변수
- BRIGHTDATA_API_KEY: Bright Data SERP API 키 (네이버 블로그탭 순위 조회용)
- SUPABASE 관련: Supabase 연결 정보
- CRON_SECRET: Vercel Cron 인증용

## 핵심 규칙
- 50줄 이상 수정 전 반드시 내 승인을 기다려
- 수정 후 무엇을 왜 바꿨는지 한 줄로 설명해
- .env.local 파일은 절대 읽거나 수정하지 마
- UI는 항상 Shadcn 컴포넌트를 우선 사용해
- 에러 발생 시 수정 전에 원인 먼저 설명해
- 인라인 스타일 사용 금지, Tailwind 클래스만 사용
# CLAUDE.md — 블로그 순위 체커 프로젝트 헌법

## 기술 스택
- 프레임워크: Next.js 14 (App Router)
- UI: Shadcn UI + Tailwind CSS
- DB: Supabase (PostgreSQL)
- 순위 조회: Bright Data SERP API (네이버 블로그탭)
- 배포: Vercel
- 패키지 매니저: pnpm 우선 사용

## 서비스 정보 (헷갈리기 쉬움 — 먼저 읽을 것)
- **실서비스 도메인: https://sooni.ai.kr** — 배포 반영 확인은 반드시 이 주소로 한다.
- ⚠️ **`blogrank.kr`은 이 프로젝트가 아니다.** 전혀 무관한 타사 사이트(타이틀 "BlogRank")다.
  이전 브랜드 흔적이 robots/sitemap/이메일에 남아 있었고 2026-08-19에 전부 제거했다.
  코드나 문서에서 이 도메인을 보면 잘못된 것이니 되살리지 마라.
- 도메인은 `lib/site.ts`의 `SITE_URL` 상수 한 곳에서만 관리한다.
  robots·sitemap·metadataBase가 이 값을 참조하므로 새 파일에 도메인을 하드코딩하지 마라.
- 배포: main 브랜치에 푸시하면 Vercel이 자동 배포. 반영까지 1~2분 걸린다.
- GitHub: `yhoney051/blog_ranking`

## 외부 API 제약 (실측으로 확인한 값)
- **네이버 검색광고 `keywordstool`**: 요청당 `hintKeywords` **최대 5개**.
  대량 조회는 `lib/naver-searchad.ts`가 5개씩 나눠 순차 호출한다.
  `hintKeywords`에 **공백이 들어가면 400**이 난다 → 조회 전 공백을 제거하고, 화면 표기는 원본을 쓴다.
- **네이버 데이터랩 트렌드**: 한 번에 **최대 5개 그룹**. API 스펙이라 우회 불가.
- **Bright Data**: 계정 정지·프록시 실패 시에도 **HTTP 200 + 빈 본문**을 반환한다.
  실제 사유는 `x-brd-err-msg` 헤더에만 담기므로 `res.ok`만 보고 성공으로 판단하지 마라.

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
// 허브 랜딩페이지 — P0+P1 마케팅·UX 리뉴얼
import Image from 'next/image'
import Link from 'next/link'
import {
  TrendingUp,
  ArrowRight,
  LogIn,
  Gift,
  Sparkles,
  Search,
  Globe,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Footer } from '@/components/layout/footer'
import { supabaseServer } from '@/lib/supabase/server'

// SSR 카운트는 1시간 캐싱
export const revalidate = 3600

// 신뢰 시그널 카운트 — 환경변수 없거나 카운트 임계 미만이면 null 반환 (자동 C 트랙 fallback)
async function getTrustStats(): Promise<{ keywords: number; histories: number } | null> {
  try {
    const [keywordsRes, historiesRes] = await Promise.all([
      supabaseServer.from('keywords').select('*', { count: 'exact', head: true }),
      supabaseServer.from('rank_histories').select('*', { count: 'exact', head: true }),
    ])
    const keywords = keywordsRes.count ?? 0
    const histories = historiesRes.count ?? 0
    // 카운트가 너무 작으면 신뢰 시그널 역효과 → 표시 안 함
    if (keywords < 50 && histories < 200) return null
    return { keywords, histories }
  } catch {
    return null
  }
}

const steps = [
  {
    num: 1,
    icon: Search,
    title: '키워드 입력',
    desc: '네이버에서 검색하는 단어를 적어요. 예: 강남역 피부과',
  },
  {
    num: 2,
    icon: Globe,
    title: '블로그 주소 붙여넣기',
    desc: '내 네이버 블로그 주소를 그대로 복사해서 붙여넣어요.',
  },
  {
    num: 3,
    icon: Calendar,
    title: '순위 결과 + 자동 추적',
    desc: '지금 몇 위인지 바로 알려주고, 매일 자동으로 변동을 체크해요.',
  },
]

const faqs = [
  {
    q: '회원가입 없이 정말 무료로 써볼 수 있나요?',
    a: '네! 가입 안 해도 키워드 3개까지 순위를 확인할 수 있어요. 마음에 들면 그때 가입하시면 돼요.',
  },
  {
    q: '네이버 정책 위반은 아닌가요?',
    a: '사용자가 직접 검색하는 것과 똑같이 N사 통합검색 결과를 조회해서 순위를 알려드려요. 어뷰징 도구가 아니에요.',
  },
  {
    q: '얼마나 자주 순위를 알려주나요?',
    a: '회원가입하면 매일 자동으로 체크해서 변동이 있을 때 알림을 보내드려요.',
  },
  {
    q: '개인정보를 막 수집하나요?',
    a: '이메일과 블로그 주소만 받아요. 비밀번호도 본인만 알 수 있게 암호화돼요.',
  },
]

export default async function HomePage() {
  const stats = await getTrustStats()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="수니" width={32} height={32} className="rounded-lg object-cover" />
          <Image src="/sooni-logo.png" alt="수니 Sooni" width={80} height={32} className="object-contain" />
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            <LogIn className="h-4 w-4 mr-1.5" />
            로그인
          </Button>
        </Link>
      </header>

      {/* 메인 */}
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl mx-auto space-y-12 md:space-y-16">

          {/* 1. 히어로 */}
          <section className="text-center space-y-5 pt-4 md:pt-8">
            <div className="flex justify-center">
              <Badge className="bg-brand-300 text-slate-900 hover:bg-brand-300 px-3 py-1 text-xs md:text-sm font-semibold dark:bg-brand-400 dark:text-slate-900">
                <Gift className="h-3.5 w-3.5 mr-1" />
                가입 없이 3번 무료
              </Badge>
            </div>
            <Image
              src="/logo.png"
              alt="수니"
              width={96}
              height={96}
              className="mx-auto rounded-2xl object-cover w-20 h-20 md:w-24 md:h-24"
              priority
            />
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
                내 블로그, 지금 몇 위에 있을까?
              </h1>
              <p className="text-base md:text-xl text-slate-600 dark:text-slate-300 font-medium">
                수니가 매일 알려드려요 🐑
              </p>
            </div>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              키워드 적고, 블로그 주소 넣으면 끝.
            </p>
          </section>

          {/* 2. 도구 카드 — 메인 2/3 + 서브 1/3 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* 메인 */}
            <Link href="/onboarding" className="group md:col-span-2">
              <div className="relative h-full rounded-2xl ring-2 ring-brand-300 dark:ring-brand-400/60 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-6 md:p-8 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:ring-brand-400">
                <Badge className="absolute top-4 right-4 bg-slate-900 text-brand-300 hover:bg-slate-900 dark:bg-brand-300 dark:text-slate-900 dark:hover:bg-brand-300 text-[10px] font-bold tracking-wider">
                  MAIN
                </Badge>
                <div className="flex items-start gap-4">
                  <Image src="/logo.png" alt="수니" width={56} height={56} className="rounded-xl object-cover flex-shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                      수니 — 블로그 순위 체커
                    </h2>
                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      N사 통합검색에서 내 블로그가 몇 위인지 매일 자동으로 알려드려요.
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-brand-600 dark:text-brand-300 font-bold">✓</span>
                    회원가입 없이 3번 무료
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-brand-600 dark:text-brand-300 font-bold">✓</span>
                    매일 자동 체크 + 변동 알림
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-brand-600 dark:text-brand-300 font-bold">✓</span>
                    1분 안에 결과 확인
                  </li>
                </ul>
                <Button
                  size="lg"
                  className="w-full mt-6 h-12 text-base font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-brand-300 dark:hover:bg-brand-400 dark:text-slate-900"
                >
                  무료로 시작하기
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </Link>

            {/* 서브 */}
            <Link href="/dashboard/keyword-pro" className="group md:col-span-1">
              <div className="h-full rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-5 transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700/50">
                    <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      전문 키워드 검색
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">고급 사용자 전용</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
                  검색량·경쟁도·클릭률·트렌드 그래프까지. 키워드 3개 동시 비교 분석.
                </p>
                <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:gap-2 transition-all">
                  바로가기 <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </section>

          {/* 3. 결과 미리보기 — onboarding mock UI 차용 */}
          <section className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-300 uppercase tracking-wider">미리보기</p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                쓰면 이런 화면이 나와요
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A: 조회 직후 결과 카드 */}
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">키워드</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">강남역 피부과</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">블로그</p>
                    <p className="text-sm text-slate-500">blog.naver.com/sample</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">N사 통합검색 순위</p>
                  <p className="text-4xl md:text-5xl font-bold tabular-nums text-brand-500 dark:text-brand-300">
                    1<span className="text-lg font-normal text-slate-400">위</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">조회 즉시 결과 확인</p>
                </div>
              </div>

              {/* B: 매일 추적 대시보드 — onboarding 226~248행 차용 + 행 추가 */}
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">키워드</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">순위</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">추이</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">변동</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">조회</span>
                </div>
                {/* 행 1 */}
                <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-3 items-center border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">강남역 피부과</span>
                  <div className="text-center">
                    <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg px-1.5 text-xs tabular-nums bg-brand-300 text-slate-800 dark:bg-brand-900/30 dark:text-brand-300 font-bold">1</span>
                  </div>
                  <div className="text-center">
                    <svg width="48" height="20" className="inline-block">
                      <path d="M2,16 L12,12 L24,14 L36,6 L46,3" fill="none" stroke="#E4FD60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="46" cy="3" r="2" fill="#E4FD60" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">▲4</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums text-center">방금</span>
                </div>
                {/* 행 2 */}
                <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-3 items-center border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">다산동 카페</span>
                  <div className="text-center">
                    <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg px-1.5 text-xs tabular-nums bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 font-bold">7</span>
                  </div>
                  <div className="text-center">
                    <svg width="48" height="20" className="inline-block">
                      <path d="M2,8 L12,10 L24,7 L36,11 L46,9" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="46" cy="9" r="2" fill="#94a3b8" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400">—</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums text-center">2시간</span>
                </div>
                {/* 행 3 */}
                <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-3 items-center">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">분당 성형외과</span>
                  <div className="text-center">
                    <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg px-1.5 text-xs tabular-nums bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 font-bold">12</span>
                  </div>
                  <div className="text-center">
                    <svg width="48" height="20" className="inline-block">
                      <path d="M2,4 L12,8 L24,12 L36,10 L46,14" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="46" cy="14" r="2" fill="#f87171" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">▼2</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums text-center">오늘</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-slate-400">* 실제 화면은 더 디테일해요</p>
          </section>

          {/* 4. 사용 방법 3단계 */}
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 dark:text-slate-100 tracking-tight">
              30초면 끝나요
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-brand-300 text-slate-900 text-sm font-bold dark:bg-brand-400">
                      {step.num}
                    </span>
                    <step.icon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 신뢰 시그널 — A안 (DB 카운트). 데이터 부족·환경변수 부재 시 자동 숨김 */}
          {stats && (
            <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-5 text-center space-y-1">
                <p className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-300 tabular-nums">
                  {stats.keywords.toLocaleString()}
                </p>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">추적 중인 키워드</p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-5 text-center space-y-1">
                <p className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-300 tabular-nums">
                  {stats.histories.toLocaleString()}
                </p>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">누적 순위 조회</p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-5 text-center space-y-1 col-span-2 md:col-span-1">
                <p className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-300">매일</p>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">자동 순위 체크</p>
              </div>
            </section>
          )}

          {/* 6. FAQ — native details 사용 (Accordion 컴포넌트 미설치) */}
          <section className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 dark:text-slate-100 tracking-tight">
              자주 묻는 질문
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 px-5 py-4"
                >
                  <summary className="cursor-pointer font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3 list-none">
                    <span>{faq.q}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                  </summary>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* 7. 마지막 CTA */}
          <section className="rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/10 px-6 py-12 md:py-16 text-center space-y-5">
            <Image src="/logo.png" alt="수니" width={64} height={64} className="mx-auto rounded-xl object-cover" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              지금 내 블로그가 몇 위인지
              <br />
              1분 안에 확인해보세요
            </h2>
            <Link href="/onboarding" className="inline-block">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-brand-300 dark:hover:bg-brand-400 dark:text-slate-900"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                무료로 순위 확인하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              가입 없이 3번 무료 · 카드 등록 없음
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}

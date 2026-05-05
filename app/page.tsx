// 허브 랜딩페이지
import Image from 'next/image'
import Link from 'next/link'
import { BarChart3, TrendingUp, ArrowRight, LogIn, Check, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'

const services = [
  {
    title: '수니 — 블로그 순위 체커',
    description: 'N사 통합검색에서 내 글의 검색 순위를 추적하고 변동을 확인하세요.',
    icon: BarChart3,
    href: '/onboarding',
    color: 'lime',
  },
  {
    title: '전문 키워드 검색',
    description: '검색량 + 경쟁도 + 클릭률 + 트렌드 그래프까지 한눈에. 키워드 3개 비교 분석.',
    icon: TrendingUp,
    href: '/dashboard/keyword-pro',
    color: 'emerald',
  },
]

export default function HomePage() {
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
      <main className="flex-1 p-4">
        <div className="w-full max-w-2xl mx-auto space-y-12 py-8">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
              내 블로그는 몇 순위인진 궁금할 땐 ? 수니!
              <Image src="/logo.png" alt="수니" width={28} height={28} className="rounded-lg object-cover" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              사용할 도구를 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <Link key={service.href} href={service.href} className="group">
                <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 h-full flex flex-col gap-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                  <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${
                    service.color === 'lime'
                      ? 'bg-brand-300 text-slate-700 dark:bg-brand-900/30 dark:text-slate-700'
                      : 'bg-brand-300 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                  }`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {service.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {service.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-2">
                    <span className="inline-flex items-center text-sm font-medium text-slate-700 dark:text-slate-700 group-hover:gap-2 transition-all gap-1">
                      시작하기 <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 요금제 안내 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-slate-900 dark:text-slate-100">
              요금제
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 무료 플랜 */}
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">무료</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  0<span className="text-sm font-normal text-slate-500">원/월</span>
                </p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />키워드 10개</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />일 1회 자동 순위 체크</li>
                </ul>
              </div>
              {/* Pro 플랜 */}
              <div className="rounded-xl border-2 border-brand-500 bg-white dark:bg-slate-800 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-yellow-500" />Pro
                </h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  9,900<span className="text-sm font-normal text-slate-500">원/월</span>
                </p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />키워드 100개</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />일 1회 자동 순위 체크</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />우선 고객 지원</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

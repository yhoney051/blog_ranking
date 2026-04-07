// 허브 랜딩페이지 — 순위체커 / 원고 포맷터 선택
import Link from 'next/link'
import { BarChart3, FileText, ArrowRight, LogIn, Check, Crown } from 'lucide-react'
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
    title: '가독성King',
    description: '당신의 블로그가 안 읽히는 이유,\n가독성을 개선해보세요.',
    icon: FileText,
    href: '/dashboard/formatter',
    color: 'emerald',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand-300 text-white dark:bg-brand-300">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">수니</span>
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
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              내 블로그는 몇 순위인진 궁금할 땐 ? 수니!
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
                      ? 'bg-brand-100 text-slate-700 dark:bg-brand-900/30 dark:text-slate-700'
                      : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
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
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-500" />가독성King 무제한</li>
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

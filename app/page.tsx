// 허브 랜딩페이지 — 순위체커 / 원고 포맷터 선택
import Link from 'next/link'
import { BarChart3, FileText, ArrowRight, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

const services = [
  {
    title: '블로그 순위 체커',
    description: '네이버 블로그탭에서 내 글의 검색 순위를 추적하고 변동을 확인하세요.',
    icon: BarChart3,
    href: '/onboarding',
    color: 'violet',
  },
  {
    title: '원고 자동 포맷터',
    description: '블로그 원고를 붙여넣으면 AI가 인용구·구분선 배치를 자동으로 분석해줍니다.',
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
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-600 text-white dark:bg-violet-500">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">블로그 도구</span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            <LogIn className="h-4 w-4 mr-1.5" />
            로그인
          </Button>
        </Link>
      </header>

      {/* 메인 */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              무엇을 도와드릴까요?
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
                    service.color === 'violet'
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {service.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-2">
                    <span className="inline-flex items-center text-sm font-medium text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all gap-1">
                      시작하기 <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="py-4 px-6 border-t border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">이용약관</Link>
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">개인정보 처리방침</Link>
        </div>
      </footer>
    </div>
  )
}

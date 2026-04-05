'use client'

// 온보딩 페이지 — 2스텝 키워드 등록 워크플로우
// Step 1: 키워드 입력 + 예시 이미지
// Step 2: 블로그 URL 입력 → 등록 → 대시보드 이동

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BarChart3, ArrowRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [blogUrl, setBlogUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    if (!keyword.trim()) {
      toast.error('키워드를 입력해주세요.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!blogUrl.trim()) {
      toast.error('블로그 URL을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), blog_url: blogUrl.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '등록에 실패했습니다.')
        return
      }

      toast.success('키워드가 등록되었습니다!')
      router.push('/dashboard')
    } catch {
      toast.error('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 1) handleNext()
      else handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-2 px-6 h-14 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <BarChart3 className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">블로그 순위 체커</span>
      </header>

      {/* 메인 */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8">
          {/* 스텝 인디케이터 */}
          <div className="flex items-center justify-center gap-3">
            <div className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors',
              step >= 1 ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
            )}>1</div>
            <div className={cn(
              'h-px w-12 transition-colors',
              step >= 2 ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'
            )} />
            <div className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors',
              step >= 2 ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
            )}>2</div>
          </div>

          {/* Step 1: 키워드 입력 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  어떤 키워드를 추적할까요?
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  네이버 블로그탭에서 검색되는 키워드를 입력하세요
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="예: 강남 맛집, 분당 성형외과"
                  className="pl-10 h-12 text-base rounded-xl border-slate-200/60 dark:border-slate-700/50"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleNext}
                disabled={!keyword.trim()}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                다음
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              {/* 예시 이미지 — 대시보드 테이블 행 목업 */}
              <div className="pt-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-3">이렇게 순위를 추적할 수 있어요</p>
                <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 overflow-hidden">
                  {/* 헤더 행 */}
                  <div className="grid grid-cols-[1fr_80px_60px_64px_60px] gap-2 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">키워드</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">순위</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">추이</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">변동</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">조회</span>
                  </div>
                  {/* 데이터 행 */}
                  <div className="grid grid-cols-[1fr_80px_60px_64px_60px] gap-2 px-4 py-3 items-center">
                    <div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">대구지방분해주사</span>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg px-1.5 text-xs tabular-nums bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold">1</span>
                    </div>
                    <div className="text-center">
                      <svg width="48" height="20" className="inline-block">
                        <path d="M2,16 L12,12 L24,14 L36,6 L46,3" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="46" cy="3" r="2" fill="#10b981"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">NEW</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 tabular-nums">방금</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 블로그 URL 입력 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  블로그 주소를 알려주세요
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  &ldquo;{keyword}&rdquo; 키워드에서 순위를 추적할 블로그 URL을 입력하세요
                </p>
              </div>

              <Input
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="blog.naver.com/아이디"
                className="h-12 text-base rounded-xl border-slate-200/60 dark:border-slate-700/50"
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 rounded-xl text-sm font-medium"
                >
                  이전
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!blogUrl.trim() || loading}
                  className="flex-1 h-11 rounded-xl text-sm font-medium"
                >
                  {loading ? '등록 중...' : '순위 확인하기'}
                </Button>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                등록 후 대시보드에서 더 많은 키워드를 추가할 수 있어요
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

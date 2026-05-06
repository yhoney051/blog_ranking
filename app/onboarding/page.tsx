'use client'

// 루트 페이지 — 온보딩 + 비회원 순위 조회
// 비로그인: 키워드+URL 입력 → 비회원 조회 (3회) → 결과 표시 → 가입 유도
// 로그인: 키워드+URL 입력 → 등록+조회 → 대시보드 이동

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowRight, Search, ArrowLeft, CheckCircle2, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [blogUrl, setBlogUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [result, setResult] = useState<{ rank: number | null; keyword: string; blog_url: string } | null>(null)
  const [limitReached, setLimitReached] = useState(false)

  // 로그인 상태 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        // 로그인 + 키워드 있으면 대시보드로
        fetch('/api/keywords').then(res => {
          if (res.ok) {
            res.json().then(data => {
              if (Array.isArray(data) && data.length > 0) {
                router.push('/dashboard')
              }
            })
          }
        })
      }
    })
  }, [router])

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

    // 네이버 블로그 형식만 허용 — '22' 같은 의미 없는 입력 차단
    const cleaned = blogUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www\.|m\.)/, '')
    const isNaverBlog = /^blog\.naver\.com\/[a-z0-9_-]{2,}/i.test(cleaned)
    const isIdOnly = /^[a-z0-9_-]{4,}$/i.test(cleaned)
    if (!isNaverBlog && !isIdOnly) {
      toast.error('네이버 블로그 주소를 입력해주세요. (예: blog.naver.com/내아이디)')
      return
    }

    setLoading(true)
    try {
      if (isLoggedIn) {
        // 로그인 상태: 키워드 등록 + 대시보드 이동
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
      } else {
        // 비로그인: 비회원 순위 조회
        const res = await fetch('/api/guest-rank-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: keyword.trim(), blog_url: blogUrl.trim() }),
        })
        const data = await res.json()

        if (res.status === 403 && data.code === 'GUEST_LIMIT_REACHED') {
          setLimitReached(true)
          setStep(3)
          return
        }

        if (!res.ok) {
          toast.error(data.error || '순위 조회에 실패했습니다.')
          return
        }

        setResult(data)
        setStep(3)
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 1) handleNext()
      else if (step === 2) handleSubmit()
    }
  }

  // localStorage에 비회원 키워드 저장 후 대시보드 이동
  const handleGoToDashboard = () => {
    if (result) {
      const existing = JSON.parse(localStorage.getItem('guest_keywords') || '[]')
      const guestKeyword = {
        id: crypto.randomUUID(),
        keyword: result.keyword,
        blog_url: result.blog_url,
        current_rank: result.rank,
        previous_rank: null,
        last_checked_at: new Date().toISOString(),
        tag: null,
        created_at: new Date().toISOString(),
      }
      existing.push(guestKeyword)
      localStorage.setItem('guest_keywords', JSON.stringify(existing))
    }
    router.push('/dashboard')
  }


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="수니" width={32} height={32} className="rounded-lg object-cover" />
          <Image src="/sooni-logo.png" alt="수니 Sooni" width={80} height={32} className="object-contain" />
        </div>
        {!isLoggedIn && (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
              <LogIn className="h-4 w-4 mr-1.5" />
              로그인
            </Button>
          </Link>
        )}
      </header>

      {/* 메인 */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8">
          {/* 스텝 인디케이터 */}
          {step <= 2 && (
            <div className="flex items-center justify-center gap-3">
              <div className={cn(
                'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors',
                step >= 1 ? 'bg-brand-300 text-white dark:bg-brand-300 dark:text-white' : 'bg-slate-200 text-slate-400'
              )}>1</div>
              <div className={cn('h-px w-12 transition-colors', step >= 2 ? 'bg-brand-300 dark:bg-brand-300' : 'bg-slate-200 dark:bg-slate-700')} />
              <div className={cn(
                'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors',
                step >= 2 ? 'bg-brand-300 text-white dark:bg-brand-300 dark:text-white' : 'bg-slate-200 text-slate-400'
              )}>2</div>
            </div>
          )}

          {/* Step 1: 키워드 입력 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  어떤 검색어로 내 블로그를 찾으세요?
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  네이버에서 검색하는 단어를 적어주세요
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="예: 강남역 피부과"
                  className="pl-10 h-12 text-base rounded-xl border-slate-200/60 dark:border-slate-700/50"
                  autoFocus
                />
              </div>

              {/* 예시 칩 — 클릭 한 번으로 키워드 자동 입력, 입력 막힘 방지 */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="text-xs text-slate-400 self-center">예시:</span>
                {['강남역 피부과', '다산동 카페', '분당 성형외과'].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setKeyword(ex)}
                    className="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <Button onClick={handleNext} disabled={!keyword.trim()} className="w-full h-11 rounded-xl text-sm font-medium">
                다음 <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              {/* 예시 목업 */}
              <div className="pt-4">
                <p className="text-xs text-slate-400 text-center mb-3">이렇게 매일 순위를 알려드려요</p>
                <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">키워드</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">순위</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">추이</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">변동</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">조회</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_56px_56px] gap-2 px-3 py-3 items-center">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">강남역 피부과</span>
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg px-1.5 text-xs tabular-nums bg-brand-300 text-slate-800 dark:bg-brand-900/30 dark:text-slate-300 font-bold">1</span>
                    </div>
                    <div className="text-center">
                      <svg width="48" height="20" className="inline-block"><path d="M2,16 L12,12 L24,14 L36,6 L46,3" fill="none" stroke="#E4FD60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="46" cy="3" r="2" fill="#E4FD60"/></svg>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-brand-300 text-brand-500 dark:bg-brand-900/30 dark:text-brand-300">NEW</span>
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums text-center">방금</span>
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
                  내 블로그 주소를 알려주세요
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  &ldquo;{keyword}&rdquo; 검색했을 때 보여주고 싶은 블로그예요
                </p>
              </div>

              <Input
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="blog.naver.com/내아이디"
                className="h-12 text-base rounded-xl border-slate-200/60 dark:border-slate-700/50"
                autoFocus
              />

              <p className="text-[11px] text-slate-400 -mt-3 px-1">
                💡 블로그 주소창에 보이는 그대로 복사해서 붙여넣어주세요
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-xl text-sm font-medium">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> 이전
                </Button>
                <Button onClick={handleSubmit} disabled={!blogUrl.trim() || loading} className="flex-1 h-11 rounded-xl text-sm font-medium">
                  {loading ? '조회 중...' : '내 순위 확인하기'}
                </Button>
              </div>

              {!isLoggedIn && (
                <p className="text-xs text-slate-400 text-center">
                  가입 안 해도 3번까지 무료로 확인할 수 있어요
                </p>
              )}
            </div>
          )}

          {/* Step 3: 결과 표시 */}
          {step === 3 && !limitReached && result && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-brand-500" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  조회 완료!
                </h1>
              </div>

              {/* 결과 카드 */}
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">키워드</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{result.keyword}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">블로그</p>
                    <p className="text-sm text-slate-500">{result.blog_url.replace(/^https?:\/\//, '').slice(0, 30)}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">N사 통합검색 순위</p>
                  {result.rank !== null ? (
                    <p className={cn(
                      'text-4xl font-bold tabular-nums',
                      result.rank <= 3 ? 'text-brand-500' :
                      result.rank <= 10 ? 'text-brand-600' :
                      result.rank <= 30 ? 'text-amber-600' : 'text-red-500'
                    )}>
                      {result.rank}<span className="text-lg font-normal text-slate-400">위</span>
                    </p>
                  ) : (
                    <p className="text-xl text-slate-400">순위권 밖</p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <Button onClick={handleGoToDashboard} className="w-full h-11 rounded-xl text-sm font-medium">
                다음 키워드 추가
              </Button>
            </div>
          )}

          {/* Step 3: 조회 제한 도달 */}
          {step === 3 && limitReached && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-600 text-lg font-bold">!</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  무료 조회를 모두 사용했어요
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  가입하면 무료로 10개 키워드까지 계속 추적할 수 있어요
                </p>
              </div>

              <Link href="/signup" className="block">
                <Button className="w-full h-11 rounded-xl text-sm font-medium">
                  무료로 가입하기
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium">
                  이미 계정이 있어요
                </Button>
              </Link>
            </div>
          )}
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

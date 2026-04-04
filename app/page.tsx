'use client'

// 랜딩 페이지 — 비인증 사용자가 처음 보는 페이지

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Bell } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 네비게이션 */}
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold">블로그 순위 체커</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button>무료로 시작하기</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            내 블로그, 네이버에서<br />
            <span className="text-primary">몇 위</span>인지 바로 확인하세요
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            키워드를 등록하면 네이버 블로그 탭에서의 실제 순위를 자동으로 추적합니다.
            순위 변동을 한눈에 확인하세요.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-base px-8 mt-4">
              무료로 시작하기 →
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">키워드 3개까지 무료</p>
        </div>
      </section>

      {/* 숫자 강조 섹션 */}
      <section className="py-12 px-4 border-b">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary">100+</p>
            <p className="text-sm text-muted-foreground mt-1">블로거 사용 중</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary">1,000+</p>
            <p className="text-sm text-muted-foreground mt-1">키워드 추적</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary">24h</p>
            <p className="text-sm text-muted-foreground mt-1">자동 체크</p>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">실시간 순위 조회</h2>
            <p className="text-sm text-muted-foreground">
              네이버 블로그 탭의 실제 순위를 정확하게 확인합니다
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">순위 변동 추적</h2>
            <p className="text-sm text-muted-foreground">
              어제보다 올랐는지 내렸는지, 변동 추이를 그래프로 확인
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">자동 체크</h2>
            <p className="text-sm text-muted-foreground">
              매일 자동으로 순위를 체크하고 변동 시 알림을 보내드립니다
            </p>
          </div>
        </div>
      </section>

      {/* FAQ 섹션 */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center">자주 묻는 질문</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm">무료로 사용할 수 있나요?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                네, 키워드 3개까지 무료로 사용할 수 있습니다. 추가 키워드는 유료 플랜에서 지원합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm">순위는 어떻게 측정하나요?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                네이버에서 키워드를 검색한 뒤 블로그 탭의 실제 검색 결과에서 순위를 확인합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm">순위 체크는 얼마나 자주 되나요?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                매일 자동으로 1회 체크됩니다. 수동 조회도 언제든 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="py-16 px-4 bg-primary/5 border-t">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground">
            가입 후 1분 안에 첫 번째 키워드의 순위를 확인할 수 있습니다.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-base px-8 mt-2">
              무료로 시작하기 →
            </Button>
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 블로그 순위 체커. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">개인정보 처리방침</Link>
            <span>support@blogrank.kr</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

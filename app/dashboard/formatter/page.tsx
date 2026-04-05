'use client'

// 블로그 원고 포맷터 페이지 — 좌: 원고 입력 / 우: 프리뷰
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { FileText, Loader2, RotateCcw } from 'lucide-react'
import type { FormatResponse } from '@/types/formatter'
import { Header } from '@/components/layout/header'
import { FormatPreview } from '@/components/formatter/format-preview'

const MAX_LENGTH = 10000

export default function FormatterPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<FormatResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFormat = async () => {
    if (text.trim().length < 10) {
      toast.error('최소 10자 이상의 원고를 입력해주세요.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '포맷 분석에 실패했습니다.')
        return
      }
      setResult(data)
    } catch {
      toast.error('요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header title="원고 포맷터" />
      <main className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6">
          {/* 좌측: 원고 입력 */}
          <div className="flex flex-col gap-3 md:w-1/2 md:min-h-0">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="블로그 원고를 여기에 붙여넣으세요..."
              className="flex-1 min-h-[200px] md:min-h-0 text-[15px] leading-relaxed resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {text.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}자
              </span>
              <div className="flex gap-2">
                {result && (
                  <Button variant="outline" onClick={handleFormat} disabled={loading} className="rounded-xl">
                    <RotateCcw className="h-4 w-4 mr-1.5" /> 다시 분석
                  </Button>
                )}
                <Button onClick={handleFormat} disabled={loading || text.trim().length < 10} className="rounded-xl">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> 분석 중...</>
                  ) : (
                    <><FileText className="h-4 w-4 mr-1.5" /> 포맷 분석</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 우측: 프리뷰 */}
          <div className="md:w-1/2 md:min-h-0 overflow-y-auto">
            {loading && (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-6 space-y-4 h-full">
                <Skeleton className="h-4 w-48" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-px w-full my-4" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            )}
            {result && !loading && <FormatPreview result={result} />}
            {!result && !loading && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] h-full min-h-[200px] flex flex-col">
                <div className="flex items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-[#03c75a]">blog</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">원고를 입력하고 포맷 분석을 눌러주세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

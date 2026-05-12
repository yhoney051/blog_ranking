// 블로그 마케팅 대행 문의 페이지 — 비로그인 누구나 접수 가능
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Footer } from '@/components/layout/footer'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, message }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? '문의 접수에 실패했어요.')
        return
      }

      toast.success('문의 받았어요! 빠르게 연락드릴게요.')
      setName('')
      setContact('')
      setMessage('')
    } catch {
      toast.error('네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-slate-200/60 dark:border-slate-700/50">
        <Link href="/" className="flex items-center gap-1">
          <Image src="/logo.png" alt="수니" width={32} height={32} className="rounded-lg object-cover" />
          <Image src="/sooni-logo.png" alt="수니 Sooni" width={80} height={32} className="object-contain" />
        </Link>
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            돌아가기
          </Button>
        </Link>
      </header>

      <main className="flex-1 px-4 py-10 md:py-14">
        <div className="w-full max-w-xl mx-auto space-y-8">
          {/* 히어로 */}
          <section className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-300 text-slate-900 text-xs font-semibold dark:bg-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              블로그 마케팅 대행
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              내 블로그, 어디부터 손봐야 할지
              <br />
              수니에게 맡겨보세요
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              간단히 남겨주시면, 빠르게 연락드려서 어떤 도움이 필요한지 들어볼게요.
            </p>
          </section>

          {/* 폼 카드 */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 md:p-7 space-y-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                maxLength={40}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact" className="text-sm font-medium">
                연락처 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="이메일이나 전화번호 편하신 걸로"
                maxLength={80}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">남기신 연락처로만 회신드려요.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-sm font-medium">
                문의 내용 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="어떤 블로그를 운영하시는지, 어떤 도움이 필요하신지 편하게 적어주세요."
                rows={6}
                maxLength={1000}
                required
                disabled={loading}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right tabular-nums">
                {message.length}/1000
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 text-base font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-brand-300 dark:hover:bg-brand-400 dark:text-slate-900"
            >
              {loading ? (
                '보내는 중...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  문의 보내기
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              문의 내용은 운영자만 확인하며, 마케팅 외 목적으로 사용하지 않아요.
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

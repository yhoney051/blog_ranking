'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

type Props = { onAdded: () => void }

// 키워드 + 블로그 URL 등록 폼
export function KeywordForm({ onAdded }: Props) {
  const [keyword, setKeyword] = useState('')
  const [blogUrl, setBlogUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, blog_url: blogUrl }),
      })
      if (res.status === 403) {
        const body = await res.json()
        toast.error(body.error || '키워드 등록 한도에 도달했습니다.')
        return
      }
      if (!res.ok) throw new Error('등록 실패')
      setKeyword('')
      setBlogUrl('')
      setOpen(false)
      toast.success('키워드가 등록되었습니다')
      onAdded()
    } catch {
      toast.error('키워드 등록에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Plus className="h-4 w-4 text-primary" />
          키워드 등록
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 flex flex-col sm:flex-row gap-3 sm:items-end border-t border-border pt-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keyword" className="text-xs text-muted-foreground">키워드</Label>
            <Input id="keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 강남 맛집" required className="h-9" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="url" className="text-xs text-muted-foreground">네이버 블로그 URL</Label>
            <Input id="url" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} placeholder="blog.naver.com/xxx" required className="h-9" />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto h-9 px-6">
            {loading ? '등록 중...' : '등록'}
          </Button>
        </form>
      )}
    </div>
  )
}

'use client'

// 전문 키워드 결과 표에서 체크한 키워드를 순위 추적 목록에 바로 등록하는 패널
// 키워드는 이미 정해져 있으므로 사용자는 블로그 주소와 태그만 한 번 입력하면 된다.
// 등록은 /api/keywords로 키워드당 1건씩 보내고, 결과를 성공/중복/실패로 분류해 보여준다.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ListPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 등록할 키워드 목록 (표에서 체크한 것) */
  keywords: string[]
}

export function RegisterSelectedSheet({ open, onOpenChange, keywords }: Props) {
  const router = useRouter()
  const [blogUrl, setBlogUrl] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blogUrl.trim()) {
      toast.error('블로그 주소를 입력해주세요')
      return
    }
    if (keywords.length === 0) {
      toast.error('등록할 키워드가 없습니다')
      return
    }

    setLoading(true)
    try {
      const results = await Promise.allSettled(
        keywords.map((kw) =>
          fetch('/api/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // 순위 조회 기준과 맞추기 위해 키워드 내부 공백까지 제거 ("강남 맛집" → "강남맛집")
              keyword: kw.replace(/\s+/g, ''),
              blog_url: blogUrl.trim(),
              tag: tag.trim() || undefined,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              // 에러 코드를 message prefix로 전달해 분류에 사용
              throw new Error(`[${body.code || 'ERROR'}] ${body.error || '등록 실패'}`)
            }
            return res.json()
          })
        )
      )

      const reasonOf = (r: PromiseSettledResult<unknown>) =>
        r.status === 'rejected' ? String((r as PromiseRejectedResult).reason?.message ?? '') : ''

      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const dupCount = results.filter((r) => /\[DUPLICATE_KEYWORD\]/.test(reasonOf(r))).length
      const failCount = results.length - successCount - dupCount
      // 한도 초과는 사용자가 조치해야 하는 에러라 메시지를 그대로 노출
      const limitFail = results.find((r) => /한도/.test(reasonOf(r))) as
        | PromiseRejectedResult
        | undefined

      if (successCount > 0) {
        const parts = [`${successCount}개 등록`]
        if (dupCount > 0) parts.push(`${dupCount}개 이미 등록됨`)
        toast.success(parts.join(', '))
        // 대시보드 키워드 목록을 새로 불러오도록 서버 컴포넌트 갱신
        router.refresh()
      } else if (dupCount > 0 && failCount === 0) {
        toast.error(dupCount === 1 ? '이미 등록된 키워드입니다' : `${dupCount}개 모두 이미 등록됨`)
      }

      if (failCount > 0) {
        if (limitFail) toast.error(limitFail.reason.message.replace(/^\[[^\]]+\]\s*/, ''))
        else toast.error(`${failCount}개 등록 실패`)
      }

      // 하나라도 등록됐으면 패널을 닫고 입력값 초기화
      if (successCount > 0) {
        setTag('')
        onOpenChange(false)
      }
    } catch {
      toast.error('등록 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-brand-500" />
            선택한 키워드 등록
          </SheetTitle>
          <SheetDescription>
            블로그 주소와 태그만 입력하면 체크한 키워드 {keywords.length}개가 순위 추적 목록에
            한 번에 등록됩니다.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
          <div className="space-y-1.5">
            <Label htmlFor="register-blog-url">블로그 주소</Label>
            <Input
              id="register-blog-url"
              placeholder="blog.naver.com/내아이디"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              선택한 키워드 전체에 같은 블로그 주소가 적용됩니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-tag">태그 (선택)</Label>
            <Input
              id="register-tag"
              placeholder="예: 인테리어, 부산권역"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xs font-medium mb-2">
              등록할 키워드{' '}
              <span className="text-muted-foreground tabular-nums">{keywords.length}개</span>
            </p>
            <div className="flex-1 overflow-auto rounded-lg border p-3">
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[11px] font-normal">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={loading || !blogUrl.trim()} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  등록 중...
                </>
              ) : (
                `${keywords.length}개 키워드 등록하기`
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

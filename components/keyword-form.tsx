'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react'
import { toast } from 'sonner'

type Props = { onAdded: () => void }

type Row = { keyword: string; blogUrl: string; tag: string }

const MAX_ROWS = 10
const emptyRow = (): Row => ({ keyword: '', blogUrl: '', tag: '' })

// 키워드 + 블로그 URL 다중 등록 폼 (최대 10개까지 한 번에 등록)
export function KeywordForm({ onAdded }: Props) {
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, emptyRow()]))
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 빈 행 제외 (키워드와 URL 둘 다 비어있으면 스킵)
    const validRows = rows.filter((r) => r.keyword.replace(/\s+/g, '') && r.blogUrl.trim())
    if (validRows.length === 0) {
      toast.error('등록할 키워드를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const results = await Promise.allSettled(
        validRows.map((r) =>
          fetch('/api/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // 키워드 내부 공백까지 모두 제거 ("강남 맛집" → "강남맛집")
              keyword: r.keyword.replace(/\s+/g, ''),
              blog_url: r.blogUrl.trim(),
              tag: r.tag.trim() || undefined,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error || '등록 실패')
            }
            return res.json()
          })
        )
      )

      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const failCount = results.length - successCount

      // 한도 초과 에러 감지 (첫 실패 메시지에 "한도" 포함 시 우선 표시)
      const firstFail = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined
      const limitReached = firstFail?.reason?.message?.includes('한도')

      if (successCount > 0) {
        toast.success(`${successCount}개 키워드가 등록되었습니다`)
        onAdded()
      }
      if (failCount > 0) {
        if (limitReached) {
          toast.error(firstFail!.reason.message)
        } else {
          toast.error(`${failCount}개 등록 실패`)
        }
        // 실패한 행만 남기기
        const failedRows = validRows.filter((_, i) => results[i].status === 'rejected')
        setRows(failedRows.length > 0 ? failedRows : [emptyRow()])
      } else {
        // 전부 성공 → 초기화 및 닫기
        setRows([emptyRow()])
        setOpen(false)
      }
    } catch {
      toast.error('키워드 등록에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const validCount = rows.filter((r) => r.keyword.replace(/\s+/g, '') && r.blogUrl.trim()).length
  const canAddMore = rows.length < MAX_ROWS

  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Plus className="h-4 w-4 text-brand-500" />
          키워드 등록
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-4">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-1.5">
                {index === 0 && (
                  <Label htmlFor={`keyword-${index}`} className="text-xs text-muted-foreground">
                    키워드
                  </Label>
                )}
                <Input
                  id={`keyword-${index}`}
                  value={row.keyword}
                  onChange={(e) => updateRow(index, { keyword: e.target.value })}
                  placeholder="예: 강남 맛집"
                  className="h-9"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                {index === 0 && (
                  <Label htmlFor={`url-${index}`} className="text-xs text-muted-foreground">
                    네이버 블로그 URL
                  </Label>
                )}
                <Input
                  id={`url-${index}`}
                  value={row.blogUrl}
                  onChange={(e) => updateRow(index, { blogUrl: e.target.value })}
                  placeholder="blog.naver.com/xxx"
                  className="h-9"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1.5">
                {index === 0 && (
                  <Label htmlFor={`tag-${index}`} className="text-xs text-muted-foreground">
                    태그 (선택)
                  </Label>
                )}
                <Input
                  id={`tag-${index}`}
                  value={row.tag}
                  onChange={(e) => updateRow(index, { tag: e.target.value })}
                  placeholder="예: 맛집"
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={rows.length <= 1}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                aria-label="행 삭제"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              disabled={!canAddMore}
              className="w-full sm:flex-1 h-9 gap-1"
            >
              <Plus className="h-4 w-4" />
              {canAddMore ? '행 추가' : `최대 ${MAX_ROWS}개까지 추가 가능합니다`}
            </Button>
            <Button
              type="submit"
              disabled={loading || validCount === 0}
              className="w-full sm:w-auto h-9 px-6"
            >
              {loading ? '등록 중...' : validCount > 0 ? `${validCount}개 등록` : '등록'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

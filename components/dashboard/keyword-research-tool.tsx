"use client"

// 키워드 발굴 도구 — 대시보드 funnel 입구
// 입력 키워드의 검색량 + 연관 키워드를 한 번에 보여주고,
// 마음에 드는 키워드를 체크박스로 다중 선택해 일괄 추적 등록한다.
// 비회원도 조회 가능하지만, '추적 추가'는 가입 페이지로 유도.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Sparkles, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type SearchVolumeRow = {
  keyword: string
  monthlyPcQcCnt: number
  monthlyMobileQcCnt: number
  totalSearchVolume: number
}

type ResearchResponse = {
  searched: SearchVolumeRow[]
  related: SearchVolumeRow[]
  cached?: boolean
  remaining?: number
}

interface Props {
  isLoggedIn: boolean | null
  onAdded?: () => void
}

export function KeywordResearchTool({ isLoggedIn, onAdded }: Props) {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [data, setData] = useState<ResearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [blogUrl, setBlogUrl] = useState("")
  const [isAdding, startAdding] = useTransition()

  // 입력값을 쉼표/줄바꿈 기준으로 쪼개고 최대 5개로 제한
  const handleSearch = async () => {
    setError(null)
    const keywords = input
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 5)

    if (keywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.")
      return
    }

    setLoading(true)
    setSelected(new Set())
    try {
      const res = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "검색 중 오류가 발생했습니다.")
        setData(null)
      } else {
        setData(json)
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (keyword: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(keyword)) next.delete(keyword)
      else next.add(keyword)
      return next
    })
  }

  // 선택된 키워드들을 같은 블로그 URL로 일괄 등록
  const handleAddTracked = () => {
    if (selected.size === 0) return
    if (!isLoggedIn) {
      router.push("/signup")
      return
    }
    if (!blogUrl.trim()) {
      toast.error("블로그 URL을 입력해주세요.")
      return
    }

    startAdding(async () => {
      const list = Array.from(selected)
      let okCount = 0
      let failCount = 0
      for (const kw of list) {
        try {
          const res = await fetch("/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: kw, blog_url: blogUrl.trim() }),
          })
          if (res.ok) okCount++
          else failCount++
        } catch {
          failCount++
        }
      }

      if (okCount > 0) {
        toast.success(
          `${okCount}개 키워드를 추가했어요${failCount > 0 ? ` (실패 ${failCount}개)` : ""}`
        )
        setSelected(new Set())
        setBlogUrl("")
        onAdded?.()
      } else {
        toast.error("추가에 실패했습니다.")
      }
    })
  }

  const all = data ? [...data.searched, ...data.related] : []
  const searchedSet = new Set(
    data?.searched.map((s) => s.keyword.toLowerCase().trim()) ?? []
  )
  const hasResult = all.length > 0

  return (
    <div className="rounded-xl border bg-card p-4 lg:p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">키워드 발굴</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            어떤 키워드로 글을 써야 할지 찾아보세요. 우리 동네 검색량 50회만 돼도 의미 있는 키워드예요.
          </p>
        </div>
      </div>

      {/* 입력창 + 검색 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="예: 다산동 카페, 강남 미용실 (쉼표로 구분, 최대 5개)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          disabled={loading}
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !input.trim()}
          className="sm:w-32"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-1.5" />
              검색하기
            </>
          )}
        </Button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="rounded-lg border border-red-200/60 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      )}

      {/* 빈 상태 (onboarding 카피) */}
      {!loading && !data && !error && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
          <p className="text-sm font-medium">우리 동네 사람들이 뭘 검색하는지 알아보세요</p>
          <p className="text-xs text-muted-foreground mt-1">
            지역명 + 업종으로 검색해보세요. 예: &quot;다산동 카페&quot;
          </p>
        </div>
      )}

      {/* 결과 테이블 */}
      {!loading && hasResult && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-foreground">
                  <th className="w-10 px-3 py-2 text-left"></th>
                  <th className="px-3 py-2 text-left">키워드</th>
                  <th className="px-3 py-2 text-right">월간 검색량</th>
                  <th className="px-3 py-2 text-center">구분</th>
                </tr>
              </thead>
              <tbody>
                {all.map((row) => {
                  const checked = selected.has(row.keyword)
                  const isSearched = searchedSet.has(
                    row.keyword.toLowerCase().trim()
                  )
                  return (
                    <tr
                      key={row.keyword}
                      className={cn(
                        "border-t",
                        isSearched && "bg-brand-300/30 dark:bg-brand-900/20"
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(row.keyword)}
                          className="h-4 w-4 rounded border-border accent-brand-500 shrink-0"
                          aria-label={`${row.keyword} 선택`}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{row.keyword}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.totalSearchVolume < 10 ? (
                          <span className="text-muted-foreground">10 미만</span>
                        ) : (
                          row.totalSearchVolume.toLocaleString("ko-KR")
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={isSearched ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {isSearched ? "내 검색" : "연관"}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 하단 인라인 추적 추가 영역 (선택 1개 이상일 때만 노출) */}
          {selected.size > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">
                선택한 {selected.size}개 키워드를 추적 추가
              </p>
              {isLoggedIn ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="내 블로그 URL (예: blog.naver.com/내아이디)"
                    value={blogUrl}
                    onChange={(e) => setBlogUrl(e.target.value)}
                    disabled={isAdding}
                  />
                  <Button
                    onClick={handleAddTracked}
                    disabled={isAdding || !blogUrl.trim()}
                    className="sm:w-40"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1.5" />
                        추적 추가
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => router.push("/signup")}
                  className="w-full"
                >
                  가입하고 {selected.size}개 추적하기
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

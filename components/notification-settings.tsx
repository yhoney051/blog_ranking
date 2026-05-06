'use client'

// 텔레그램 알림 설정 컴포넌트 — 설정 페이지에서 사용

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Bell, Send, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Settings {
  telegram_chat_id: string | null
  telegram_username: string | null
  enabled: boolean
  notify_rank_up: boolean
  notify_rank_down: boolean
  notify_new_entry: boolean
  notify_dropped_out: boolean
  notify_first_page_only: boolean
  notify_hour_kst: number
}

interface HistoryEntry {
  id: string
  sent_at: string
  channel: string
  status: 'sent' | 'failed' | 'blocked'
  keyword_count: number
  message_preview: string | null
}

const NOTIFY_HOUR_OPTIONS: { value: number; label: string; sub: string }[] = [
  { value: 9, label: '아침 9시', sub: '하루 시작 전 확인' },
  { value: 12, label: '정오 12시', sub: '점심 시간 체크' },
  { value: 19, label: '저녁 7시', sub: '하루 마감 정리' },
]

// 라이트 모드 brand color(lime)가 너무 밝아 흰 배경에서 잘 안 보이므로
// 알림 설정 Switch는 명시적으로 진한 emerald + slate 회색으로 시각 대비 강화
const SWITCH_CLS =
  'data-checked:bg-emerald-500 data-unchecked:bg-slate-300 dark:data-checked:bg-emerald-500 dark:data-unchecked:bg-slate-600'

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/settings')
      if (res.ok) {
        setSettings(await res.json())
      }
    } catch {
      // 무시
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/history?limit=5')
      if (res.ok) {
        const json = await res.json()
        setHistory(Array.isArray(json.items) ? json.items : [])
      }
    } catch {
      // 무시 — 이력은 보조 정보라 실패해도 메인 UI는 정상
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchHistory()
  }, [fetchSettings, fetchHistory])

  // 텔레그램 연동
  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/telegram/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '연동 실패')
        setConnecting(false)
        return
      }

      // 딥링크 열기
      window.open(data.url, '_blank')
      toast.info('텔레그램 앱에서 "시작" 버튼을 눌러주세요.')

      // 연동 완료까지 폴링 (3초 간격, 최대 60초)
      let attempts = 0
      const maxAttempts = 20
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetch('/api/notifications/settings')
          if (pollRes.ok) {
            const pollData = await pollRes.json()
            if (pollData.telegram_chat_id) {
              clearInterval(pollInterval)
              setSettings(pollData)
              setConnecting(false)
              toast.success('텔레그램 연동이 완료되었습니다!')
              return
            }
          }
        } catch {
          // 무시
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setConnecting(false)
          toast.error('연동 시간이 초과되었습니다. 다시 시도해주세요.')
        }
      }, 3000)
    } catch {
      toast.error('연동 중 오류가 발생했습니다.')
      setConnecting(false)
    }
  }

  // 텔레그램 연동 해제
  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/telegram/disconnect', { method: 'POST' })
      if (res.ok) {
        setSettings((prev) =>
          prev
            ? { ...prev, telegram_chat_id: null, telegram_username: null, enabled: false }
            : null
        )
        toast.success('텔레그램 연동이 해제되었습니다.')
      } else {
        toast.error('연동 해제에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setDisconnecting(false)
    }
  }

  // 설정 변경 — boolean 토글과 number 옵션(notify_hour_kst) 공용. 실패 시 이전 값으로 롤백.
  const handleUpdate = async <K extends keyof Settings>(field: K, value: Settings[K]) => {
    let prevValue: Settings[K] | undefined
    setSettings((prev) => {
      if (!prev) return prev
      prevValue = prev[field]
      return { ...prev, [field]: value }
    })

    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        setSettings((prev) =>
          prev && prevValue !== undefined ? { ...prev, [field]: prevValue! } : prev
        )
        toast.error('설정 변경에 실패했습니다.')
      }
    } catch {
      setSettings((prev) =>
        prev && prevValue !== undefined ? { ...prev, [field]: prevValue! } : prev
      )
      toast.error('설정 변경에 실패했습니다.')
    }
  }

  // boolean 전용 헬퍼 (Switch onCheckedChange 시그니처용)
  const handleToggle = (field: keyof Settings, value: boolean) => handleUpdate(field, value as never)

  // 테스트 알림 발송
  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/notifications/settings', { method: 'POST' })
      if (res.ok) {
        toast.success('텔레그램으로 테스트 알림을 보냈습니다.')
      } else {
        const data = await res.json()
        toast.error(data.error || '테스트 알림 발송 실패')
      }
      // 결과와 무관하게 이력 갱신 (성공이든 실패든 history에 기록되므로)
      void fetchHistory()
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setTesting(false)
    }
  }

  const isConnected = settings?.telegram_chat_id != null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle className="text-lg">알림 설정</CardTitle>
        </div>
        <CardDescription>텔레그램으로 매일 순위 변동 리포트를 받아보세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            {/* 텔레그램 연동 상태 */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">텔레그램</p>
                {isConnected && (
                  <p className="text-xs text-muted-foreground truncate">
                    {settings?.telegram_username
                      ? `@${settings.telegram_username}`
                      : '연동된 계정'}
                  </p>
                )}
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                    연동됨
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    {disconnecting ? '해제 중...' : '해제'}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnect} disabled={connecting} size="sm">
                  <Send className="h-4 w-4 mr-1" />
                  {connecting ? '연동 대기 중...' : '텔레그램 연동하기'}
                </Button>
              )}
            </div>

            {/* 미연동 사용자 안내 — 연동 시 받게 될 알림 미리보기 + 핵심 가치 */}
            {!isConnected && (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold">📱 연동하면 이런 알림을 받게 됩니다</p>
                <div className="rounded-lg bg-card border p-3 text-[11px] leading-relaxed space-y-0.5">
                  <p className="font-semibold">📊 일일 순위 리포트 (2026-05-05)</p>
                  <p className="mt-1.5 font-medium">🔵 신규 진입</p>
                  <p>• &quot;강남 미용실&quot; — 8위</p>
                  <p className="mt-1.5 font-medium">📈 순위 상승</p>
                  <p>• &quot;다산동 카페&quot; 12위 → 7위 (▲5)</p>
                  <p className="mt-1.5 font-medium">❌ 순위권 이탈</p>
                  <p>• &quot;압구정 피부과&quot;</p>
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ 매일 선택한 시각(아침 9시 / 정오 / 저녁 7시)에 자동 발송</li>
                  <li>✓ 1페이지 변동만 보기 등 노이즈 필터 옵션</li>
                  <li>✓ <b>/rank</b> 명령으로 언제든 즉시 순위 확인</li>
                  <li>✓ <b>/today</b>, <b>/keywords</b>, <b>/stop</b> 명령 지원</li>
                </ul>
              </div>
            )}

            {/* 알림 설정 (연동된 경우만) */}
            {isConnected && (
              <>
                <hr />
                <div className="space-y-3">
                  {/* 마스터 토글 — 더 강조 (큰 글자 + 보조 설명) */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Label htmlFor="enabled" className="text-sm font-semibold cursor-pointer">
                        알림 받기
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        끄면 매일 자동 발송이 멈춥니다 (수동 테스트는 그대로 가능)
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={settings?.enabled ?? true}
                      onCheckedChange={(v) => handleToggle('enabled', v)}
                      className={SWITCH_CLS}
                    />
                  </div>

                  {/* 알림 시각 선택 — 마스터 토글과 같은 disabled 흐름 */}
                  <div
                    className={cn(
                      'pl-4 border-l-2 border-border space-y-2 transition-opacity',
                      !settings?.enabled && 'opacity-40 pointer-events-none'
                    )}
                    aria-disabled={!settings?.enabled}
                  >
                    <Label className="text-sm">알림 받을 시각</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {NOTIFY_HOUR_OPTIONS.map((opt) => {
                        const active = (settings?.notify_hour_kst ?? 9) === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleUpdate('notify_hour_kst', opt.value)}
                            disabled={!settings?.enabled}
                            className={cn(
                              'rounded-lg border px-3 py-2 text-left transition-colors',
                              active
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background hover:bg-muted'
                            )}
                          >
                            <div className={cn('text-sm font-semibold', active && 'text-primary')}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 하위 토글 — 마스터 OFF 시 사라지지 않고 disabled로 흐림 */}
                  <div
                    className={cn(
                      'pl-4 border-l-2 border-border space-y-3 transition-opacity',
                      !settings?.enabled && 'opacity-40 pointer-events-none'
                    )}
                    aria-disabled={!settings?.enabled}
                  >
                    {/* 임계값: 1페이지(1~10위) 변동만 */}
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
                      <div className="min-w-0">
                        <Label htmlFor="notify_first_page_only" className="text-sm font-medium cursor-pointer">
                          1페이지(1~10위) 변동만 알림
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          노이즈를 줄여 의미 있는 변동만 받기 — 11위 밖 사이의 변동은 무시
                        </p>
                      </div>
                      <Switch
                        id="notify_first_page_only"
                        checked={settings?.notify_first_page_only ?? false}
                        onCheckedChange={(v) => handleToggle('notify_first_page_only', v)}
                        disabled={!settings?.enabled}
                        className={SWITCH_CLS}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify_rank_up" className="text-sm">
                        순위 상승 시
                      </Label>
                      <Switch
                        id="notify_rank_up"
                        checked={settings?.notify_rank_up ?? true}
                        onCheckedChange={(v) => handleToggle('notify_rank_up', v)}
                        disabled={!settings?.enabled}
                        className={SWITCH_CLS}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify_rank_down" className="text-sm">
                        순위 하락 시
                      </Label>
                      <Switch
                        id="notify_rank_down"
                        checked={settings?.notify_rank_down ?? true}
                        onCheckedChange={(v) => handleToggle('notify_rank_down', v)}
                        disabled={!settings?.enabled}
                        className={SWITCH_CLS}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify_new_entry" className="text-sm">
                        신규 진입 시
                      </Label>
                      <Switch
                        id="notify_new_entry"
                        checked={settings?.notify_new_entry ?? true}
                        onCheckedChange={(v) => handleToggle('notify_new_entry', v)}
                        disabled={!settings?.enabled}
                        className={SWITCH_CLS}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify_dropped_out" className="text-sm">
                        순위권 이탈 시
                      </Label>
                      <Switch
                        id="notify_dropped_out"
                        checked={settings?.notify_dropped_out ?? true}
                        onCheckedChange={(v) => handleToggle('notify_dropped_out', v)}
                        disabled={!settings?.enabled}
                        className={SWITCH_CLS}
                      />
                    </div>
                  </div>
                </div>

                <hr />
                <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                  {testing ? '발송 중...' : '테스트 알림 보내기'}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 텔레그램에서 <b>/rank</b> 명령어로 현재 순위를 바로 확인할 수 있습니다
                </p>

                {/* 발송 이력 — 최근 5건. 비어 있으면 안내. 트러블슈팅용 단서 제공. */}
                <div className="mt-4 space-y-2">
                  <Label className="text-sm">최근 알림 이력</Label>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      아직 발송된 알림이 없습니다. 매일 설정한 시각에 변동이 있을 때만 발송돼요.
                    </p>
                  ) : (
                    <ul className="rounded-lg border divide-y">
                      {history.map((h) => (
                        <li key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                'inline-block h-1.5 w-1.5 rounded-full shrink-0',
                                h.status === 'sent' && 'bg-emerald-500',
                                h.status === 'failed' && 'bg-amber-500',
                                h.status === 'blocked' && 'bg-red-500'
                              )}
                              aria-label={h.status}
                            />
                            <span className="truncate">
                              {h.message_preview ?? '(미리보기 없음)'}
                            </span>
                          </div>
                          <span className="text-muted-foreground shrink-0 ml-2 tabular-nums">
                            {new Date(h.sent_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

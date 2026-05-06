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
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)

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

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

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

  // 설정 토글 변경
  const handleToggle = async (field: keyof Settings, value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null))

    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        // 실패 시 롤백
        setSettings((prev) => (prev ? { ...prev, [field]: !value } : null))
        toast.error('설정 변경에 실패했습니다.')
      }
    } catch {
      setSettings((prev) => (prev ? { ...prev, [field]: !value } : null))
      toast.error('설정 변경에 실패했습니다.')
    }
  }

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
                    />
                  </div>

                  {/* 하위 토글 — 마스터 OFF 시 사라지지 않고 disabled로 흐림 */}
                  <div
                    className={cn(
                      'pl-4 border-l-2 border-border space-y-3 transition-opacity',
                      !settings?.enabled && 'opacity-40 pointer-events-none'
                    )}
                    aria-disabled={!settings?.enabled}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notify_rank_up" className="text-sm">
                        순위 상승 시
                      </Label>
                      <Switch
                        id="notify_rank_up"
                        checked={settings?.notify_rank_up ?? true}
                        onCheckedChange={(v) => handleToggle('notify_rank_up', v)}
                        disabled={!settings?.enabled}
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
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

// 설정 페이지 — 계정 정보, 사용량, 비밀번호 변경

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ProfileData {
  email: string
  plan: string
  keyword_limit: number
  keyword_count: number
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('비밀번호는 최소 6자리 이상이어야 합니다.')
      return
    }

    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('비밀번호가 변경되었습니다.')
      setNewPassword('')
      setConfirmPassword('')
    }
    setChangingPassword(false)
  }

  return (
    <>
      <Header title="설정" />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
          {/* 계정 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">계정 정보</CardTitle>
              <CardDescription>현재 계정과 플랜 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : profile ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">이메일</span>
                    <span className="text-sm font-medium">{profile.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">플랜</span>
                    <Badge variant="secondary">{profile.plan === 'free' ? '무료' : profile.plan}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">키워드 사용량</span>
                    <span className="text-sm font-medium">
                      {profile.keyword_count} / {profile.keyword_limit}개
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-destructive">프로필 정보를 불러올 수 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 비밀번호 변경 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">비밀번호 변경</CardTitle>
              <CardDescription>새로운 비밀번호를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="최소 6자리"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 플랜 안내 */}
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Pro 플랜으로 업그레이드하면 키워드를 최대 100개까지 등록할 수 있습니다.
              </p>
              <a href="/dashboard/billing">
                <Button variant="outline">결제 관리로 이동</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

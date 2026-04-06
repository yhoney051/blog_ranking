'use client'

// 로그인/회원가입 공용 폼 컴포넌트

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isLogin = mode === 'login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('확인 이메일을 발송했습니다. 받은편지함(또는 스팸함)을 확인하고, 이메일의 링크를 클릭하면 가입이 완료됩니다.')
      }
    }

    setLoading(false)
  }

  // 소셜 로그인 핸들러
  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setSocialLoading(null)
    }
    // OAuth는 리다이렉트되므로 setSocialLoading(null) 불필요
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLogin ? '로그인' : '회원가입'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? '수니에 로그인하세요'
              : '무료로 시작하세요 — 키워드 3개까지 무료'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 회원가입 성공 시 안내 메시지만 표시 */}
          {message ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
                {message}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">로그인 페이지로 돌아가기</Link>
              </p>
            </div>
          ) : (
            <>
              {/* 소셜 로그인 버튼 */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={socialLoading !== null}
                  onClick={() => handleSocialLogin('google')}
                >
                  {socialLoading === 'google' ? '연결 중...' : (
                    <>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google로 {isLogin ? '로그인' : '시작하기'}
                    </>
                  )}
                </Button>
              </div>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  또는
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="최소 6자리"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {isLogin && (
                  <p className="text-right">
                    <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                      비밀번호를 잊으셨나요?
                    </Link>
                  </p>
                )}

                {/* 회원가입 시 약관 동의 */}
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    가입 시{' '}
                    <Link href="/terms" target="_blank" className="text-primary hover:underline">이용약관</Link>
                    {' '}및{' '}
                    <Link href="/privacy" target="_blank" className="text-primary hover:underline">개인정보 처리방침</Link>
                    에 동의하는 것으로 간주됩니다.
                  </p>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {isLogin ? (
                  <>계정이 없으신가요? <Link href="/signup" className="text-primary hover:underline">회원가입</Link></>
                ) : (
                  <>이미 계정이 있으신가요? <Link href="/login" className="text-primary hover:underline">로그인</Link></>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

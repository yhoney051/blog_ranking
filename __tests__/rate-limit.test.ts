import { describe, it, expect, beforeEach, vi } from 'vitest'

// 각 테스트마다 모듈 상태 초기화를 위해 dynamic import 사용
let rateLimit: typeof import('@/lib/rate-limit').rateLimit
let getClientIp: typeof import('@/lib/rate-limit').getClientIp

beforeEach(async () => {
  // 모듈 캐시 리셋 (인메모리 Map 초기화)
  vi.resetModules()
  const mod = await import('@/lib/rate-limit')
  rateLimit = mod.rateLimit
  getClientIp = mod.getClientIp
})

describe('rateLimit', () => {
  it('제한 내 요청은 성공한다', () => {
    const result = rateLimit('test-key', 3, 60000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('연속 요청 시 remaining이 감소한다', () => {
    rateLimit('test-key', 3, 60000)
    const r2 = rateLimit('test-key', 3, 60000)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit('test-key', 3, 60000)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('제한 초과 시 실패한다', () => {
    rateLimit('test-key', 2, 60000)
    rateLimit('test-key', 2, 60000)
    const result = rateLimit('test-key', 2, 60000)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it('다른 키는 독립적으로 추적된다', () => {
    rateLimit('key-a', 1, 60000)
    const result = rateLimit('key-b', 1, 60000)
    expect(result.success).toBe(true)
  })

  it('윈도우 만료 후 카운트가 리셋된다', () => {
    // 매우 짧은 윈도우 (1ms) 사용
    rateLimit('test-key', 1, 1)

    // 윈도우 만료를 위해 약간 대기
    vi.useFakeTimers()
    vi.advanceTimersByTime(2)
    const result = rateLimit('test-key', 1, 1)
    vi.useRealTimers()

    expect(result.success).toBe(true)
  })
})

describe('getClientIp', () => {
  it('x-forwarded-for 헤더에서 첫 번째 IP를 추출한다', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('단일 IP도 처리한다', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('x-real-ip 헤더를 폴백으로 사용한다', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('IP 헤더가 없으면 unknown을 반환한다', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})

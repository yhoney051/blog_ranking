import { describe, it, expect } from 'vitest'
import {
  keywordCreateSchema,
  rankCheckSchema,
  subscribeSchema,
  cancelSubscriptionSchema,
  formatRequestSchema,
} from '@/lib/validations'

describe('keywordCreateSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '대구 맛집',
      blog_url: 'https://blog.naver.com/test',
      tag: '맛집',
    })
    expect(result.success).toBe(true)
  })

  it('프로토콜 없는 URL도 허용한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'blog.naver.com/myid',
    })
    expect(result.success).toBe(true)
  })

  it('빈 키워드를 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '',
      blog_url: 'blog.naver.com/test',
    })
    expect(result.success).toBe(false)
  })

  it('100자 초과 키워드를 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: 'a'.repeat(101),
      blog_url: 'blog.naver.com/test',
    })
    expect(result.success).toBe(false)
  })

  it('javascript: URL을 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('data: URL을 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'data:text/html,<script>alert(1)</script>',
    })
    expect(result.success).toBe(false)
  })

  it('500자 초과 URL을 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'https://blog.naver.com/' + 'a'.repeat(500),
    })
    expect(result.success).toBe(false)
  })

  it('태그는 선택사항이다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'blog.naver.com/test',
    })
    expect(result.success).toBe(true)
  })

  it('50자 초과 태그를 거부한다', () => {
    const result = keywordCreateSchema.safeParse({
      keyword: '테스트',
      blog_url: 'blog.naver.com/test',
      tag: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })
})

describe('rankCheckSchema', () => {
  it('유효한 UUID를 통과시킨다', () => {
    const result = rankCheckSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('잘못된 UUID를 거부한다', () => {
    const result = rankCheckSchema.safeParse({ id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('빈 문자열을 거부한다', () => {
    const result = rankCheckSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})

describe('subscribeSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = subscribeSchema.safeParse({
      billingKey: 'billing_key_123',
      customerKey: 'customer_key_456',
    })
    expect(result.success).toBe(true)
  })

  it('빈 billingKey를 거부한다', () => {
    const result = subscribeSchema.safeParse({
      billingKey: '',
      customerKey: 'customer_key',
    })
    expect(result.success).toBe(false)
  })

  it('빈 customerKey를 거부한다', () => {
    const result = subscribeSchema.safeParse({
      billingKey: 'billing_key',
      customerKey: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('cancelSubscriptionSchema', () => {
  it('사유 없이도 통과한다', () => {
    const result = cancelSubscriptionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('200자 이내 사유를 통과시킨다', () => {
    const result = cancelSubscriptionSchema.safeParse({
      reason: '더 이상 사용하지 않습니다.',
    })
    expect(result.success).toBe(true)
  })

  it('200자 초과 사유를 거부한다', () => {
    const result = cancelSubscriptionSchema.safeParse({
      reason: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

describe('formatRequestSchema', () => {
  it('유효한 텍스트를 통과시킨다', () => {
    const result = formatRequestSchema.safeParse({
      text: '이것은 테스트 원고입니다. 블로그에 올릴 글입니다.',
    })
    expect(result.success).toBe(true)
  })

  it('10자 미만 텍스트를 거부한다', () => {
    const result = formatRequestSchema.safeParse({ text: '짧은글' })
    expect(result.success).toBe(false)
  })

  it('10000자 초과 텍스트를 거부한다', () => {
    const result = formatRequestSchema.safeParse({
      text: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

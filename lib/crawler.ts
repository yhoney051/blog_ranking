// 외부 크롤링 서버를 호출하여 네이버 블로그 탭 실제 순위를 조회
// Playwright 기반 크롤링 서버의 /crawl 엔드포인트를 호출

export async function crawlNaverBlogRank(
  keyword: string,
  blogUrl: string
): Promise<number | null> {
  const serverUrl = process.env.CRAWL_SERVER_URL
  const apiKey = process.env.CRAWL_SERVER_API_KEY

  if (!serverUrl) {
    throw new Error('CRAWL_SERVER_URL 환경변수가 설정되지 않았습니다')
  }

  const MAX_RETRIES = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const res = await fetch(`${serverUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify({ keyword, blogUrl }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `크롤링 서버 오류: ${res.status}`)
      }

      const data: { rank: number | null } = await res.json()
      return data.rank
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES - 1) {
        // exponential backoff: 1초, 2초, 4초
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError ?? new Error('크롤링 서버 호출 실패')
}

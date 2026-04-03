// 네이버 모바일 블로그 탭 크롤링 로직
// Playwright로 실제 검색 결과를 파싱하여 블로그 순위 반환

import { chromium, type Browser } from 'playwright'
import path from 'path'

// 순위 조회 결과 타입
interface CrawlResult {
  rank: number | null
  totalResults: number
}

// URL 정규화 (비교용)
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\/(m\.|www\.)?/, '')
    .replace(/\/$/, '')
}

export async function crawlNaverBlogRank(
  keyword: string,
  blogUrl: string
): Promise<CrawlResult> {
  const proxyServer = process.env.PROXY_SERVER

  // 브라우저 실행 옵션
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    ...(proxyServer && {
      proxy: {
        server: proxyServer,
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD,
      },
    }),
  }

  let browser: Browser | null = null

  try {
    browser = await chromium.launch(launchOptions)

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      locale: 'ko-KR',
    })

    const page = await context.newPage()

    // 네이버 모바일 블로그 탭 접속
    const searchUrl = `https://m.search.naver.com/search.naver?where=m_blog&query=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })

    // 검색 결과 로딩 대기
    await page.waitForTimeout(2000)

    // 캡차 감지
    const captcha = await page.$('.captcha, #captcha, [class*="captcha"]')
    if (captcha) {
      throw new Error('captcha_detected')
    }

    // blogUrl에서 블로그 ID 추출 (예: blog.naver.com/kjh760322 → kjh760322)
    const targetNormalized = normalizeUrl(blogUrl)
    // 포스트 번호가 포함된 URL이면 그대로 매칭, 아니면 블로그 ID로 매칭
    const hasPostId = /\/\d+$/.test(targetNormalized)

    const MAX_SCROLLS = 10
    const MAX_RESULTS = 100

    for (let scroll = 0; scroll <= MAX_SCROLLS; scroll++) {
      // 포스트 URL만 추출 (숫자로 끝나는 링크 = 개별 포스트)
      const postLinks = await page.$$eval(
        'a[href*="blog.naver.com"]',
        (anchors) =>
          anchors
            .map((a) => a.href)
            .filter((href) => /blog\.naver\.com\/[^/]+\/\d+/.test(href))
      )

      // 중복 제거하면서 순서 유지 (같은 포스트가 여러 번 나옴)
      const uniquePosts: string[] = []
      const seen = new Set<string>()
      for (const link of postLinks) {
        const normalized = normalizeUrl(link)
        if (!seen.has(normalized)) {
          seen.add(normalized)
          uniquePosts.push(normalized)
        }
      }

      // 타겟 블로그 찾기
      const index = uniquePosts.findIndex((post) => {
        if (hasPostId) {
          // 특정 포스트 URL 매칭
          return post.includes(targetNormalized)
        }
        // 블로그 ID만으로 매칭 (첫 번째 등장하는 포스트)
        return post.includes(targetNormalized.replace(/\/$/, ''))
      })

      if (index !== -1) {
        return { rank: index + 1, totalResults: uniquePosts.length }
      }

      // 충분한 결과가 있으면 중단
      if (uniquePosts.length >= MAX_RESULTS) break

      // 페이지 하단으로 스크롤
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)

      // "더보기" 버튼 클릭 시도
      const moreButton = await page.$('a.btn_more, button[class*="more"]')
      if (moreButton) {
        await moreButton.click()
        await page.waitForTimeout(1500)
      }
    }

    // 결과 0개일 때 디버그 스크린샷 저장
    const screenshotPath = path.join(__dirname, '..', `debug-${Date.now()}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`[디버그] 결과 없음 — 스크린샷 저장: ${screenshotPath}`)

    return { rank: null, totalResults: 0 }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

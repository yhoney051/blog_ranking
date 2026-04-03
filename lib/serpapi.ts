// 네이버 블로그 순위 조회 모듈
// Bright Data SERP API로 네이버 블로그탭 실제 검색 결과 조회

export async function getNaverBlogRank(
  keyword: string,
  blogUrl: string
): Promise<number | null> {
  return getBrightDataBlogRank(keyword, blogUrl)
}

// URL 정규화 (https://, http://, www, m. 제거)
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.|m\.)/, '')
    .replace(/\/$/, '')
}

// Bright Data SERP API로 네이버 블로그탭 HTML을 가져와서 파싱
async function getBrightDataBlogRank(
  keyword: string,
  blogUrl: string
): Promise<number | null> {
  const apiKey = process.env.BRIGHTDATA_API_KEY
  if (!apiKey) throw new Error('BRIGHTDATA_API_KEY 환경변수가 설정되지 않았습니다')

  // 네이버 블로그탭 검색 URL
  const naverUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`

  const res = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone: 'serp_api1',
      url: naverUrl,
      format: 'raw',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Bright Data API 오류: ${res.status} - ${errText}`)
  }

  const html = await res.text()
  if (!html || html.length < 100) {
    throw new Error('Bright Data API 빈 응답')
  }

  // HTML 파싱하여 블로그 결과 추출
  const blogResults = parseBlogResults(html)

  console.log('[BrightData] 키워드:', keyword)
  console.log('[BrightData] 블로그 결과 수:', blogResults.length)
  console.log('[BrightData] 비교 대상:', blogUrl)

  // blogUrl 매칭
  const target = normalizeUrl(blogUrl)
  const index = blogResults.findIndex((item) => {
    const link = normalizeUrl(item.link)
    const blogId = normalizeUrl(item.blogId)
    return link.includes(target) || target.includes(blogId)
  })

  return index === -1 ? null : index + 1
}

// 네이버 블로그탭 HTML에서 검색 결과 파싱
function parseBlogResults(html: string): Array<{ link: string; blogId: string }> {
  // profile-info-title-text 기준으로 블록 분할 (각 블록 = 1개 검색 결과)
  const blocks = html.split(/profile-info-title-text/)
  const results: Array<{ link: string; blogId: string }> = []
  const seen = new Set<string>()

  // 첫 번째 블록은 헤더이므로 스킵
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    // 포스트 링크: blog.naver.com/아이디/글번호
    const linkMatch = block.match(
      /href="(https?:\/\/blog\.naver\.com\/([^/"]+)\/(\d+))"/i
    )
    if (!linkMatch) continue

    const link = linkMatch[1]
    const blogId = linkMatch[2]

    // 중복 제거
    if (seen.has(link)) continue
    seen.add(link)

    // 광고 링크 제외
    if (block.includes('adcr.naver.com') || block.includes('ader.naver.com')) continue

    results.push({ link, blogId })
  }

  return results
}

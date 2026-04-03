// 네이버 블로그 순위 조회 모듈
// 네이버 공식 블로그 검색 API 사용

export async function getNaverBlogRank(
  keyword: string,
  blogUrl: string
): Promise<number | null> {
  return getNaverBlogRankAPI(keyword, blogUrl)
}

// 네이버 공식 블로그 검색 API로 블로그 URL의 순위를 반환
// 찾지 못하면 null 반환

async function getNaverBlogRankAPI(
  keyword: string,
  blogUrl: string
): Promise<number | null> {
  const params = new URLSearchParams({
    query: keyword,
    display: '100', // 최대 100개 결과
    sort: 'sim',    // 정확도순 (네이버 기본 검색 순위)
  })

  const res = await fetch(
    `https://openapi.naver.com/v1/search/blog?${params}`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    }
  )
  if (!res.ok) throw new Error(`네이버 API 오류: ${res.status}`)

  const data = await res.json()
  const items: Array<{ link: string; bloggerlink: string }> = data.items ?? []

  console.log('[NaverAPI] 결과 수:', items.length)
  console.log('[NaverAPI] 첫 번째:', items[0]?.link)
  console.log('[NaverAPI] 비교 대상:', blogUrl)

  // URL 정규화
  const normalize = (url: string) =>
    url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

  const target = normalize(blogUrl)

  // 블로그 주소가 포함된 결과 찾기 (개별 포스트 URL도 매칭)
  const index = items.findIndex((item) => {
    const link = normalize(item.link)
    const blogger = normalize(item.bloggerlink ?? '')
    return link.includes(target) || blogger.includes(target)
  })

  return index === -1 ? null : index + 1
}

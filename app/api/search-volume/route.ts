import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthUserId } from '@/lib/supabase/server'
import { getSearchVolume, isNaverSearchAdConfigured } from '@/lib/naver-searchad'

// POST /api/search-volume — 키워드 ID 배열에 대한 검색량 일괄 조회 & DB 업데이트
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  if (!isNaverSearchAdConfigured()) {
    return NextResponse.json({ error: '네이버 검색광고 API가 설정되지 않았습니다.' }, { status: 503 })
  }

  const body = await req.json()
  const ids: string[] = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids 배열이 필요합니다.' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // 해당 사용자의 키워드만 조회
  const { data: keywords, error } = await supabase
    .from('keywords')
    .select('id, keyword')
    .eq('user_id', userId)
    .in('id', ids)

  if (error || !keywords) {
    return NextResponse.json({ error: '키워드 조회에 실패했습니다.' }, { status: 500 })
  }

  if (keywords.length === 0) {
    return NextResponse.json({ error: '유효한 키워드가 없습니다.' }, { status: 404 })
  }

  try {
    const keywordTexts = keywords.map((kw) => kw.keyword)
    const volumes = await getSearchVolume(keywordTexts)

    // 키워드 텍스트 → 검색량 매핑
    const volumeMap = new Map(volumes.map((v) => [v.keyword.toLowerCase().trim(), v.totalSearchVolume]))

    const now = new Date().toISOString()
    let updated = 0

    for (const kw of keywords) {
      const volume = volumeMap.get(kw.keyword.toLowerCase().trim())
      if (volume !== undefined) {
        await supabase
          .from('keywords')
          .update({
            monthly_search_volume: volume,
            search_volume_updated_at: now,
          })
          .eq('id', kw.id)
        updated++
      }
    }

    return NextResponse.json({ updated, total: keywords.length })
  } catch (err) {
    console.error('[POST /api/search-volume]', err)
    return NextResponse.json({ error: '검색량 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

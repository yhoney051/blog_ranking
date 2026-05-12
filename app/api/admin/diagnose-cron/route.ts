// 일회성 cron 진단 라우트
// 키워드 자동 업데이트가 왜 안 됐는지 한눈에 보여주기 위한 read-only 조회.
// 사용 후 이 폴더를 삭제할 것.
//
// 호출 방법:
//   브라우저: https://your-domain/api/admin/diagnose-cron?secret=<CRON_SECRET 값>

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // 인증
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 500 })
  }
  const url = new URL(request.url)
  const provided =
    url.searchParams.get('secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString()

  // 1) 최근 7일 cron_runs 기록 (job별 최근 10건씩)
  const { data: cronRuns } = await supabaseServer
    .from('cron_runs')
    .select('job_name, status, started_at, finished_at, error_text, result_json')
    .gte('started_at', sevenDaysAgo)
    .order('started_at', { ascending: false })
    .limit(200)

  // 2) 활성 키워드 분포
  const { count: totalActive } = await supabaseServer
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const { count: activeWithUser } = await supabaseServer
    .from('keywords')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('user_id', 'is', null)

  // 3) 자동 체크 대상 사용자 (plan != 'free' OR bonus > 0)
  const { data: eligibleProfiles } = await supabaseServer
    .from('profiles')
    .select('id, plan, bonus_keyword_limit')
  const eligibleUserIds = (eligibleProfiles ?? [])
    .filter((p) => {
      const bonus = (p as { bonus_keyword_limit?: number }).bonus_keyword_limit ?? 0
      return p.plan !== 'free' || bonus > 0
    })
    .map((p) => p.id)

  // 4) 자동 체크 대상 활성 키워드 수
  let eligibleKeywordCount = 0
  if (eligibleUserIds.length > 0) {
    const { count } = await supabaseServer
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('user_id', eligibleUserIds)
    eligibleKeywordCount = count ?? 0
  }

  // 5) last_checked_at 분포 — 자동 체크 대상 키워드만 (KST 기준)
  const { data: eligibleKws } = await supabaseServer
    .from('keywords')
    .select('id, keyword, last_checked_at, current_rank')
    .eq('is_active', true)
    .in('user_id', eligibleUserIds.length > 0 ? eligibleUserIds : ['__none__'])
    .order('last_checked_at', { ascending: true, nullsFirst: true })

  const nullCount = (eligibleKws ?? []).filter((k) => !k.last_checked_at).length
  const buckets: Record<string, number> = {}
  for (const k of eligibleKws ?? []) {
    if (!k.last_checked_at) continue
    // KST yyyy-mm-dd 추출
    const d = new Date(k.last_checked_at)
    const kst = new Date(d.getTime() + 9 * 3600_000)
    const label = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
    buckets[label] = (buckets[label] ?? 0) + 1
  }
  const oldestCheckedAt = (eligibleKws ?? []).find((k) => k.last_checked_at)?.last_checked_at ?? null

  // 6) check-ranks job 최근 실행 요약 (성공/실패 카운트)
  const checkRanksRuns = (cronRuns ?? []).filter((r) => r.job_name === 'check-ranks')

  return NextResponse.json({
    nowKstLabel: new Date(now.getTime() + 9 * 3600_000).toISOString().replace('Z', ' KST'),
    cronRunsLast7d: cronRuns ?? [],
    checkRanksRecentRuns: checkRanksRuns.slice(0, 10),
    activeKeywords: {
      total: totalActive ?? 0,
      withUser: activeWithUser ?? 0,
      eligibleForAutoCheck: eligibleKeywordCount,
      chunkSizePerRun: 110,
    },
    eligibleUsers: {
      count: eligibleUserIds.length,
      breakdown: (eligibleProfiles ?? [])
        .filter((p) => eligibleUserIds.includes(p.id))
        .map((p) => ({
          plan: p.plan,
          bonus: (p as { bonus_keyword_limit?: number }).bonus_keyword_limit ?? 0,
        })),
    },
    lastCheckedAtDistribution: {
      bucketsByKstDate: buckets,
      nullCount,
      oldestCheckedAt,
    },
    note: '진단 종료 후 app/api/admin/diagnose-cron 폴더를 삭제하세요.',
  })
}

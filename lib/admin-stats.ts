// 운영자 텔레그램 명령어용 통계 집계 + 메시지 빌더
// 호출자: app/api/telegram/webhook/route.ts (운영자 chat_id 검증 후 호출)

import { supabaseServer } from '@/lib/supabase/server'
import { escapeAdminHtml } from '@/lib/admin-notify'

// 오늘 KST 자정의 UTC ISO 문자열 — "오늘 가입/결제" 집계 기준점
function getTodayKstStartUtc(): string {
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 3600_000)
  const y = kstNow.getUTCFullYear()
  const m = kstNow.getUTCMonth()
  const d = kstNow.getUTCDate()
  const todayKstStart = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600_000)
  return todayKstStart.toISOString()
}

// KST 기준 오늘 yyyy-mm-dd (daily_stats.date 매칭용)
function getTodayKstDate(): string {
  const kstNow = new Date(Date.now() + 9 * 3600_000)
  return kstNow.toISOString().split('T')[0]
}

// 특정 날짜의 페이지뷰/순방문자 조회 (없으면 0/0)
async function getTrafficForDate(date: string): Promise<{ pv: number; uv: number }> {
  const { data } = await supabaseServer
    .from('daily_stats')
    .select('page_views, unique_visitors')
    .eq('date', date)
    .maybeSingle()
  return {
    pv: data?.page_views ?? 0,
    uv: data?.unique_visitors ?? 0,
  }
}

// 오늘(KST) 트래픽 — 외부 모듈에서 재사용
export async function getTodayTraffic(): Promise<{ pv: number; uv: number }> {
  return getTrafficForDate(getTodayKstDate())
}

// 어제(KST) 트래픽 — admin-daily-summary cron에서 사용
export async function getYesterdayTraffic(): Promise<{ pv: number; uv: number }> {
  const kstNow = new Date(Date.now() + 9 * 3600_000)
  kstNow.setUTCDate(kstNow.getUTCDate() - 1)
  const yesterday = kstNow.toISOString().split('T')[0]
  return getTrafficForDate(yesterday)
}

// "방금" / "N분 전" / "N시간 전" / "N일 전"
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '시각 미상'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

// payments 행에 email + plan을 join해서 한 번에 가져오는 헬퍼
async function enrichPayments(
  rows: Array<{
    amount: number | null
    paid_at: string | null
    user_id: string | null
    subscription_id: string | null
    status?: string
  }>
): Promise<
  Array<{
    email: string
    plan: string
    amount: number
    paid_at: string | null
    status: string
  }>
> {
  if (rows.length === 0) return []
  const userIds = rows.map((p) => p.user_id).filter((v): v is string => !!v)
  const subIds = rows.map((p) => p.subscription_id).filter((v): v is string => !!v)

  const [profilesRes, subsRes] = await Promise.all([
    userIds.length > 0
      ? supabaseServer.from('profiles').select('id, email').in('id', userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; email: string }> }),
    subIds.length > 0
      ? supabaseServer.from('subscriptions').select('id, plan').in('id', subIds)
      : Promise.resolve({ data: [] as Array<{ id: string; plan: string }> }),
  ])

  const emailMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.email]))
  const planMap = new Map((subsRes.data ?? []).map((s) => [s.id, s.plan]))

  return rows.map((p) => ({
    email: emailMap.get(p.user_id ?? '') ?? '(미상)',
    plan: planMap.get(p.subscription_id ?? '') ?? '?',
    amount: p.amount ?? 0,
    paid_at: p.paid_at,
    status: p.status ?? 'paid',
  }))
}

// /stat — 종합 대시보드: 오늘 + 누적 + 최근 가입/결제/cron
export async function buildOverallStat(): Promise<string> {
  const todayStart = getTodayKstStartUtc()

  // 오늘 트래픽 (페이지뷰/순방문자)
  const todayTraffic = await getTodayTraffic()

  // 오늘/누적 가입자 수
  const [todaySignupRes, totalSignupRes] = await Promise.all([
    supabaseServer
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabaseServer.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  // 오늘/누적 결제
  const [todayPaidRes, totalPaidRes] = await Promise.all([
    supabaseServer
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', todayStart),
    supabaseServer.from('payments').select('amount').eq('status', 'paid'),
  ])
  const todayPayCount = todayPaidRes.data?.length ?? 0
  const todayRevenue = todayPaidRes.data?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0
  const totalPayCount = totalPaidRes.data?.length ?? 0
  const totalRevenue = totalPaidRes.data?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0

  // 키워드 통계
  const [totalKwRes, activeKwRes] = await Promise.all([
    supabaseServer.from('keywords').select('*', { count: 'exact', head: true }),
    supabaseServer.from('keywords').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // 활성 사용자 (활성 키워드 보유 user 수)
  const { data: activeUserRows } = await supabaseServer
    .from('keywords')
    .select('user_id')
    .eq('is_active', true)
    .not('user_id', 'is', null)
  const activeUsers = new Set(activeUserRows?.map((r) => r.user_id) ?? []).size

  // 최근 가입 5명
  const { data: recentSignups } = await supabaseServer
    .from('profiles')
    .select('email, created_at, plan')
    .order('created_at', { ascending: false })
    .limit(5)

  // 최근 결제 5건
  const { data: recentPaidRaw } = await supabaseServer
    .from('payments')
    .select('amount, paid_at, user_id, subscription_id, status')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(5)
  const recentPaid = await enrichPayments(recentPaidRaw ?? [])

  // 최근 cron — job_name별 최신 1건
  const { data: cronRows } = await supabaseServer
    .from('cron_runs')
    .select('job_name, status, started_at')
    .order('started_at', { ascending: false })
    .limit(40)
  const latestByJob = new Map<string, { status: string; started_at: string }>()
  for (const r of cronRows ?? []) {
    if (!latestByJob.has(r.job_name)) {
      latestByJob.set(r.job_name, { status: r.status, started_at: r.started_at })
    }
  }

  const lines: string[] = [
    '📊 <b>실시간 통계</b>',
    '',
    '📅 <b>오늘</b> (KST 00:00 ~ 지금)',
    `🆕 가입 ${todaySignupRes.count ?? 0}명 · 💰 결제 ${todayPayCount}건 ${todayRevenue.toLocaleString('ko-KR')}원`,
    `📈 페이지뷰 ${todayTraffic.pv.toLocaleString('ko-KR')}회 · 순방문자 ${todayTraffic.uv.toLocaleString('ko-KR')}명`,
    '',
    '📈 <b>누적</b>',
    `👥 전체 사용자 ${totalSignupRes.count ?? 0}명`,
    `💰 누적 매출 ${totalRevenue.toLocaleString('ko-KR')}원 (${totalPayCount}건)`,
    `🔍 등록 키워드 ${totalKwRes.count ?? 0}개 (활성 ${activeKwRes.count ?? 0})`,
    `👥 활성 사용자 ${activeUsers}명`,
    '',
  ]

  if (recentSignups && recentSignups.length > 0) {
    lines.push('📋 <b>최근 가입 5명</b>')
    for (const u of recentSignups) {
      const plan = u.plan ?? 'free'
      lines.push(
        `• ${timeAgo(u.created_at)} — ${escapeAdminHtml(u.email ?? '(미상)')} (${escapeAdminHtml(plan)})`
      )
    }
    lines.push('')
  }

  if (recentPaid.length > 0) {
    lines.push('💵 <b>최근 결제 5건</b>')
    for (const p of recentPaid) {
      lines.push(
        `• ${timeAgo(p.paid_at)} — ${escapeAdminHtml(p.email)} (${escapeAdminHtml(p.plan)}, ${p.amount.toLocaleString('ko-KR')}원)`
      )
    }
    lines.push('')
  }

  if (latestByJob.size > 0) {
    lines.push('⏰ <b>최근 cron</b>')
    for (const [job, info] of Array.from(latestByJob.entries())) {
      const icon = info.status === 'success' ? '✅' : info.status === 'failed' ? '❌' : '🔄'
      lines.push(`${icon} ${escapeAdminHtml(job)} (${timeAgo(info.started_at)}, ${info.status})`)
    }
  }

  return lines.join('\n').trim()
}

// /users — 최근 가입자 N명
export async function buildRecentUsers(limit = 20): Promise<string> {
  const { data: users } = await supabaseServer
    .from('profiles')
    .select('email, created_at, plan')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!users || users.length === 0) return '가입자 없음'

  const lines = [`📋 <b>최근 가입 ${users.length}명</b>`, '']
  for (const u of users) {
    const plan = u.plan ?? 'free'
    lines.push(
      `• ${timeAgo(u.created_at)} — ${escapeAdminHtml(u.email ?? '(미상)')} (${escapeAdminHtml(plan)})`
    )
  }
  return lines.join('\n')
}

// /pay — 최근 결제 N건 (paid + refunded 모두)
export async function buildRecentPayments(limit = 20): Promise<string> {
  const { data: rows } = await supabaseServer
    .from('payments')
    .select('amount, paid_at, user_id, subscription_id, status')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (!rows || rows.length === 0) return '결제 내역 없음'

  const enriched = await enrichPayments(rows)
  const lines = [`💵 <b>최근 결제 ${enriched.length}건</b>`, '']
  for (const p of enriched) {
    const icon = p.status === 'paid' ? '💰' : p.status === 'refunded' ? '↩️' : '❓'
    lines.push(
      `${icon} ${timeAgo(p.paid_at)} — ${escapeAdminHtml(p.email)} (${escapeAdminHtml(p.plan)}, ${p.amount.toLocaleString('ko-KR')}원)`
    )
  }
  return lines.join('\n')
}

// /cron — 각 job_name별 최근 5건 실행 상태
export async function buildCronStatus(): Promise<string> {
  const { data: runs } = await supabaseServer
    .from('cron_runs')
    .select('job_name, status, started_at, error_text')
    .order('started_at', { ascending: false })
    .limit(50)

  if (!runs || runs.length === 0) return 'cron 실행 이력 없음'

  // job_name별 최근 5건씩
  const byJob = new Map<
    string,
    Array<{ status: string; started_at: string; error_text: string | null }>
  >()
  for (const r of runs) {
    const list = byJob.get(r.job_name) ?? []
    if (list.length < 5) {
      list.push({ status: r.status, started_at: r.started_at, error_text: r.error_text })
    }
    byJob.set(r.job_name, list)
  }

  const lines = ['⏰ <b>cron 최근 실행 상태</b>', '']
  for (const [job, list] of Array.from(byJob.entries())) {
    lines.push(`<b>${escapeAdminHtml(job)}</b>`)
    for (const r of list) {
      const icon = r.status === 'success' ? '✅' : r.status === 'failed' ? '❌' : '🔄'
      const err = r.error_text ? ` — ${escapeAdminHtml(r.error_text.slice(0, 60))}` : ''
      lines.push(`${icon} ${timeAgo(r.started_at)} (${r.status})${err}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

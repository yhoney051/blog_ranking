'use client'

// 키워드별 검색 트렌드 라인 차트 (네이버 데이터랩 기반)
// Y축은 0~100 상대 지수 (가장 높은 시점이 100). 절대 검색량 아님.

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import type { TrendResult } from '@/lib/naver-datalab'

type Props = {
  trend: TrendResult
  highlightedKeyword?: string | null
}

// 키워드 라인 색상 — 흰 배경/어두운 배경 모두 충분한 대비
// 1: 진한 파랑(blue-600), 2: 진한 빨강(red-600), 3: 진한 에메랄드(emerald-600)
const LINE_COLORS = ['#2563eb', '#dc2626', '#059669']

// 데이터랩 응답을 recharts가 먹는 형태로 변환
// { period: '2025-01-01', '키워드A': 50, '키워드B': 80 } 식으로 가로 합치기
function buildChartData(trend: TrendResult): Array<Record<string, string | number>> {
  if (trend.series.length === 0) return []

  // 모든 시리즈의 period를 모은 뒤 정렬 (시리즈마다 누락 없을 거라 첫 시리즈 기준이면 충분)
  const periods = trend.series[0].data.map((p) => p.period)
  return periods.map((period) => {
    const row: Record<string, string | number> = { period }
    for (const s of trend.series) {
      const point = s.data.find((p) => p.period === period)
      row[s.keyword] = point ? point.ratio : 0
    }
    return row
  })
}

// 기간 단위에 따라 X축 라벨 형식
function formatPeriodLabel(period: string, timeUnit: string): string {
  const d = new Date(period)
  if (isNaN(d.getTime())) return period
  if (timeUnit === 'month') {
    return d.toLocaleDateString('ko-KR', { year: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function KeywordTrendChart({ trend, highlightedKeyword }: Props) {
  const data = buildChartData(trend)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">트렌드 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: 'var(--foreground)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          tickFormatter={(v) => formatPeriodLabel(v, trend.timeUnit)}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(v) => formatPeriodLabel(String(v), trend.timeUnit)}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {trend.series.map((s, i) => {
          const dimmed = highlightedKeyword !== null && highlightedKeyword !== undefined && highlightedKeyword !== s.keyword
          return (
            <Line
              key={s.keyword}
              type="monotone"
              dataKey={s.keyword}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={highlightedKeyword === s.keyword ? 3 : 2}
              strokeOpacity={dimmed ? 0.25 : 1}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

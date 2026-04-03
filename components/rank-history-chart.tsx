'use client'

import { RankHistory } from '@/types'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = { history: RankHistory[] }

// 날짜별 순위 변화 영역 차트
// Y축 반전: 순위 1이 위에 표시되도록
export function RankHistoryChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">히스토리가 없습니다.</p>
      </div>
    )
  }

  const data = history
    .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())
    .map((h) => ({
      date: new Date(h.checked_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      순위: h.rank,
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        {/* 순위는 낮을수록 좋으므로 Y축 반전 */}
        <YAxis
          reversed
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v) => [`${v}위`, '순위']}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="순위"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#rankGradient)"
          dot={{ r: 3, fill: 'var(--chart-1)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

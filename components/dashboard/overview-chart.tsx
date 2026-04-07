"use client";

import { Keyword } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface OverviewChartProps {
  keywords: Keyword[];
}

// 키워드들의 순위 분포 요약 차트 — 현재 vs 이전 순위 비교 막대 차트
export function OverviewChart({ keywords }: OverviewChartProps) {
  const ranked = keywords.filter((k) => k.current_rank !== null);

  if (ranked.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">순위 분포</h3>
        <p className="text-center text-muted-foreground py-8 text-sm">
          조회된 키워드가 없습니다.
        </p>
      </div>
    );
  }

  // 순위 구간별 집계 (현재 + 이전)
  const ranges = [
    { name: "1-3위", min: 1, max: 3 },
    { name: "4-10위", min: 4, max: 10 },
    { name: "11-20위", min: 11, max: 20 },
    { name: "21-30위", min: 21, max: 30 },
    { name: "31-50위", min: 31, max: 50 },
    { name: "50위+", min: 51, max: 9999 },
  ];

  const data = ranges.map((range) => ({
    name: range.name,
    현재: ranked.filter(
      (k) => (k.current_rank ?? 999) >= range.min && (k.current_rank ?? 999) <= range.max
    ).length,
    이전: keywords.filter(
      (k) =>
        k.previous_rank !== null &&
        k.previous_rank >= range.min &&
        k.previous_rank <= range.max
    ).length,
  }));

  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">순위 분포</h3>
        {/* 커스텀 HTML 범례 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
            현재
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
            이전
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="현재" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="이전" fill="#94a3b8" opacity={0.5} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

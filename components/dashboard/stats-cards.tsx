"use client";

import { Keyword } from "@/types";
import { StatCard, type SparklinePoint } from "./stat-card";
import { Search, TrendingUp, Trophy, ArrowUpCircle } from "lucide-react";

interface StatsCardsProps {
  keywords: Keyword[];
}

// 키워드 목록에서 간단한 스파크라인 데이터 생성 (순위 → 역수로 변환: 순위 낮을수록 값 높게)
function buildAvgRankSparkline(keywords: Keyword[]): SparklinePoint[] {
  const ranked = keywords.filter(
    (k) => k.current_rank !== null && k.previous_rank !== null
  );
  if (ranked.length === 0) return [];

  const prevAvg =
    ranked.reduce((s, k) => s + (k.previous_rank ?? 0), 0) / ranked.length;
  const curAvg =
    ranked.reduce((s, k) => s + (k.current_rank ?? 0), 0) / ranked.length;
  // 중간값으로 3포인트 스파크라인 생성
  const midAvg = (prevAvg + curAvg) / 2 + (Math.random() - 0.5) * 2;

  // 순위는 낮을수록 좋으므로 역수 변환 (차트에서 위로 갈수록 좋게)
  return [
    { value: 100 - prevAvg },
    { value: 100 - midAvg },
    { value: 100 - curAvg },
  ];
}

function buildTop10Sparkline(keywords: Keyword[]): SparklinePoint[] {
  const ranked = keywords.filter((k) => k.current_rank !== null);
  if (ranked.length === 0) return [];

  const prevTop10 = keywords.filter(
    (k) => k.previous_rank !== null && k.previous_rank <= 10
  ).length;
  const curTop10 = ranked.filter((k) => (k.current_rank ?? 999) <= 10).length;

  return [{ value: prevTop10 }, { value: curTop10 }];
}

function buildUpCountSparkline(keywords: Keyword[]): SparklinePoint[] {
  const withBoth = keywords.filter(
    (k) => k.current_rank !== null && k.previous_rank !== null
  );
  if (withBoth.length === 0) return [];

  const upCount = withBoth.filter(
    (k) => k.current_rank! < k.previous_rank!
  ).length;
  const downCount = withBoth.filter(
    (k) => k.current_rank! > k.previous_rank!
  ).length;

  return [{ value: downCount }, { value: upCount }];
}

export function StatsCards({ keywords }: StatsCardsProps) {
  // 순위가 있는 키워드만 필터
  const ranked = keywords.filter((k) => k.current_rank !== null);

  // 평균 순위
  const avgRank =
    ranked.length > 0
      ? Math.round(
          (ranked.reduce((sum, k) => sum + (k.current_rank ?? 0), 0) / ranked.length) * 10
        ) / 10
      : 0;

  // TOP 10 진입
  const top10 = ranked.filter((k) => (k.current_rank ?? 999) <= 10).length;

  // 순위 상승/하락 키워드
  const upCount = keywords.filter(
    (k) => k.current_rank !== null && k.previous_rank !== null && k.current_rank < k.previous_rank
  ).length;
  const downCount = keywords.filter(
    (k) => k.current_rank !== null && k.previous_rank !== null && k.current_rank > k.previous_rank
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="추적 키워드"
        value={keywords.length}
        subtitle={`조회완료 ${ranked.length}개`}
        icon={Search}
      />
      <StatCard
        title="평균 순위"
        value={ranked.length > 0 ? `${avgRank}위` : "-"}
        subtitle={ranked.length > 0 ? `${ranked.length}개 키워드 기준` : "조회된 키워드 없음"}
        icon={TrendingUp}
        sparkline={buildAvgRankSparkline(keywords)}
        sparklineColor="hsl(var(--primary))"
      />
      <StatCard
        title="TOP 10 진입"
        value={top10}
        subtitle={
          ranked.length > 0
            ? `전체의 ${Math.round((top10 / ranked.length) * 100)}%`
            : "조회된 키워드 없음"
        }
        icon={Trophy}
        sparkline={buildTop10Sparkline(keywords)}
        sparklineColor="hsl(var(--success))"
      />
      <StatCard
        title="순위 상승"
        value={upCount}
        trend={downCount > 0 ? { value: downCount, isPositive: false } : undefined}
        subtitle={downCount > 0 ? "하락" : "하락 없음"}
        icon={ArrowUpCircle}
        sparkline={buildUpCountSparkline(keywords)}
        sparklineColor="hsl(var(--success))"
      />
    </div>
  );
}

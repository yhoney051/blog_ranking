"use client";

import { Keyword } from "@/types";
import { StatCard } from "./stat-card";
import { Search, TrendingUp, Trophy, ArrowUpCircle } from "lucide-react";

interface StatsCardsProps {
  keywords: Keyword[];
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

  // 북극성 배지 결정
  const northstarBadge = avgRank > 0 && avgRank <= 3 ? "TOP 3 유지"
    : avgRank > 0 && avgRank <= 10 ? "TOP 10 유지"
    : avgRank > 0 && avgRank <= 20 ? "TOP 20 이내"
    : undefined;

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
        variant="northstar"
        badge={northstarBadge}
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
        iconClassName="bg-brand-300 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
      />
      <StatCard
        title="순위 상승"
        value={upCount}
        trend={downCount > 0 ? { value: downCount, isPositive: false } : undefined}
        subtitle={downCount > 0 ? "하락" : "하락 없음"}
        icon={ArrowUpCircle}
        iconClassName="bg-brand-300 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
      />
    </div>
  );
}

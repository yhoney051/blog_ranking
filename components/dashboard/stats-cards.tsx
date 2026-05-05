"use client";

import { Keyword } from "@/types";
import { StatCard } from "./stat-card";
import { Target, AlertCircle } from "lucide-react";

interface StatsCardsProps {
  keywords: Keyword[];
}

// 대시보드 상단 요약 카드
// 활성 키워드를 1페이지 노출 영역(1~10위) 기준으로 분류해
// 사용자가 "어떤 키워드에 신경 써야 할지" 한눈에 보이게 한다.
export function StatsCards({ keywords }: StatsCardsProps) {
  // 1~10위 진입 (모바일 첫 화면 노출 영역)
  const top10 = keywords.filter(
    (k) => k.current_rank !== null && (k.current_rank ?? 999) <= 10
  ).length;

  // 11위 이상 (조회는 됐지만 첫 화면에서 안 보임)
  const notInPage1 = keywords.filter(
    (k) => k.current_rank !== null && (k.current_rank ?? 0) > 10
  ).length;

  // 미조회 (한 번도 순위 조회되지 않음)
  const notChecked = keywords.filter((k) => k.current_rank === null).length;

  // 1페이지 누락 = 11위 이상 + 미조회 합산 (부제에서 분해 표시)
  const missingFromPage1 = notInPage1 + notChecked;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatCard
        title="1페이지 진입"
        value={top10}
        subtitle={
          keywords.length > 0
            ? `1~10위 노출 (모바일 첫 화면)`
            : "추적 키워드 없음"
        }
        icon={Target}
        iconClassName="bg-brand-300 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
      />
      <StatCard
        title="1페이지 누락"
        value={missingFromPage1}
        subtitle={
          keywords.length > 0
            ? `11위 이상 ${notInPage1}개 + 미조회 ${notChecked}개`
            : "추적 키워드 없음"
        }
        icon={AlertCircle}
        iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      />
    </div>
  );
}

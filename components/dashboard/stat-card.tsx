"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  // 북극성 카드 (평균 순위)
  variant?: 'default' | 'northstar';
  // 배지 텍스트 ("TOP 3 유지" 등)
  badge?: string;
  // 아이콘 색상 클래스
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  badge,
  iconClassName,
}: StatCardProps) {
  const isNorthstar = variant === 'northstar';

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        isNorthstar
          ? "border-lime-200 dark:border-lime-800/50 ring-1 ring-lime-500/10"
          : "border-slate-200/60 dark:border-slate-700/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight",
              isNorthstar ? "text-lime-600 dark:text-lime-400" : "text-card-foreground"
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0",
            iconClassName || (isNorthstar
              ? "bg-lime-50 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium rounded-md px-1.5 py-0.5 tabular-nums",
              trend.isPositive
                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
                : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
            )}
          >
            {trend.isPositive ? "▲" : "▼"} {Math.abs(trend.value)}
          </span>
        )}
        {badge && (
          <span className="text-[10px] bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 px-1.5 py-0.5 rounded-md font-medium">
            {badge}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

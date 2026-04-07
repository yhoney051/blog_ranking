"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, CreditCard, FileText, Crown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: FileText, label: "가독성King", href: "/dashboard/formatter" },
];

const bottomNavItems = [
  { icon: CreditCard, label: "결제", href: "/dashboard/billing" },
  { icon: Settings, label: "설정", href: "/dashboard/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ email: string; plan: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) setProfile({ email: data.email, plan: data.plan });
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isPro = profile?.plan === "pro";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* 로고 */}
      <div className="flex items-center gap-1 px-4 h-14 border-b border-sidebar-border">
        <img src="/logo.png" alt="수니" className="h-9 w-9 rounded-lg shrink-0 object-cover" />
        {!collapsed && (
          <span className="font-extrabold text-2xl text-sidebar-foreground truncate">
            수니
          </span>
        )}
      </div>

      {/* 메인 네비게이션 */}
      <nav className="flex-1 py-3 px-2.5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const linkContent = (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-slate-700 dark:text-slate-300")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger render={linkContent} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.label}>{linkContent}</div>;
        })}

        {/* 보조 네비게이션 */}
        <div className="pt-3 mt-3 border-t border-sidebar-border">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const linkContent = (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  active
                    ? "bg-brand-300 text-slate-800 dark:bg-brand-900 dark:text-slate-300"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active && "text-slate-700 dark:text-slate-300")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger render={linkContent} />
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return <div key={item.label}>{linkContent}</div>;
          })}
        </div>
      </nav>

      {/* 업그레이드 CTA */}
      {profile && !collapsed && (
        <div className="px-3 pb-2">
          {isPro ? (
            <div className="rounded-xl bg-brand-300 dark:bg-brand-900 border border-brand-200 dark:border-brand-800 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Crown className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-300">Pro 플랜</span>
              </div>
              <p className="text-[11px] text-slate-700/80 mt-1">키워드 100개 · 우선 지원</p>
            </div>
          ) : (
            <Link href="/dashboard/billing">
              <div className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-500 p-3.5 text-white cursor-pointer hover:opacity-90 transition-opacity">
                <div className="flex items-center gap-2 mb-1.5">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-bold">Pro로 업그레이드</span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  키워드 100개 + 우선 지원
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      <Separator />

      {/* 유저 프로필 */}
      {profile && (
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="mx-auto flex items-center justify-center h-9 w-9 rounded-full bg-brand-300 text-slate-800 dark:bg-brand-900/30 dark:text-slate-300 text-xs font-bold cursor-default">
                    {profile.email.slice(0, 2).toUpperCase()}
                  </div>
                }
              />
              <TooltipContent side="right">
                {profile.email} ({profile.plan})
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-brand-300 text-slate-800 dark:bg-brand-900/30 dark:text-slate-300 text-xs font-bold shrink-0">
                {profile.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile.email.split("@")[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={isPro ? "default" : "secondary"}
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4",
                      isPro && "bg-brand-300/25 text-slate-800 hover:bg-brand-300/25 dark:bg-brand-300/15 dark:text-slate-300"
                    )}
                  >
                    {isPro ? "Pro" : "무료"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* 하단 */}
      <div className="p-2 flex items-center justify-between">
        <ThemeToggle />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, BarChart3, CreditCard, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: FileText, label: "가독성King", href: "/dashboard/formatter" },
  { icon: CreditCard, label: "결제", href: "/dashboard/billing" },
  { icon: Settings, label: "설정", href: "/dashboard/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ email: string; plan: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) setProfile({ email: data.email, plan: data.plan });
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* 로고 */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-600 text-white dark:bg-violet-500 dark:text-white shrink-0">
          <BarChart3 className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-sidebar-foreground truncate">
            수니
          </span>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const linkContent = (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.label === "대시보드" && "bg-sidebar-accent text-foreground font-semibold"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
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
      </nav>

      <Separator />

      {/* 유저 프로필 */}
      {profile && (
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="mx-auto flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold cursor-default">
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
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold shrink-0">
                {profile.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {profile.email}
                </p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
                  {profile.plan}
                </Badge>
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

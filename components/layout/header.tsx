"use client";

import { useEffect, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { LayoutDashboard, Settings, CreditCard, FileText } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: FileText, label: "가독성King", href: "/dashboard/formatter" },
  { icon: CreditCard, label: "결제", href: "/dashboard/billing" },
  { icon: Settings, label: "설정", href: "/dashboard/settings" },
];

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const router = useRouter();
  const [today, setToday] = useState("");

  // 클라이언트에서만 날짜 설정 (서버/클라이언트 시간대 불일치 방지)
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* 모바일 메뉴 */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">네비게이션 메뉴</SheetTitle>
            <div className="flex items-center gap-1 px-4 h-14 border-b">
              <img src="/logo.png" alt="수니" className="h-8 w-8 rounded-lg object-cover" />
              <img src="/sooni-logo.png" alt="수니 Sooni" className="h-8 object-contain" />
            </div>
            <nav className="py-4 px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <Separator />
            <div className="p-4">
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>

        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {children}
        <Button variant="ghost" size="icon" onClick={handleLogout} title="로그아웃">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

import { DashboardShell } from '@/components/layout/dashboard-shell'

// /dashboard 하위에서만 사이드바 + 헤더 레이아웃 적용
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}

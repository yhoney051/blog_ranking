import { Sidebar } from "./sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <TooltipProvider delay={0}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}

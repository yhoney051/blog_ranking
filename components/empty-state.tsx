import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({
  title = "등록된 키워드가 없습니다",
  description = "키워드를 등록하면 네이버 블로그 순위를 추적할 수 있습니다.",
  onAction,
  actionLabel = "키워드 등록하기",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-4">
        <SearchX className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{description}</p>
      {onAction && (
        <Button onClick={onAction} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

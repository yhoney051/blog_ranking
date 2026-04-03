import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "등록된 키워드가 없습니다",
  description = "키워드를 등록하면 네이버 블로그 순위를 추적할 수 있습니다.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/5 text-primary mb-4">
        <SearchX className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
    </div>
  );
}

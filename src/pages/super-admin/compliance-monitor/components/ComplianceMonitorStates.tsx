import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ComplianceMonitorSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-label="Loading compliance issues" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-testid="compliance-issue-skeleton"
          className="grid w-full min-w-0 gap-4 overflow-hidden rounded-2xl border border-[#E6EAEC] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] lg:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-3 w-44 max-w-full" />
            </div>
          </div>

          <div className="hidden min-w-0 space-y-2 lg:block">
            <Skeleton className="h-3 w-16 max-w-full" />
            <Skeleton className="h-4 w-28 max-w-full" />
          </div>

          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-7 w-24 max-w-full rounded-full" />
          </div>

          <div
            data-testid="compliance-issue-skeleton-details"
            className="hidden min-w-0 flex-wrap gap-2 lg:flex lg:justify-end"
          >
            <Skeleton className="h-11 w-28 max-w-full rounded-full" />
            <Skeleton className="h-11 w-28 max-w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComplianceMonitorError({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl border border-[#FECACA] bg-[#FFF7F5] p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#D53411]"
        />
        <p className="text-sm font-medium text-[#7F1D1D]">{message}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        aria-label={retryLabel}
        className="h-11 border-[#FECACA] bg-white text-[#7F1D1D] hover:bg-[#FEF2F2]"
      >
        Try again
      </Button>
    </div>
  );
}
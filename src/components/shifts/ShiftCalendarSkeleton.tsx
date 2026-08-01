import { Skeleton } from "@/components/ui/skeleton";

interface ShiftCalendarSkeletonProps {
  label: string;
  dayTestId: string;
}

export default function ShiftCalendarSkeleton({ label, dayTestId }: ShiftCalendarSkeletonProps) {
  return (
    <div className="rounded-2xl border border-[#dce4e4] bg-white p-2 sm:p-3" aria-label={label} aria-busy="true">
      <div className="grid grid-cols-7 gap-0.5" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={`weekday-${index}`} className="mx-auto mb-1 h-3 w-7 rounded" />
        ))}
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={`day-${index}`}
            data-testid={dayTestId}
            className="min-h-[76px] rounded-lg border border-[#edf1f1] bg-[#fafcfc] p-2 sm:min-h-[96px]"
          >
            <Skeleton className="h-3 w-4 rounded" />
            {index % 4 === 0 ? <Skeleton className="mt-3 h-6 w-full rounded-md" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

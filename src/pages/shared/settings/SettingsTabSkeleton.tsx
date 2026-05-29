import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { settingsCardShellClass } from "./settingsCardStyles";

type SettingsTabSkeletonProps = {
  variant?: "form" | "accordion";
  cardCount?: number;
  className?: string;
};

function FormCardSkeleton() {
  return (
    <div className={cn(settingsCardShellClass, "min-h-[180px]")}>
      <div className="border-b border-[#eef0f2] px-5 py-4 sm:px-6">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full rounded-md" />
      </div>
      <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2 sm:gap-6">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccordionCardSkeleton() {
  return (
    <div className={cn(settingsCardShellClass, "min-h-[56px]")}>
      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
    </div>
  );
}

export const SettingsTabSkeleton = memo(function SettingsTabSkeleton({
  variant = "form",
  cardCount,
  className,
}: SettingsTabSkeletonProps) {
  const count = cardCount ?? (variant === "accordion" ? 4 : 2);

  return (
    <div
      className={cn("flex min-h-[420px] flex-col gap-4", className)}
      aria-busy="true"
      aria-label="Loading settings"
    >
      {variant === "accordion"
        ? Array.from({ length: count }).map((_, i) => <AccordionCardSkeleton key={i} />)
        : Array.from({ length: count }).map((_, i) => <FormCardSkeleton key={i} />)}
    </div>
  );
});

export default SettingsTabSkeleton;

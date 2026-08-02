import { Skeleton } from "@/components/ui/skeleton";

export default function BillingWorkspaceSkeleton() {
  return (
    <div className="space-y-5 pb-6" aria-label="Loading billing workspace" aria-busy="true">
      <div
        data-testid="billing-skeleton-header"
        className="rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5"
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,42.5rem)] lg:items-end">
          <div>
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-2 h-8 w-64 max-w-full rounded" />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl sm:col-span-2 xl:col-span-1" />
          </div>
        </div>
      </div>

      <div data-testid="billing-skeleton-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[#e4eaea] bg-white p-4">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="mt-3 h-8 w-32 rounded" />
          </div>
        ))}
      </div>

      <div data-testid="billing-skeleton-nav" className="rounded-xl border border-[#dce3e3] bg-white/70 p-2">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-24 rounded-lg" />
          ))}
        </div>
      </div>

      <div data-testid="billing-skeleton-content">
        <Skeleton className="h-[28rem] w-full rounded-2xl" />
      </div>
    </div>
  );
}

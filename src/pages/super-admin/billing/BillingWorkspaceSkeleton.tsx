import { Skeleton } from "@/components/ui/skeleton";
import {
  BILLING_CONTROL_GRID_CLASS,
  BILLING_HEADER_CLASS,
  BILLING_HEADER_LAYOUT_CLASS,
  BILLING_NAV_CLASS,
} from "./BillingManagementHeader";

export default function BillingWorkspaceSkeleton() {
  return (
    <div className="space-y-5 pb-6" aria-label="Loading billing workspace" aria-busy="true">
      <div data-testid="billing-skeleton-header" className={BILLING_HEADER_CLASS}>
        <div data-testid="billing-skeleton-header-layout" className={BILLING_HEADER_LAYOUT_CLASS}>
          <div className="min-w-0">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-2 h-8 w-64 max-w-full rounded" />
          </div>
          <div data-testid="billing-skeleton-controls" className={BILLING_CONTROL_GRID_CLASS}>
            {["agency", "dates", "mode"].map((control, index) => (
              <div
                key={control}
                data-testid="billing-skeleton-control"
                className={index === 2 ? "min-w-0 sm:col-span-2 lg:col-span-1" : "min-w-0"}
              >
                <Skeleton className="mb-1.5 h-3 w-24 rounded" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-testid="billing-skeleton-nav" className={BILLING_NAV_CLASS}>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-24 rounded-lg" />
        ))}
      </div>

      <div data-testid="billing-skeleton-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[#e4eaea] bg-white p-4">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="mt-3 h-8 w-32 rounded" />
          </div>
        ))}
      </div>

      <div data-testid="billing-skeleton-content">
        <Skeleton className="h-[28rem] w-full rounded-2xl" />
      </div>
    </div>
  );
}

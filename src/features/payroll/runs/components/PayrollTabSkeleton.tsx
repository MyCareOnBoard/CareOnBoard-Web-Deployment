import { Skeleton } from "@/components/ui/skeleton";

type PayrollTabSkeletonProps = {
  label: string;
  variant: "summary" | "list" | "timeline";
};

function Placeholder({ className }: { className: string }) {
  return <Skeleton className={`motion-reduce:animate-none ${className}`} />;
}

function PanelHeadingSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#dfe7e8] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Placeholder className="h-3 w-28" />
        <Placeholder className="mt-2 h-7 w-52 max-w-full" />
        <Placeholder className="mt-2 h-4 w-72 max-w-full" />
      </div>
      {action ? <Placeholder className="h-11 w-36 rounded-lg" /> : <Placeholder className="h-7 w-20 rounded-full" />}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-5">
      <PanelHeadingSkeleton />
      <div className="grid overflow-hidden rounded-xl border border-[#dfe7e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"
          >
            <Placeholder className="h-3 w-24" />
            <Placeholder className="mt-2 h-6 w-20" />
          </div>
        ))}
      </div>
      <Placeholder className="h-3 w-3/4 max-w-xl" />
      <div className="overflow-hidden rounded-xl border border-[#dfe7e8] bg-white">
        <div className="hidden grid-cols-5 gap-5 border-b border-[#dfe7e8] bg-[#f8fafb] px-5 py-3 lg:grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <Placeholder key={index} className="h-3 w-20 max-w-full" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 lg:grid-cols-5 lg:gap-5 lg:px-5">
            <Placeholder className="h-4 w-36 max-w-full" />
            <Placeholder className="h-6 w-24 rounded-full" />
            <Placeholder className="h-4 w-12" />
            <Placeholder className="h-4 w-20" />
            <Placeholder className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <PanelHeadingSkeleton action />
      <Placeholder className="h-4 w-24" />
      <div className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div>
              <Placeholder className="h-4 w-48 max-w-full" />
              <Placeholder className="mt-2 h-3 w-64 max-w-full" />
            </div>
            <Placeholder className="h-4 w-20" />
            <Placeholder className="h-11 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Placeholder className="h-6 w-40" />
        <Placeholder className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="py-3">
            <Placeholder className="h-4 w-44 max-w-full" />
            <Placeholder className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PayrollTabSkeleton({ label, variant }: PayrollTabSkeletonProps) {
  return (
    <section role="status" data-testid="payroll-tab-skeleton" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div data-testid="payroll-tab-skeleton-content" aria-hidden="true">
        {variant === "summary" ? <SummarySkeleton /> : variant === "timeline" ? <TimelineSkeleton /> : <ListSkeleton />}
      </div>
    </section>
  );
}

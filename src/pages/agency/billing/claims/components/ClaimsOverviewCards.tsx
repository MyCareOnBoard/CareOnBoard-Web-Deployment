import BillingOverviewCards from "../../components/BillingOverviewCards";
import type { BillingOverviewStat } from "../../components/types";

type ClaimsOverviewCardsProps = {
  stats: BillingOverviewStat[];
  loading?: boolean;
};

function OverviewCardSkeleton() {
  return (
    <div className="flex h-[77px] min-w-[199px] flex-[1_1_199px] animate-pulse flex-col justify-center rounded-[8px] border border-[#e5e5e6] bg-white px-4 py-[11px]">
      <div className="h-5 w-24 rounded bg-[#eef4f5]" />
      <div className="mt-2 h-4 w-32 rounded bg-[#eef4f5]" />
    </div>
  );
}

export default function ClaimsOverviewCards({ stats, loading = false }: ClaimsOverviewCardsProps) {
  if (loading) {
    return (
      <section>
        <h2 className="mb-4 text-[16px] font-semibold text-[#10141a]">Overview</h2>
        <div className="flex flex-wrap gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <OverviewCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  return <BillingOverviewCards stats={stats} showCountBadge />;
}

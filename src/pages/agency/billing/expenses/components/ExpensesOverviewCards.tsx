import { CircleCheck, CircleX, FileText, Hourglass } from "lucide-react";
import BillingOverviewCards from "../../components/BillingOverviewCards";
import type { BillingOverviewStat } from "../../components/types";

type ExpensesOverviewCardsProps = {
  /** Dashboard stats by id: submitted, awaiting-review, approved, declined (amount as value, count). */
  stats: BillingOverviewStat[];
  loading?: boolean;
};

const ICONS: Record<string, BillingOverviewStat["icon"]> = {
  submitted: FileText,
  "awaiting-review": Hourglass,
  approved: CircleCheck,
  declined: CircleX,
};

function footnote(stat: BillingOverviewStat) {
  const count = stat.count ?? 0;
  if (stat.id === "declined" && count === 0) return "Nothing declined.";
  if (stat.id === "submitted") return `${stat.value} this period.`;
  if (stat.id === "approved") return `${stat.value}, joins the next pay run.`;
  return `${stat.value}.`;
}

export default function ExpensesOverviewCards({ stats, loading = false }: ExpensesOverviewCardsProps) {
  const tiles = stats.map<BillingOverviewStat>((stat) => ({
    id: stat.id,
    label: stat.label,
    icon: ICONS[stat.id],
    value: (stat.count ?? 0).toLocaleString(),
    footnote: footnote(stat),
  }));
  return <BillingOverviewCards stats={tiles} loading={loading} skeletonCount={4} />;
}

import { CircleCheck, CircleX, ClipboardList, Send } from "lucide-react";
import { AgencyPill } from "@/components/agency/AgencyListKit";
import BillingOverviewCards from "../../components/BillingOverviewCards";
import type { BillingOverviewStat } from "../../components/types";

type ClaimsOverviewCardsProps = {
  /** Dashboard stats by id: submitted, pending, paid, rejected, at-risk (amount as value, count). */
  stats: BillingOverviewStat[];
  loading?: boolean;
  /** Completed shifts not yet on a claim. Left out where there is no such queue (e.g. the network view). */
  ready?: { count: number; clients: number; truncated: boolean; loading: boolean };
  /** Opens the rejected claims, from the "Fix" pill. */
  onFixRejected?: () => void;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

export default function ClaimsOverviewCards({ stats, loading = false, ready, onFixRejected }: ClaimsOverviewCardsProps) {
  const byId = new Map(stats.map((stat) => [stat.id, stat]));
  const metric = (id: string) => ({ count: byId.get(id)?.count ?? 0, amount: byId.get(id)?.value ?? "$0.00" });
  const pending = metric("pending");
  const paid = metric("paid");
  const rejected = metric("rejected");
  const atRisk = metric("at-risk");

  const readyTile: BillingOverviewStat[] = ready ? [
    {
      id: "ready",
      label: "Ready to bill",
      icon: ClipboardList,
      value: ready.loading && ready.count === 0 ? "…" : `${ready.count.toLocaleString()}${ready.truncated ? "+" : ""}`,
      footnote: ready.count ? `Across ${plural(ready.clients, "client")}.` : "Nothing waiting to be billed.",
    },
  ] : [];

  const tiles: BillingOverviewStat[] = [
    ...readyTile,
    {
      id: "submitted",
      label: "Submitted",
      icon: Send,
      value: pending.count.toLocaleString(),
      footnote: `${pending.amount} awaiting remittance.`,
    },
    {
      id: "paid",
      label: "Paid",
      icon: CircleCheck,
      value: paid.count.toLocaleString(),
      footnote: `${paid.amount} received.`,
    },
    {
      id: "rejected",
      label: "Rejected",
      icon: CircleX,
      value: rejected.count.toLocaleString(),
      extra: rejected.count > 0 && onFixRejected ? (
        <button type="button" onClick={onFixRejected} aria-label="Fix rejected claims"
          className="cursor-pointer rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]">
          <AgencyPill tone="red">Fix</AgencyPill>
        </button>
      ) : null,
      footnote: atRisk.count > 0
        ? `${rejected.amount} to fix, ${atRisk.amount} at risk.`
        : `${rejected.amount} to fix.`,
    },
  ];

  return <BillingOverviewCards stats={tiles} loading={loading} skeletonCount={tiles.length} />;
}

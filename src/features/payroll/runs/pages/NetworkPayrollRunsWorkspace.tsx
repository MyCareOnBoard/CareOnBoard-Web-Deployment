import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useListSuperAdminNetworkPayrollRunsQuery } from "../api/superAdminPayrollRunEndpoints";
import type { NetworkPayrollRunRow } from "../api/superAdminPayrollRunEndpoints";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const cents = (value: number) => currency.format(value / 100);
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const stateLabel = (value: NetworkPayrollRunRow["workflowState"]) => value
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

function NetworkPayrollRunItem({ row, onOpenAgency }: {
  row: NetworkPayrollRunRow;
  onOpenAgency: (agencyId: string) => void;
}) {
  return (
    <li
      aria-label={`${row.agencyName} payroll run`}
      className="grid gap-4 border-b border-[#e5e5e6] px-5 py-5 last:border-b-0 md:grid-cols-[minmax(12rem,1.35fr)_minmax(11rem,1fr)_minmax(8rem,0.7fr)_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#10141a]">{row.agencyName}</p>
        <p className="mt-1 text-xs text-[#62686f]">
          {row.runType === "off_cycle" ? "Off-cycle" : "Regular"} · {dateLabel(row.periodStart)} – {dateLabel(row.periodEnd)}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#62686f]">Status</p>
        <p className="mt-1 text-sm font-semibold text-[#20282a]">{stateLabel(row.workflowState)}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#62686f]">Total due</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-[#10141a]">{cents(row.totals.totalDueCents)}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start md:justify-self-end"
        onClick={() => onOpenAgency(row.agencyId)}
      >
        Open {row.agencyName} payroll
      </Button>
    </li>
  );
}

export function NetworkPayrollRunsWorkspace({ actorUid, onOpenAgency }: {
  actorUid: string;
  onOpenAgency: (agencyId: string) => void;
}) {
  const [storedCursors, setStoredCursors] = useState<{
    actorUid: string;
    values: Array<string | undefined>;
  }>(() => ({ actorUid, values: [undefined] }));
  const cursors = storedCursors.actorUid === actorUid ? storedCursors.values : [undefined];
  const cursor = cursors.at(-1);
  const query = useListSuperAdminNetworkPayrollRunsQuery({ actorUid, ...(cursor ? { cursor } : {}) }, { skip: !actorUid });
  const [storedPage, setStoredPage] = useState<{
    actorUid: string;
    page: NonNullable<typeof query.currentData>;
  } | null>(() => query.currentData ? { actorUid, page: query.currentData } : null);
  const visiblePage = storedPage?.actorUid === actorUid ? storedPage.page : null;

  useEffect(() => {
    setStoredCursors({ actorUid, values: [undefined] });
    setStoredPage(null);
  }, [actorUid]);

  useEffect(() => {
    if (query.currentData) setStoredPage({ actorUid, page: query.currentData });
  }, [actorUid, query.currentData]);

  const rows = visiblePage?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-[1440px] py-2" aria-busy={query.isLoading || query.isFetching}>
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007f83]">Network payroll</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#10141a]">Authorized payroll runs</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#62686f]">
          Review payroll status across your authorized agencies. Open one agency to enter its trusted read-only workspace.
        </p>
      </header>

      {query.error && !query.currentData ? (
        <div role="alert" className="rounded-xl border border-[#efcaca] bg-[#fff1f1] px-5 py-5 text-sm text-[#8d3131]">
          Network payroll runs could not be loaded.
        </div>
      ) : rows.length ? (<>
        <div className="overflow-hidden rounded-2xl border border-[#e5e5e6] bg-white">
          <ul aria-label="Authorized network payroll runs" aria-busy={query.isFetching}>
            {rows.map((row) => <NetworkPayrollRunItem key={row.networkRunKey} row={row} onOpenAgency={onOpenAgency} />)}
          </ul>
        </div>
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Network payroll pages">
          <Button
            type="button"
            variant="outline"
            disabled={cursors.length === 1}
            aria-disabled={cursors.length === 1 || query.isFetching}
            aria-label="Previous network payroll page"
            onClick={() => {
              if (!query.isFetching) {
                setStoredCursors((current) => ({
                  actorUid,
                  values: current.actorUid === actorUid ? current.values.slice(0, -1) : [undefined],
                }));
              }
            }}
          >Previous</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!visiblePage?.hasMore || !visiblePage.nextCursor}
            aria-disabled={!visiblePage?.hasMore || !visiblePage.nextCursor || query.isFetching}
            aria-label="Next network payroll page"
            onClick={() => {
              if (!query.isFetching && visiblePage?.hasMore && visiblePage.nextCursor) {
                setStoredCursors((current) => ({
                  actorUid,
                  values: [
                    ...(current.actorUid === actorUid ? current.values : [undefined]),
                    visiblePage.nextCursor ?? undefined,
                  ],
                }));
              }
            }}
          >Next</Button>
        </nav>
      </>
      ) : query.isLoading ? (
        <p role="status" className="rounded-xl border border-[#e5e5e6] bg-white px-5 py-8 text-sm text-[#62686f]">Loading payroll runs…</p>
      ) : (
        <section className="rounded-xl border border-[#e5e5e6] bg-white px-5 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#10141a]">No payroll runs yet.</h3>
          <p className="mt-2 text-sm text-[#62686f]">Runs will appear after eligible payroll periods become active.</p>
        </section>
      )}
      <p className="sr-only" aria-live="polite">{query.isFetching ? "Updating authorized payroll runs." : "Authorized payroll runs are ready."}</p>
    </main>
  );
}

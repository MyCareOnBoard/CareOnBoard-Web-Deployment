import { useState } from "react";

import { useListPayrollRunEventsQuery } from "../../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope } from "../../model/types";

const instant = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
});
const eventLabel = (value: string) => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export function PayrollAuditPanel({ scope, runId, activeRevisionId, expandedAudit = false }: {
  scope: AgencyPayrollRunScope;
  runId: string;
  activeRevisionId: string;
  expandedAudit?: boolean;
}) {
  const paginationKey = JSON.stringify([scope.actorUid, scope.agencyId, runId, activeRevisionId]);
  const [pagination, setPagination] = useState<{ key: string; cursors: Array<string | undefined> }>({
    key: paginationKey,
    cursors: [undefined],
  });
  const cursors = pagination.key === paginationKey ? pagination.cursors : [undefined];
  const cursor = cursors.at(-1);
  const args = { ...scope, runId, activeRevisionId, ...(cursor ? { cursor } : {}) };
  const { data, isLoading, isFetching, isError, refetch } = useListPayrollRunEventsQuery(args);

  return (
    <section aria-labelledby="payroll-audit-heading" className="space-y-4">
      <div>
        <h2 id="payroll-audit-heading" className="text-lg font-semibold text-[#10141a]">Audit timeline</h2>
        <p className="mt-1 text-sm text-[#62686f]">Immutable payroll milestones for this run.</p>
      </div>
      {expandedAudit ? (
        <aside role="region" aria-label="Expanded audit" className="border-y border-[#b8dfe0] bg-[#f7fbfb] px-3 py-3 text-sm text-[#31595b]">
          Expanded audit context is enabled for this workspace.
        </aside>
      ) : null}
      {isLoading && !data ? <p role="status" className="py-6 text-sm text-[#62686f]">Loading audit timeline…</p> : null}
      {isError && !data ? (
        <p role="alert" className="border-y border-[#efcaca] py-4 text-sm text-[#8d3131]">
          Audit timeline could not be loaded.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Retry</button>
        </p>
      ) : null}
      {data?.items.length === 0 ? <p className="py-6 text-sm text-[#62686f]">No audit events recorded.</p> : null}
      {data?.items.length ? (
        <ol aria-busy={isFetching} className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
          {data.items.slice(0, 25).map((event) => (
            <li key={event.eventId} className="py-3">
              <p className="text-sm font-semibold text-[#10141a]">{eventLabel(event.type)}</p>
              <p className="mt-1 text-xs tabular-nums text-[#62686f]">{instant.format(new Date(event.occurredAt))}</p>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={cursors.length === 1 || isFetching} onClick={() => setPagination({ key: paginationKey, cursors: cursors.slice(0, -1) })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Previous page</button>
        <button type="button" disabled={!data?.nextCursor || isFetching} onClick={() => data?.nextCursor && setPagination({ key: paginationKey, cursors: [...cursors, data.nextCursor] })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Next page</button>
      </div>
    </section>
  );
}

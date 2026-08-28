import { useEffect, useRef, useState } from "react";

import {
  useLazyGetPayrollRunEmployeeQuery,
  useLazyListPayrollRunEmployeeSourcesQuery,
} from "../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope, PayrollRunIdentity } from "../model/types";

type AbortableRequest = { abort?: () => void };

function formatServiceDate(value: string | null): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function PayrollEmployeeDetail({ scope, identity, employeeId }: {
  scope: AgencyPayrollRunScope;
  identity: Extract<PayrollRunIdentity, { kind: "run" }>;
  employeeId: string;
}) {
  const [loadDetail, detail] = useLazyGetPayrollRunEmployeeQuery();
  const [loadSources, sources] = useLazyListPayrollRunEmployeeSourcesQuery();
  const detailRequest = useRef<AbortableRequest | null>(null);
  const sourceRequest = useRef<AbortableRequest | null>(null);
  const [sourcesRequested, setSourcesRequested] = useState(false);
  const requestArgs = {
    ...scope,
    runId: identity.runId,
    activeRevisionId: identity.activeRevisionId,
    employeeId,
  };

  useEffect(() => {
    const pending = loadDetail(requestArgs, false);
    detailRequest.current = pending;
    setSourcesRequested(false);
    return () => {
      pending.abort?.();
      if (detailRequest.current === pending) detailRequest.current = null;
      sourceRequest.current?.abort?.();
      sourceRequest.current = null;
    };
  }, [
    employeeId,
    identity.activeRevisionId,
    identity.runId,
    loadDetail,
    scope.actorUid,
    scope.agencyId,
    scope.audience,
    scope.mode,
  ]);

  const showSources = () => {
    if (sourcesRequested) return;
    setSourcesRequested(true);
    sourceRequest.current = loadSources(requestArgs, false);
  };

  return (
    <div
      className="border-t border-[#e5e5e6] bg-[#fafcfc] px-4 py-4 sm:px-5"
      aria-busy={detail.isFetching}
    >
      {detail.isFetching && !detail.data ? (
        <div className="space-y-2" aria-hidden="true">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#e5eeee]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#e5eeee]" />
        </div>
      ) : detail.error ? (
        <p role="alert" className="text-sm text-[#a63a3a]">
          Employee payroll details could not be loaded. Collapse and try again.
        </p>
      ) : detail.data ? (
        <div className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-[#62686f]">
              Sources <span className="font-semibold tabular-nums text-[#10141a]">{detail.data.sourceCount}</span>
            </p>
            <p className="text-[#62686f]">
              Employment <span className="font-semibold capitalize text-[#10141a]">{detail.data.employmentType}</span>
            </p>
          </div>

          {detail.data.sourceDetailsAvailable ? (
            <button
              type="button"
              onClick={showSources}
              aria-expanded={sourcesRequested}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[#007f83] hover:bg-[#e9f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
            >
              {sourcesRequested ? "Source details" : "Show source details"}
            </button>
          ) : null}

          {sourcesRequested ? (
            <div aria-busy={sources.isFetching}>
              {sources.isFetching && !sources.data ? (
                <p className="text-sm text-[#62686f]">Loading source details…</p>
              ) : sources.error ? (
                <p role="alert" className="text-sm text-[#a63a3a]">Source details could not be loaded.</p>
              ) : sources.data?.items.length ? (
                <ul className="divide-y divide-[#e5e5e6]" aria-label="Payroll source details">
                  {sources.data.items.map((source) => (
                    <li key={source.key} className="py-2 text-sm text-[#40464d]">
                      {source.type} · {formatServiceDate(source.serviceDate)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#62686f]">No source details are available.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

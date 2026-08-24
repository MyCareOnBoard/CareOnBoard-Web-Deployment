import { useState } from "react";

import type { PayrollInvoiceDetail } from "@/lib/api/payroll";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import PayrollInvoiceModal from "@/pages/agency/billing/payroll/components/PayrollInvoiceModal";
import { buildPayrollInvoiceDocument } from "@/pages/agency/billing/payroll/utils/buildPayrollInvoiceDocument";
import {
  useLazyGetLegacyPayrollInvoiceQuery,
  useListLegacyPayrollHistoryQuery,
  type LegacyPayrollInvoiceDetail,
} from "../../api/legacyPayrollHistoryEndpoints";
import type { AgencyPayrollRunScope } from "../../model/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));

function invoiceDocument(value: LegacyPayrollInvoiceDetail) {
  const compatible: PayrollInvoiceDetail = {
    ...value,
    invoiceNumber: value.invoiceNumber ?? "",
    employeeId: value.employeeId ?? "",
    createdAt: value.createdAt ?? "",
    updatedAt: value.updatedAt ?? "",
  };
  return buildPayrollInvoiceDocument(compatible, compatible.invoicePrefill);
}

export function LegacyPayrollHistoryPanel({ scope, startDate, endDate, mode }: {
  scope: AgencyPayrollRunScope;
  startDate: string;
  endDate: string;
  mode?: AgencyMode;
}) {
  const paginationKey = JSON.stringify([scope.actorUid, scope.agencyId, startDate, endDate, mode]);
  const [pagination, setPagination] = useState<{ key: string; cursors: Array<string | undefined> }>({
    key: paginationKey,
    cursors: [undefined],
  });
  const [selection, setSelection] = useState<{ key: string; value: LegacyPayrollInvoiceDetail } | null>(null);
  const [detailFailure, setDetailFailure] = useState<{ key: string; message: string } | null>(null);
  const cursors = pagination.key === paginationKey ? pagination.cursors : [undefined];
  const selected = selection?.key === paginationKey ? selection.value : null;
  const detailError = detailFailure?.key === paginationKey ? detailFailure.message : null;
  const cursor = cursors.at(-1);
  const args = { ...scope, startDate, endDate, ...(mode ? { mode } : {}), ...(cursor ? { cursor } : {}) };
  const { data, isLoading, isFetching, isError, refetch } = useListLegacyPayrollHistoryQuery(args);
  const [getDetail, detailState] = useLazyGetLegacyPayrollInvoiceQuery();

  const openDetail = async (invoiceId: string) => {
    setDetailFailure(null);
    try {
      setSelection({ key: paginationKey, value: await getDetail({ ...scope, invoiceId }, true).unwrap() });
    } catch {
      setDetailFailure({ key: paginationKey, message: "Legacy invoice detail could not be loaded." });
    }
  };
  const document = selected ? invoiceDocument(selected) : null;

  return (
    <section aria-labelledby="legacy-payroll-history-heading" className="space-y-4">
      <div className="border-b border-[#dfe7e8] pb-4">
        <h2 id="legacy-payroll-history-heading" className="text-xl font-semibold text-[#10141a]">Legacy payroll invoice history</h2>
        <p className="mt-1 text-sm text-[#62686f]">Historical invoices are available for reference only.</p>
      </div>
      {isLoading && !data ? <p role="status" className="py-8 text-sm text-[#62686f]">Loading legacy payroll history…</p> : null}
      {isError && !data ? (
        <p role="alert" className="border-y border-[#efcaca] py-4 text-sm text-[#8d3131]">
          Legacy payroll history could not be loaded.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Retry</button>
        </p>
      ) : null}
      {detailError ? <p role="alert" className="text-sm text-[#8d3131]">{detailError}</p> : null}
      {data?.items.length === 0 ? <p className="py-8 text-sm text-[#62686f]">No legacy payroll invoices in this period.</p> : null}
      {data?.items.length ? (
        <ul aria-busy={isFetching || detailState.isFetching} className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
          {data.items.slice(0, 25).map((invoice) => (
            <li key={invoice.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div>
                <p className="font-semibold text-[#10141a]">{invoice.employeeName ?? "Staff member"}</p>
                <p className="mt-1 text-sm text-[#62686f]">{dateLabel(invoice.periodStart)} – {dateLabel(invoice.periodEnd)}</p>
                <span className="mt-2 inline-flex rounded-full bg-[#f1f3f4] px-2 py-1 text-xs font-semibold text-[#4d545b]">Read only</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-[#10141a]">{money.format(invoice.grossAmount)}</p>
              <button type="button" disabled={detailState.isFetching} onClick={() => void openDetail(invoice.id)} className="min-h-11 rounded-lg border border-[#b8dfe0] px-3 text-sm font-semibold text-[#006f73] disabled:opacity-50">View legacy invoice</button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={cursors.length === 1 || isFetching} onClick={() => setPagination({ key: paginationKey, cursors: cursors.slice(0, -1) })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Previous page</button>
        <button type="button" disabled={!data?.nextCursor || isFetching} onClick={() => data?.nextCursor && setPagination({ key: paginationKey, cursors: [...cursors, data.nextCursor] })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Next page</button>
      </div>
      {document && selected ? (
        <PayrollInvoiceModal open staffName={selected.employeeName ?? "Staff member"} invoice={document} onClose={() => setSelection(null)} />
      ) : null}
    </section>
  );
}

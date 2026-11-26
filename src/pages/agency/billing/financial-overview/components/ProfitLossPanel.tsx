import { useEffect, useId, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import { Button } from "@/components/ui/button";
import { listClients } from "@/lib/api/clients";
import { apiErrorMessage } from "@/lib/api/service-authorizations";
import {
  marginText,
  presetRange,
  profitLossApi,
  PROFIT_LOSS_PRESETS,
  rangeProblem,
  type ProfitLossGrouping,
  type ProfitLossPreset,
  type ProfitLossReport,
  type ProfitLossTotals,
} from "@/lib/api/profit-loss";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import AgencyExpenseLedgerDialog from "./AgencyExpenseLedgerDialog";

const FIELD = "h-10 w-full rounded-lg border border-[#dce7e8] bg-white px-3 text-sm text-[#10141a] focus:border-[#008b90] focus:outline-none focus:ring-2 focus:ring-[#008b90]/20 dark:border-white/15 dark:bg-[#141b22] dark:text-[#f4f6f7]";
const LABEL = "mb-1 block text-xs font-medium text-[#5e7378] dark:text-[#a9b6ba]";
const MUTED = "text-[#5e7378] dark:text-[#a9b6ba]";
const INK = "text-[#10141a] dark:text-[#f4f6f7]";
const GROUPINGS: Array<{ value: ProfitLossGrouping; label: string }> = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

function resultTone(totals: Pick<ProfitLossTotals, "result">) {
  return totals.result === "loss" ? "text-[#b42318] dark:text-[#ff9b8f]" : totals.result === "profit" ? "text-[#007f84] dark:text-[#7fd3d3]" : INK;
}

/** Losses read "-$1,200.00" rather than relying on colour alone. */
function signed(amount: number) {
  return amount < 0 ? `-${formatCurrency(Math.abs(amount))}` : formatCurrency(amount);
}

type ClientOption = { id: string; name: string };

/**
 * Financial overview › Profit and loss: successfully billed revenue against
 * payroll and non-payroll expenses, by month, quarter or year.
 */
export default function ProfitLossPanel({ agencyId, mode, canViewLedger, canManageLedger }: {
  agencyId: string;
  mode: AgencyMode | null;
  canViewLedger: boolean;
  canManageLedger: boolean;
}) {
  const id = useId();
  const [preset, setPreset] = useState<ProfitLossPreset>("year_to_date");
  const [custom, setCustom] = useState(() => presetRange("year_to_date"));
  const [groupBy, setGroupBy] = useState<ProfitLossGrouping>("month");
  const [clientId, setClientId] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [department, setDepartment] = useState("");
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  // Service codes seen with no service filter on, so the picker keeps its choices once one is chosen.
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const range = useMemo(() => (preset === "custom" ? custom : presetRange(preset)), [preset, custom]);
  const problem = rangeProblem(range.startDate, range.endDate);
  // The ledger needs a loadable range even while the custom dates are incomplete.
  const ledgerRange = useMemo(() => (problem ? presetRange("year_to_date") : range), [problem, range]);

  useEffect(() => {
    let live = true;
    listClients({ agencyId, all: true, ...(mode ? { type: mode } : {}) })
      .then((list) => {
        if (!live) return;
        setClients(list
          .map((client) => ({ id: client.id, name: [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Unnamed client" }))
          .sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => { /* The client filter stays empty; the report still loads. */ });
    return () => { live = false; };
  }, [agencyId, mode]);

  useEffect(() => {
    if (problem) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    profitLossApi.report({ agencyId }, { ...range, groupBy, clientId, serviceCode, department, ...(mode ? { mode } : {}) }, controller.signal)
      .then((data) => {
        setReport(data);
        if (!serviceCode) setServiceCodes(data.revenueByService.map((row) => row.serviceCode));
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setError(apiErrorMessage(err, "Profit and loss could not be loaded."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [agencyId, mode, range, groupBy, clientId, serviceCode, department, problem, reloadKey]);

  const totals = report?.totals;
  const serviceOptions = serviceCode && !serviceCodes.includes(serviceCode) ? [serviceCode, ...serviceCodes] : serviceCodes;
  const departmentOptions = report?.departments || (department ? [department] : []);
  const filtered = Boolean(clientId || serviceCode || department);
  const tiles = totals ? [
    { label: "Billed revenue", value: formatCurrency(totals.billedRevenue), note: `${totals.billedCount.toLocaleString()} ${totals.billedCount === 1 ? "claim" : "claims"} submitted or paid`, tone: INK },
    { label: "Cash collected", value: formatCurrency(totals.cashCollected), note: `${formatCurrency(totals.outstanding)} still outstanding`, tone: INK },
    { label: "Total expenses", value: formatCurrency(totals.totalExpenses), note: `Payroll ${formatCurrency(totals.payrollExpenses)}, other ${formatCurrency(totals.nonPayrollExpenses)}`, tone: INK },
    {
      label: totals.result === "loss" ? "Operating loss" : "Operating profit",
      value: signed(totals.operatingProfit),
      note: totals.profitMarginPercent === null ? "No billed revenue in this range" : `Margin ${marginText(totals.profitMarginPercent)}`,
      tone: resultTone(totals),
    },
  ] : [];

  return (
    <AgencyPanel
      icon={Scale}
      title="Profit and loss"
      busy={loading}
      action={canViewLedger ? <Button variant="outline" size="sm" onClick={() => setLedgerOpen(true)}>{canManageLedger ? "Manage agency expenses" : "View agency expenses"}</Button> : undefined}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor={`${id}-range`} className={LABEL}>Period</label>
            <select id={`${id}-range`} value={preset} onChange={(e) => setPreset(e.target.value as ProfitLossPreset)} className={FIELD}>
              {PROFIT_LOSS_PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-group`} className={LABEL}>Show by</label>
            <select id={`${id}-group`} value={groupBy} onChange={(e) => setGroupBy(e.target.value as ProfitLossGrouping)} className={FIELD}>
              {GROUPINGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-service`} className={LABEL}>Service</label>
            <select id={`${id}-service`} value={serviceCode} onChange={(e) => setServiceCode(e.target.value)} className={FIELD}>
              <option value="">All services</option>
              {serviceOptions.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-client`} className={LABEL}>Client</label>
            <select id={`${id}-client`} value={clientId} onChange={(e) => setClientId(e.target.value)} className={FIELD}>
              <option value="">All clients</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-department`} className={LABEL}>Department</label>
            <select id={`${id}-department`} value={department} onChange={(e) => setDepartment(e.target.value)} className={FIELD} disabled={departmentOptions.length === 0}>
              <option value="">{departmentOptions.length ? "All departments" : "No departments yet"}</option>
              {departmentOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {preset === "custom" && (
            <>
              <div>
                <label htmlFor={`${id}-start`} className={LABEL}>From</label>
                <input id={`${id}-start`} type="date" value={custom.startDate} max={custom.endDate || undefined} onChange={(e) => setCustom((current) => ({ ...current, startDate: e.target.value }))} className={FIELD} />
              </div>
              <div>
                <label htmlFor={`${id}-end`} className={LABEL}>To</label>
                <input id={`${id}-end`} type="date" value={custom.endDate} min={custom.startDate || undefined} onChange={(e) => setCustom((current) => ({ ...current, endDate: e.target.value }))} className={FIELD} />
              </div>
            </>
          )}
        </div>
        {filtered && (
          <button type="button" onClick={() => { setClientId(""); setServiceCode(""); setDepartment(""); }} className="cursor-pointer self-start text-sm font-medium text-[#007679] underline underline-offset-2 dark:text-[#7fd3d3]">
            Clear filters
          </button>
        )}

        {problem && <p role="alert" className="text-sm text-[#b42318] dark:text-[#ff9b8f]">{problem}</p>}
        {!problem && error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-[#b42318] dark:text-[#ff9b8f]">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>Try again</Button>
          </div>
        )}
        {!problem && !error && !report && <p role="status" className={`py-8 text-center text-sm ${MUTED}`}>Loading profit and loss…</p>}

        {!problem && report && totals && (
          <div className={`flex flex-col gap-5 ${loading ? "opacity-60" : ""}`}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-xl border border-[#dce7e8] px-4 py-3 dark:border-white/10">
                  <dt className={`text-xs ${MUTED}`}>{tile.label}</dt>
                  <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tile.tone}`}>{tile.value}</dd>
                  <dd className={`mt-1 text-xs ${MUTED}`}>{tile.note}</dd>
                </div>
              ))}
            </dl>

            <div className={`flex flex-col gap-1 text-xs ${MUTED}`}>
              <p>
                Revenue counts claims that were submitted and not rejected, including paid claims. Left out: {formatCurrency(totals.rejectedAmount)} rejected and {formatCurrency(totals.unsubmittedAmount)} not yet submitted.
              </p>
              {report.expensesScope === "agency" && <p>Expenses are for the whole agency. Payroll and other costs are not recorded per client, service or program, so only revenue follows those filters.</p>}
              {report.expensesScope === "department" && <p>Only agency expenses recorded for this department are counted. Payroll and staff expenses have no department.</p>}
              {!report.payrollAvailable && <p className="text-[#8a5a00] dark:text-[#f5c96a]">Payroll could not be loaded, so expenses and profit are missing payroll.</p>}
              {report.truncated && <p className="text-[#8a5a00] dark:text-[#f5c96a]">This range has more claims than one report can hold. Choose a shorter range for exact totals.</p>}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#dce7e8] dark:border-white/10">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Profit and loss by {groupBy}</caption>
                <thead className={`bg-[#f5f9f9] text-xs uppercase tracking-wide dark:bg-white/5 ${MUTED}`}>
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Period</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Billed revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Cash collected</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Payroll</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Other expenses</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Profit or loss</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {report.periods.map((period) => (
                    <tr key={period.key} className="border-t border-[#dce7e8] dark:border-white/10">
                      <th scope="row" className={`px-4 py-2.5 font-medium ${INK}`}>{period.label}</th>
                      <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(period.billedRevenue)}</td>
                      <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(period.cashCollected)}</td>
                      <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(period.payrollExpenses)}</td>
                      <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(period.nonPayrollExpenses)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${resultTone(period)}`}>{signed(period.operatingProfit)}</td>
                      <td className={`px-4 py-2.5 text-right ${INK}`}>{marginText(period.profitMarginPercent)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="tabular-nums">
                  <tr className="border-t-2 border-[#dce7e8] bg-[#f5f9f9] font-semibold dark:border-white/10 dark:bg-white/5">
                    <th scope="row" className={`px-4 py-2.5 ${INK}`}>Total</th>
                    <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(totals.billedRevenue)}</td>
                    <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(totals.cashCollected)}</td>
                    <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(totals.payrollExpenses)}</td>
                    <td className={`px-4 py-2.5 text-right ${INK}`}>{formatCurrency(totals.nonPayrollExpenses)}</td>
                    <td className={`px-4 py-2.5 text-right ${resultTone(totals)}`}>{signed(totals.operatingProfit)}</td>
                    <td className={`px-4 py-2.5 text-right ${INK}`}>{marginText(totals.profitMarginPercent)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Breakdown
                title="Expenses by category"
                empty="No expenses in this range."
                rows={[
                  { key: "payroll", label: "Payroll wages", amount: totals.payrollExpenses },
                  ...totals.expensesByCategory.map((row) => ({ key: row.key, label: row.label, amount: row.amount })),
                ].filter((row) => row.amount > 0)}
              />
              <Breakdown
                title="Billed revenue by service"
                empty="No billed revenue in this range."
                rows={report.revenueByService.map((row) => ({
                  key: row.serviceCode,
                  label: row.serviceCode,
                  amount: row.billedRevenue,
                  note: `${row.claims.toLocaleString()} ${row.claims === 1 ? "claim" : "claims"}`,
                }))}
              />
            </div>
          </div>
        )}
      </div>

      {ledgerOpen && (
        <AgencyExpenseLedgerDialog
          agencyId={agencyId}
          range={ledgerRange}
          canManage={canManageLedger}
          departments={report?.departments || []}
          onClose={(changed) => {
            setLedgerOpen(false);
            if (changed) setReloadKey((value) => value + 1);
          }}
        />
      )}
    </AgencyPanel>
  );
}

function Breakdown({ title, rows, empty }: {
  title: string;
  empty: string;
  rows: Array<{ key: string; label: string; amount: number; note?: string }>;
}) {
  const largest = Math.max(0, ...rows.map((row) => row.amount));
  return (
    <div className="rounded-xl border border-[#dce7e8] px-4 py-3 dark:border-white/10">
      <h3 className={`text-sm font-semibold ${INK}`}>{title}</h3>
      {rows.length === 0 ? <p className={`mt-3 text-sm ${MUTED}`}>{empty}</p> : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`min-w-0 truncate ${INK}`}>{row.label}{row.note && <span className={`ml-2 text-xs ${MUTED}`}>{row.note}</span>}</span>
                <span className={`shrink-0 font-medium tabular-nums ${INK}`}>{formatCurrency(row.amount)}</span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 rounded-full bg-[#eef3f3] dark:bg-white/10">
                <div className="h-1.5 rounded-full bg-[#008b90]" style={{ width: `${largest > 0 ? Math.max(2, (row.amount / largest) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

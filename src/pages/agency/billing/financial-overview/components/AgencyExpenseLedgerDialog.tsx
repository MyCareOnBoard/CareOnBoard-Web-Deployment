import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiErrorMessage, formatCivilDate } from "@/lib/api/service-authorizations";
import {
  profitLossApi,
  type AgencyExpenseEntry,
  type AgencyExpenseList,
  type ExpenseCategoryKey,
} from "@/lib/api/profit-loss";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";

const FIELD = "h-10 w-full rounded-lg border border-[#dce7e8] bg-white px-3 text-sm text-[#10141a] focus:border-[#008b90] focus:outline-none focus:ring-2 focus:ring-[#008b90]/20 dark:border-white/15 dark:bg-[#141b22] dark:text-[#f4f6f7]";
const LABEL = "mb-1 block text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]";
const MUTED = "text-[#5e7378] dark:text-[#a9b6ba]";
const LINK = "cursor-pointer font-medium text-[#007679] underline underline-offset-2 disabled:cursor-default disabled:opacity-60 dark:text-[#7fd3d3]";

type Draft = { id: string | null; category: ExpenseCategoryKey; amount: string; date: string; description: string; vendor: string; department: string };

/** What stops a draft being saved, or "" when it is ready. */
export function draftProblem(draft: Pick<Draft, "amount" | "date" | "description">): string {
  const amount = Number(draft.amount);
  if (!draft.description.trim()) return "Describe the expense.";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than zero.";
  if (!/^\d*(\.\d{1,2})?$/.test(draft.amount.trim())) return "Use at most two decimal places.";
  if (!draft.date) return "Choose the date of the expense.";
  return "";
}

/**
 * The agency's own expenses (rent, office, transportation and so on) that are
 * not staff reimbursements. They feed the non-payroll side of profit and loss.
 */
export default function AgencyExpenseLedgerDialog({ agencyId, range, canManage, departments, onClose }: {
  agencyId: string;
  range: { startDate: string; endDate: string };
  canManage: boolean;
  departments: string[];
  /** `changed` is true when an entry was added, edited or deleted. */
  onClose: (changed: boolean) => void;
}) {
  const id = useId();
  const [list, setList] = useState<AgencyExpenseList | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    profitLossApi.listExpenses({ agencyId }, range, controller.signal)
      .then(setList)
      .catch((err) => { if (!controller.signal.aborted) setError(apiErrorMessage(err, "Agency expenses could not be loaded.")); });
    return () => controller.abort();
  }, [agencyId, range, reloadKey]);

  const categories = list?.categories || [];
  const categoryLabel = (key: string) => categories.find((item) => item.key === key)?.label || key;
  const blank = (): Draft => ({ id: null, category: categories[0]?.key || "administrative", amount: "", date: range.endDate, description: "", vendor: "", department: "" });
  const edit = (entry: AgencyExpenseEntry): Draft => ({
    id: entry.id, category: entry.category, amount: String(entry.amount), date: entry.date,
    description: entry.description, vendor: entry.vendor || "", department: entry.department || "",
  });
  const refresh = () => { setChanged(true); setReloadKey((value) => value + 1); };

  const save = async () => {
    if (!draft) return;
    const problem = draftProblem(draft);
    if (problem) { setFormError(problem); return; }
    setSaving(true);
    setFormError("");
    const input = {
      category: draft.category,
      amount: Number(draft.amount),
      date: draft.date,
      description: draft.description.trim(),
      vendor: draft.vendor.trim() || null,
      department: draft.department.trim() || null,
    };
    try {
      if (draft.id) await profitLossApi.updateExpense({ agencyId }, draft.id, input);
      else await profitLossApi.createExpense({ agencyId }, input);
      setDraft(null);
      refresh();
    } catch (err) {
      setFormError(apiErrorMessage(err, "The expense could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expenseId: string) => {
    setSaving(true);
    setError("");
    try {
      await profitLossApi.deleteExpense({ agencyId }, expenseId);
      setConfirmingDelete(null);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "The expense could not be deleted."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose(changed)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agency expenses</DialogTitle>
          <DialogDescription>
            Costs the agency pays directly, such as rent, office and transportation, from {formatCivilDate(range.startDate)} to {formatCivilDate(range.endDate)}. Staff reimbursements and payroll are counted separately.
          </DialogDescription>
        </DialogHeader>

        {error && <p role="alert" className="text-sm text-[#b42318] dark:text-[#ff9b8f]">{error}</p>}

        {draft ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
            <h3 className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">{draft.id ? "Edit expense" : "Add expense"}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-description`} className={LABEL}>Description</label>
                <input id={`${id}-description`} value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={FIELD} autoFocus />
              </div>
              <div>
                <label htmlFor={`${id}-category`} className={LABEL}>Category</label>
                <select id={`${id}-category`} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategoryKey })} className={FIELD}>
                  {categories.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-amount`} className={LABEL}>Amount (USD)</label>
                <input id={`${id}-amount`} type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={FIELD} />
              </div>
              <div>
                <label htmlFor={`${id}-date`} className={LABEL}>Date</label>
                <input id={`${id}-date`} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={FIELD} />
              </div>
              <div>
                <label htmlFor={`${id}-vendor`} className={LABEL}>Paid to (optional)</label>
                <input id={`${id}-vendor`} value={draft.vendor} maxLength={120} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} className={FIELD} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-department`} className={LABEL}>Department (optional)</label>
                <input id={`${id}-department`} list={`${id}-departments`} value={draft.department} maxLength={80} onChange={(e) => setDraft({ ...draft, department: e.target.value })} className={FIELD} />
                <datalist id={`${id}-departments`}>{departments.map((name) => <option key={name} value={name} />)}</datalist>
                <p className={`mt-1 text-xs ${MUTED}`}>Lets profit and loss be filtered by department.</p>
              </div>
            </div>
            {formError && <p role="alert" className="text-sm text-[#b42318] dark:text-[#ff9b8f]">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDraft(null); setFormError(""); }} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save expense"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {!list && !error && <p role="status" className={`py-8 text-center text-sm ${MUTED}`}>Loading agency expenses…</p>}
            {list && list.entries.length === 0 && (
              <p className={`rounded-xl border border-dashed border-[#dce7e8] px-4 py-8 text-center text-sm dark:border-white/10 ${MUTED}`}>
                No agency expenses in this period yet.{canManage ? " Add rent, office and other costs so profit and loss reflects them." : ""}
              </p>
            )}
            {list && list.entries.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#dce7e8] dark:border-white/10">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className={`bg-[#f5f9f9] text-xs uppercase tracking-wide dark:bg-white/5 ${MUTED}`}>
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Expense</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                      {canManage && <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-[#dce7e8] align-top dark:border-white/10">
                        <td className="whitespace-nowrap px-4 py-3 text-[#10141a] dark:text-[#f4f6f7]">{formatCivilDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <p className="text-[#10141a] dark:text-[#f4f6f7]">{entry.description}</p>
                          <p className={`text-xs ${MUTED}`}>{[entry.vendor, entry.department].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="px-4 py-3 text-[#10141a] dark:text-[#f4f6f7]">{categoryLabel(entry.category)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{formatCurrency(entry.amount)}</td>
                        {canManage && (
                          <td className="px-4 py-3">
                            {confirmingDelete === entry.id ? (
                              <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                                <span className={`text-xs ${MUTED}`}>Delete this expense?</span>
                                <button type="button" onClick={() => void remove(entry.id)} disabled={saving} className="cursor-pointer font-medium text-[#b42318] underline underline-offset-2 disabled:opacity-60 dark:text-[#ff9b8f]">{saving ? "Deleting…" : "Yes, delete"}</button>
                                <button type="button" onClick={() => setConfirmingDelete(null)} disabled={saving} className={LINK}>Keep</button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                                <button type="button" onClick={() => { setFormError(""); setDraft(edit(entry)); }} className={LINK} aria-label={`Edit ${entry.description}`}>Edit</button>
                                <button type="button" onClick={() => setConfirmingDelete(entry.id)} className={LINK} aria-label={`Delete ${entry.description}`}>Delete</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#dce7e8] bg-[#f5f9f9] font-semibold dark:border-white/10 dark:bg-white/5">
                      <th scope="row" colSpan={3} className="px-4 py-2.5 text-left text-[#10141a] dark:text-[#f4f6f7]">Total</th>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{formatCurrency(list.total)}</td>
                      {canManage && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {list?.truncated && <p className={`text-xs ${MUTED}`}>Showing the 500 most recent expenses. The total covers all of them. Choose a shorter period to see the rest.</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => onClose(changed)}>Close</Button>
              {canManage && list && <Button onClick={() => { setFormError(""); setDraft(blank()); }}>Add expense</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

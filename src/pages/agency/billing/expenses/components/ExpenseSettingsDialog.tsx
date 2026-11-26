import { useEffect, useId, useState } from "react";
import { Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { agencyField, agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { useToast } from "@/hooks/use-toast";
import {
  useGetExpenseSettingsQuery,
  useUpdateExpenseSettingsMutation,
  type ExpensePerShiftLimit,
} from "@/lib/api/billing-expenses";
import { cn } from "@/lib/utils";

type Row = { key: number; category: string; amount: string };

type ExpenseSettingsDialogProps = {
  open: boolean;
  agencyId: string;
  /** Categories seen on this agency's expenses, offered as suggestions. */
  knownCategories?: string[];
  onClose: () => void;
  noun?: string;
};

const MAX_ROWS = 50;

let rowKey = 0;
const toRow = (limit?: ExpensePerShiftLimit): Row => ({
  key: (rowKey += 1),
  category: limit?.category ?? "",
  amount: limit ? String(limit.amount) : "",
});

/** Rows as the API takes them, or the first problem to show. Blank rows are dropped. */
export function rowsToLimits(rows: { category: string; amount: string }[]): { limits: ExpensePerShiftLimit[] } | { error: string } {
  const seen = new Set<string>();
  const limits: ExpensePerShiftLimit[] = [];
  for (const row of rows) {
    const category = row.category.trim().replace(/\s+/g, " ");
    const amountText = row.amount.trim().replace(/^\$/, "");
    if (!category && !amountText) continue;
    if (!category) return { error: "Each limit needs a category." };
    const amount = Number(amountText);
    if (!amountText || !Number.isFinite(amount) || amount <= 0) return { error: `Enter a limit above $0 for ${category}.` };
    const key = category.toLowerCase();
    if (seen.has(key)) return { error: `${category} is listed twice.` };
    seen.add(key);
    limits.push({ category, amount: Math.round(amount * 100) / 100 });
  }
  return { limits };
}

/** Expense settings: an optional per-shift spending limit for each expense category. */
export default function ExpenseSettingsDialog({ open, agencyId, knownCategories = [], onClose, noun = "DSP" }: ExpenseSettingsDialogProps) {
  const { toast } = useToast();
  const listId = useId();
  const settingsQuery = useGetExpenseSettingsQuery({ agencyId }, { skip: !open || !agencyId });
  const [saveSettings, { isLoading: saving }] = useUpdateExpenseSettingsMutation();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaded = settingsQuery.currentData;

  // Start from the saved limits each time the dialog opens.
  useEffect(() => {
    if (!open) {
      setRows(null);
      setError(null);
      return;
    }
    if (loaded && rows === null) {
      setRows(loaded.perShiftLimits.length ? loaded.perShiftLimits.map(toRow) : [toRow()]);
    }
  }, [open, loaded, rows]);

  const updateRow = (key: number, patch: Partial<Row>) => {
    setRows((current) => current?.map((row) => (row.key === key ? { ...row, ...patch } : row)) ?? current);
    setError(null);
  };

  const save = async () => {
    if (!rows) return;
    const result = rowsToLimits(rows);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    try {
      await saveSettings({ agencyId, perShiftLimits: result.limits }).unwrap();
      toast({ title: "Expense settings saved", description: result.limits.length ? "New expenses are checked against these limits." : "No per-shift limits are set." });
      onClose();
    } catch (saveError) {
      const message = (saveError as { data?: { message?: string } })?.data?.message;
      setError(message || "Couldn't save the settings. Please try again.");
    }
  };

  const loading = open && !rows && !settingsQuery.isError;
  const suggestions = [...new Set(knownCategories.map((category) => category.trim()).filter(Boolean))].sort();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[90dvh] w-[520px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] p-0 dark:bg-[#141b21]">
        <div className="flex items-start gap-3 border-b border-[#eceef0] px-6 pb-4 pt-6 dark:border-white/10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#0b5c5d] dark:border-white/15 dark:text-[#7fd3d3]">
            <Settings2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[18px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Expense settings</DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
              Set the most a {noun} can spend per shift in a category. Expenses over the limit are flagged when you review them; nothing is blocked.
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Close expense settings"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#10141a] transition-colors hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-[#f4f6f7]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-[13px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Per-shift limits</h3>
          {loading ? (
            <div aria-busy="true" className="mt-3 space-y-2">
              {[0, 1].map((index) => <div key={index} className="h-11 animate-pulse rounded-[10px] bg-[#f4f5f6] dark:bg-white/5" />)}
            </div>
          ) : settingsQuery.isError && !rows ? (
            <p role="alert" className="mt-3 text-[13px] text-[#b42318]">Couldn&apos;t load the settings. Close this and try again.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2 text-[12px] font-medium text-[#5b636b] dark:text-[#9aa4a8]" aria-hidden="true">
                <span>Category</span>
                <span>Limit per shift</span>
                <span />
              </div>
              <ul className="mt-1.5 space-y-2">
                {rows?.map((row, index) => (
                  <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_120px_36px] items-center gap-2">
                    <input
                      value={row.category}
                      onChange={(event) => updateRow(row.key, { category: event.target.value })}
                      list={listId}
                      maxLength={60}
                      placeholder="e.g. Activity fee"
                      aria-label={`Category ${index + 1}`}
                      disabled={saving}
                      className={cn(agencyField, "h-11")}
                    />
                    <div className="relative">
                      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6b737a]">$</span>
                      <input
                        value={row.amount}
                        onChange={(event) => updateRow(row.key, { amount: event.target.value })}
                        inputMode="decimal"
                        placeholder="50.00"
                        aria-label={`Limit per shift for category ${index + 1}`}
                        disabled={saving}
                        className={cn(agencyField, "h-11 pl-7 tabular-nums")}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove limit ${index + 1}`}
                      onClick={() => setRows((current) => current?.filter((item) => item.key !== row.key) ?? current)}
                      disabled={saving}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-[8px] text-[#6b737a] transition-colors hover:bg-[#fef3f2] hover:text-[#b42318] focus-visible:outline-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <datalist id={listId}>
                {suggestions.map((category) => <option key={category} value={category} />)}
              </datalist>
              {rows && rows.length < MAX_ROWS ? (
                <button
                  type="button"
                  onClick={() => setRows((current) => [...(current ?? []), toRow()])}
                  disabled={saving}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] px-1 text-[14px] font-medium text-[#007679] hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#7fd3d3]"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add a limit
                </button>
              ) : null}
              <p className="mt-4 text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                Categories match the category the {noun} picks, ignoring capitals. Leave a category out to allow any amount.
              </p>
              {error ? <p role="alert" className="mt-3 text-[13px] text-[#b42318] dark:text-[#ffb4a9]">{error}</p> : null}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-[#eceef0] px-6 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} disabled={saving} className={cn(agencyOutlineButton, "flex-1 justify-center")}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !rows} className={cn(agencyPrimaryButton, "flex-1 justify-center")}>
            {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            Save settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

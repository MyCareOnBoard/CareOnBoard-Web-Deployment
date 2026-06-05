import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CHECKBOX_CLASS,
  BILLING_CORNER_MODAL_SHELL_CLASS,
  BILLING_CORNER_MODAL_TALL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import {
  getPayrollInvoicePreview,
  getPayrollInvoicePreviewErrorMessage,
  type DuePayrollEntry,
  type PayrollInvoicePreview,
  type PayrollInvoicePreviewItem,
  type PayrollInvoicePreviewItemType,
} from "@/lib/api/payroll";
import { cn } from "@/lib/utils";
import { computeSelectedPayrollTotals } from "@/pages/agency/billing/payroll/utils/payrollInvoiceTotals";

type CreatePayrollInvoiceModalProps = {
  open: boolean;
  entry: DuePayrollEntry | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (preview: PayrollInvoicePreview, selectedIds: Set<string>) => void;
};

const SECTION_COPY: Record<
  PayrollInvoicePreviewItemType,
  { title: string; empty: string }
> = {
  shift: {
    title: "Shifts to include",
    empty: "No approved shifts for this pay period.",
  },
  ride: {
    title: "Mileage to include",
    empty: "No approved mileage for this pay period.",
  },
  expense: {
    title: "Expenses to include",
    empty: "No approved expenses for this pay period.",
  },
};

function formatPreviewDate(value: string | null) {
  if (!value) {
    return "—";
  }
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function buildItemMetaLine(item: PayrollInvoicePreviewItem) {
  return [formatPreviewDate(item.date), item.hoursLabel, item.rateLabel, item.amountLabel]
    .filter(Boolean)
    .join(" · ");
}

const PreviewItemRow = memo(function PreviewItemRow({
  item,
  checked,
  onToggle,
}: {
  item: PayrollInvoicePreviewItem;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e5e5e6] bg-white px-4 py-3">
      <Checkbox
        checked={checked}
        onChange={() => onToggle(item.id)}
        className={cn(BILLING_CHECKBOX_CLASS, "mt-0.5 shrink-0")}
        aria-label={`Include ${item.typeLabel.toLowerCase()}: ${item.description}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#10141a]">
          {item.description}
          <span className="ml-2 text-[12px] font-normal text-[#808081]">{item.typeLabel}</span>
        </p>
        <p className="mt-1 text-[13px] text-[#808081]">{buildItemMetaLine(item)}</p>
      </div>
    </label>
  );
});

function PreviewSection({
  type,
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
}: {
  type: PayrollInvoicePreviewItemType;
  items: PayrollInvoicePreviewItem[];
  selectedIds: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleAll: (type: PayrollInvoicePreviewItemType, checked: boolean) => void;
}) {
  const copy = SECTION_COPY[type];
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-3 text-[14px] font-semibold text-[#10141a]">
        {copy.title} ({items.length})
      </p>
      <div className="mb-3 flex min-h-[44px] items-center gap-3">
        <Checkbox
          checked={allSelected}
          onChange={() => onToggleAll(type, !allSelected)}
          className={BILLING_CHECKBOX_CLASS}
          aria-label={`Select all ${copy.title.toLowerCase()}`}
        />
        <span className="text-[14px] font-medium text-[#10141a]">
          Select all ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <PreviewItemRow
            key={item.id}
            item={item}
            checked={selectedIds.has(item.id)}
            onToggle={onToggleItem}
          />
        ))}
      </div>
    </div>
  );
}

export default function CreatePayrollInvoiceModal({
  open,
  entry,
  saving = false,
  onClose,
  onConfirm,
}: CreatePayrollInvoiceModalProps) {
  const [preview, setPreview] = useState<PayrollInvoicePreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadPreview = useCallback(async (signal: AbortSignal) => {
    if (!entry) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const data = await getPayrollInvoicePreview({
        employeeId: entry.employeeId,
        periodStart: entry.dateRangeStart,
        periodEnd: entry.dateRangeEnd,
      });

      if (signal.aborted) {
        return;
      }

      setPreview(data);
      setSelectedIds(new Set(data.items.map((item) => item.id)));
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      setPreview(null);
      setSelectedIds(new Set());
      setLoadError(getPayrollInvoicePreviewErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [entry]);

  useEffect(() => {
    if (!open || !entry) {
      setPreview(null);
      setSelectedIds(new Set());
      setLoadError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadPreview(controller.signal);

    return () => {
      controller.abort();
    };
  }, [open, entry, reloadToken, loadPreview]);

  const itemsByType = useMemo(() => {
    const groups: Record<PayrollInvoicePreviewItemType, PayrollInvoicePreviewItem[]> = {
      shift: [],
      ride: [],
      expense: [],
    };

    for (const item of preview?.items ?? []) {
      groups[item.type].push(item);
    }

    return groups;
  }, [preview?.items]);

  const selectedTotals = useMemo(() => {
    if (!preview?.items.length) {
      return {
        grossAmount: 0,
        totalHours: 0,
        selectedCount: 0,
        totalCount: 0,
      };
    }

    return computeSelectedPayrollTotals(
      preview.items,
      selectedIds,
      preview.mileageRate,
    );
  }, [preview?.items, preview?.mileageRate, selectedIds]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback(
    (type: PayrollInvoicePreviewItemType, checked: boolean) => {
      const sectionItems = itemsByType[type];
      setSelectedIds((previous) => {
        const next = new Set(previous);
        for (const item of sectionItems) {
          if (checked) {
            next.add(item.id);
          } else {
            next.delete(item.id);
          }
        }
        return next;
      });
    },
    [itemsByType],
  );

  const canConfirm =
    Boolean(preview) &&
    selectedTotals.selectedCount > 0 &&
    !loading &&
    !saving &&
    !loadError;

  const handleConfirm = () => {
    if (!preview || !canConfirm) {
      return;
    }
    onConfirm(preview, selectedIds);
  };

  const staffName = preview?.employeeName ?? entry?.staffName ?? "Staff member";
  const paymentDetails = preview?.paymentDetails ?? entry?.paymentDetails ?? "Payment method not set";
  const dateRangeLabel =
    preview?.dateRangeLabel ??
    (entry ? `${entry.dateRangeStart} – ${entry.dateRangeEnd}` : "");

  const hasItems = (preview?.items.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`${BILLING_CORNER_MODAL_TALL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}
      >
        <BillingCornerModalHeader
          title="Create payroll invoice"
          description={`Review approved shifts, mileage, and expenses for ${staffName}. Uncheck anything you want to leave out.`}
          onClose={onClose}
          closeDisabled={saving}
        />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pt-6">
          <div className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-[#808081]">Staff member</p>
                <p className="text-[14px] font-medium text-[#10141a]">{staffName}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#808081]">Pay period</p>
                <p className="text-[14px] font-medium text-[#10141a]">{dateRangeLabel}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#808081]">Payment method</p>
                <p className="text-[14px] font-medium text-[#10141a]">{paymentDetails}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#808081]">Gross pay</p>
                <p className="text-[14px] font-semibold tabular-nums text-[#10141a]">
                  {formatCurrency(selectedTotals.grossAmount)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-[#808081]">
              {selectedTotals.selectedCount} of {selectedTotals.totalCount} items selected
              {selectedTotals.totalHours > 0
                ? ` · ${selectedTotals.totalHours} hrs`
                : null}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-[14px] text-[#808081]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payroll items…
            </div>
          ) : loadError ? (
            <div className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6">
              <p className="text-[14px] text-[#10141a]">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadToken((value) => value + 1)}
                className={cn(
                  BILLING_SECONDARY_BUTTON_CLASS,
                  "mt-4 h-[44px] min-h-[44px] rounded-[10px] px-5 text-[14px]",
                )}
              >
                Retry
              </button>
            </div>
          ) : !hasItems ? (
            <p className="rounded-[12px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-6 text-[14px] text-[#808081]">
              Nothing to invoice for this pay period. Approve shifts, mileage, or expenses first.
            </p>
          ) : (
            <div className="space-y-6">
              <PreviewSection
                type="shift"
                items={itemsByType.shift}
                selectedIds={selectedIds}
                onToggleItem={toggleItem}
                onToggleAll={toggleSection}
              />
              <PreviewSection
                type="ride"
                items={itemsByType.ride}
                selectedIds={selectedIds}
                onToggleItem={toggleItem}
                onToggleAll={toggleSection}
              />
              <PreviewSection
                type="expense"
                items={itemsByType.expense}
                selectedIds={selectedIds}
                onToggleItem={toggleItem}
                onToggleAll={toggleSection}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 px-6 pb-8 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={cn(BILLING_SECONDARY_BUTTON_CLASS, "w-full sm:w-auto")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(BILLING_PRIMARY_BUTTON_CLASS, "w-full sm:w-auto")}
            aria-label={
              canConfirm ? undefined : "Select at least one item to create an invoice."
            }
          >
            {saving ? "Creating invoice…" : "Create invoice"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

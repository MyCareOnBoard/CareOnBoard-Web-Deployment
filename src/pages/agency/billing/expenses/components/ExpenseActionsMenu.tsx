import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon } from "@/components/ui/dot-grid-menu";
import { cn } from "@/lib/utils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";

const menuItemBaseClassName =
  "flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-none px-4 py-3 text-[14px] font-medium";

const neutralMenuItemClassName = `${menuItemBaseClassName} text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]`;

const approveMenuItemClassName =
  `${menuItemBaseClassName} text-[#0EAF52] hover:bg-[#ecfdf3] focus:bg-[#ecfdf3] focus:text-[#0EAF52]`;

const declineMenuItemClassName =
  `${menuItemBaseClassName} text-[#FF6900] hover:bg-[#fff7ed] focus:bg-[#fff7ed] focus:text-[#FF6900]`;

const deleteMenuItemClassName =
  `${menuItemBaseClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`;


type ExpenseActionsMenuProps = {
  expense: AgencyExpenseListItem;
  variant?: "mobile" | "desktop";
  disabled?: boolean;
  onViewReceipt?: (expense: AgencyExpenseListItem) => void;
  onApprove?: (expense: AgencyExpenseListItem) => void;
  onDecline?: (expense: AgencyExpenseListItem) => void;
  onDelete?: (expense: AgencyExpenseListItem) => void;
};

export default function ExpenseActionsMenu({
  expense,
  variant = "desktop",
  disabled = false,
  onViewReceipt,
  onApprove,
  onDecline,
  onDelete,
}: ExpenseActionsMenuProps) {
  const isMobile = variant === "mobile";
  const isPending = expense.status === "pending";
  const hasReceipt = Boolean(expense.receiptUrl);
  const hasAnyAction =
    (hasReceipt && onViewReceipt) ||
    (isPending && onApprove) ||
    (isPending && onDecline) ||
    (isPending && onDelete);

  if (!hasAnyAction) {
    return <span className="text-[13px] text-[#808081]">—</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${expense.employeeName}`}
          disabled={disabled}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-md bg-[#eef4f5] transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6] disabled:cursor-not-allowed disabled:opacity-50",
            isMobile ? "h-11 w-11" : "h-8 w-8",
          )}
        >
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={isMobile ? 4 : 8}
        collisionPadding={16}
        className="z-[100] w-[220px] rounded-xl border border-[#e5e5e6] bg-white p-0 shadow-lg"
      >
        {hasReceipt && onViewReceipt ? (
          <DropdownMenuItem
            className={neutralMenuItemClassName}
            onSelect={() => onViewReceipt(expense)}
          >
            View receipt
            <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
          </DropdownMenuItem>
        ) : null}
        {isPending && onApprove ? (
          <DropdownMenuItem
            className={approveMenuItemClassName}
            disabled={disabled}
            onSelect={() => onApprove(expense)}
          >
            Approve
            <ChevronRight className="ml-auto h-4 w-4 text-[#0EAF52]/70" />
          </DropdownMenuItem>
        ) : null}
        {isPending && onDecline ? (
          <DropdownMenuItem
            className={declineMenuItemClassName}
            disabled={disabled}
            onSelect={() => onDecline(expense)}
          >
            Decline
            <ChevronRight className="ml-auto h-4 w-4 text-[#FF6900]/70" />
          </DropdownMenuItem>
        ) : null}
        {isPending && onDelete ? (
          <DropdownMenuItem
            className={deleteMenuItemClassName}
            disabled={disabled}
            onSelect={() => onDelete(expense)}
          >
            Delete expense
            <ChevronRight className="ml-auto h-4 w-4 text-[#ef4444]/70" />
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

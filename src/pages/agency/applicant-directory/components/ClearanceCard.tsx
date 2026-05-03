import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClearanceToggleItem } from "./ClearanceToggleItem";
import type { PendingApproval } from "../useClearanceApprovals";

interface ClearanceCardProps {
  title?: string;
  subtitle?: string;
  pendingApprovals: PendingApproval[];
  clearancePage: number;
  isLoading: boolean;
  actionLoadingId: string | null;
  onNextPage: () => void;
  onPrevPage: () => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onViewFullList: () => void;
}

export function ClearanceCard({
  title = "Clearance & Hiring Toggle",
  subtitle = "These are your Pending Hiring Approvals",
  pendingApprovals,
  clearancePage,
  isLoading,
  actionLoadingId,
  onNextPage,
  onPrevPage,
  onApprove,
  onCancel,
  onViewFullList,
}: ClearanceCardProps) {
  const pageSize = 6;
  const visibleApprovals = pendingApprovals.slice(0, pageSize);

  return (
    <div className="relative overflow-hidden rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-semibold text-[#10141a] mb-1">
              {title}
            </h2>
            <p className="text-[13px] text-gray-600">{subtitle}</p>
          </div>
          <button
            className="p-2 text-gray-400 transition-colors rounded-b-full shadow-md cursor-pointer hover:text-gray-600"
            onClick={onViewFullList}
            aria-label="View full clearance and hiring list"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Clearance Items */}
        <div className="mb-4 space-y-3">
          {isLoading && visibleApprovals.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 max-w-[300px] space-y-2">
                    <div className="h-4 w-40 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3 ml-6">
                    <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
              <p className="text-sm font-medium mb-1">
                No pending hiring approvals
              </p>
              <p className="text-xs max-w-xs">
                You&apos;ll see applicants who are ready for clearance review
                here.
              </p>
            </div>
          ) : (
            visibleApprovals.map((approval) => (
              <ClearanceToggleItem
                key={approval.id}
                name={approval.name}
                progress={approval.progress}
                onApprove={() => onApprove(approval.id)}
                onCancel={() => onCancel(approval.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-600">
            {clearancePage}/{Math.max(1, Math.ceil(pendingApprovals.length / pageSize))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
            onClick={onPrevPage}
            disabled={clearancePage === 1 || isLoading}
            aria-label="Previous clearance page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
            onClick={onNextPage}
            disabled={isLoading || visibleApprovals.length < pageSize}
            aria-label="Next clearance page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


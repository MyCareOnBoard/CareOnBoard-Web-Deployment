import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BillingMonitorHistoryItem } from "@/pages/super-admin/agency-billing-monitor/api";
import { normalizePlanLabel } from "@/pages/super-admin/agency-billing-monitor/utils/billingPlan";
import { formatShortDate } from "@/pages/super-admin/agency-billing-monitor/utils/dateFormat";

type Props = {
	items: BillingMonitorHistoryItem[];
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
	page: number;
	totalPages: number;
	onPrevPage: () => void;
	onNextPage: () => void;
};

export function HistoryList({
	items,
	isLoading,
	isFetching,
	error,
	page,
	totalPages,
	onPrevPage,
	onNextPage,
}: Props) {
	if (isLoading) {
		return <div className="py-20 text-center text-[#808081]">Loading…</div>;
	}
	if (error) {
		return (
			<div className="py-20 text-center text-[#d53411]">Failed to load history.</div>
		);
	}
	if (items.length === 0) {
		return <div className="py-20 text-center text-[#808081]">No history found.</div>;
	}

	return (
		<div className="space-y-4">
			{items.map((h) => (
				<div
					key={h.id}
					className="flex items-center justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] p-4"
				>
					<div className="flex items-center gap-4">
						<div className="w-[52px] h-[60px] rounded-[10px] bg-[#b9ff63] flex items-center justify-center text-black font-semibold">
							{h.agencyName.charAt(0).toUpperCase()}
						</div>
						<p className="text-[16px] font-semibold text-[#10141a]">
							{h.agencyName}
						</p>
					</div>

					<div className="flex-1 grid grid-cols-3 gap-2 items-center max-w-[650px]">
						<div>
							<p className="text-[12px] font-medium text-[#808081]">Before</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								{normalizePlanLabel(h.before)}
							</p>
						</div>
						<div>
							<p className="text-[12px] font-medium text-[#808081]">After</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								{normalizePlanLabel(h.after)}
							</p>
						</div>
						<div className="text-right">
							<p className="text-[12px] font-medium text-[#808081]">Activity</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								{formatShortDate(
									new Date(
										h.activityDate ??
											h.createdAt ??
											new Date().toISOString()
									)
								)}
							</p>
						</div>
					</div>
				</div>
			))}

			<div className="pt-4 flex items-center justify-center gap-3 text-[#808081]">
				<button
					type="button"
					className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
					aria-label="Previous page"
					onClick={onPrevPage}
					disabled={page <= 1}
				>
					<ArrowLeft className="h-4 w-4" />
				</button>
				<span className="text-[12px] font-medium">
					{page}/{totalPages}
					{isFetching ? " (updating…)" : ""}
				</span>
				<button
					type="button"
					className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
					aria-label="Next page"
					onClick={onNextPage}
					disabled={page >= totalPages}
				>
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

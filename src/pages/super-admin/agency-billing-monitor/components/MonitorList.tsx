import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BillingMonitorAgency } from "@/pages/super-admin/agency-billing-monitor/api";
import type { BillingOverride } from "@/pages/super-admin/agency-billing-monitor/types";
import { normalizePlanLabel } from "@/pages/super-admin/agency-billing-monitor/utils/billingPlan";
import { formatMonthYear } from "@/pages/super-admin/agency-billing-monitor/utils/dateFormat";
import { ClientCount, DspCount } from "@/pages/super-admin/agency-billing-monitor/components/AgencyCounts";

type Props = {
	items: BillingMonitorAgency[];
	billingOverrides: Record<string, BillingOverride>;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
	page: number;
	totalPages: number;
	onPrevPage: () => void;
	onNextPage: () => void;
	onEdit: (agencyId: string) => void;
	onRemove: (agencyId: string) => void;
};

export function MonitorList({
	items,
	billingOverrides,
	isLoading,
	isFetching,
	error,
	page,
	totalPages,
	onPrevPage,
	onNextPage,
	onEdit,
	onRemove,
}: Props) {
	if (isLoading) {
		return <div className="py-20 text-center text-[#808081]">Loading…</div>;
	}
	if (error) {
		return (
			<div className="py-20 text-center text-[#d53411]">
				Failed to load agencies.
			</div>
		);
	}
	if (items.length === 0) {
		return <div className="py-20 text-center text-[#808081]">No agencies found.</div>;
	}

	return (
		<div className="space-y-4">
			{items.map((b) => (
				<div
					key={b.agencyId}
					className="flex flex-col gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] p-4 md:grid md:grid-cols-12 md:items-center"
				>
					<div className="flex items-center gap-4 min-w-0 md:col-span-5">
						<div className="w-[52px] h-[60px] rounded-[10px] bg-[#b9ff63] flex items-center justify-center text-black font-semibold">
							{b.agencyName.charAt(0).toUpperCase()}
						</div>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-3 min-w-0">
								<p className="text-[16px] font-semibold text-[#10141a] wrap-break-word max-w-full leading-5">
									{b.agencyName}
								</p>
								<span className="px-3 h-7 inline-flex items-center rounded-[60px] text-[12px] font-semibold bg-[#e6f7f7] text-[#00a3a7]">
									{normalizePlanLabel(b.plan)}
								</span>
							</div>
						</div>
					</div>

					<div className="hidden md:grid md:col-span-4 grid-cols-3 items-center justify-items-center">
						<div className="text-center">
							<p className="text-[12px] font-medium text-[#808081]">DSP</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								<DspCount agencyId={b.agencyId} />
							</p>
						</div>
						<div className="text-center">
							<p className="text-[12px] font-medium text-[#808081]">Clients</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								<ClientCount agencyId={b.agencyId} />
							</p>
						</div>
						<div className="text-center">
							<p className="text-[12px] font-medium text-[#808081]">Expiry Date</p>
							<p className="text-[14px] font-semibold text-[#10141a]">
								{(() => {
									const override = billingOverrides[b.agencyId];
									const effectiveEnd =
										override?.subscriptionEnd ?? b.subscriptionEnd ?? b.expiryDate;
									return effectiveEnd
										? formatMonthYear(new Date(effectiveEnd))
										: "—";
								})()}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 md:col-span-3 md:justify-end">
						<Button
							variant="outline"
							className="border-[#ff4d4d] text-[#ff4d4d] hover:bg-[#ff4d4d]/10"
							onClick={() => onRemove(b.agencyId)}
						>
							Remove Plan
						</Button>
						<Button
							variant="outline"
							className="border-white/30 bg-white/40 hover:bg-white/60 text-[#10141a]"
							onClick={() => onEdit(b.agencyId)}
						>
							Edit Billing
						</Button>
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

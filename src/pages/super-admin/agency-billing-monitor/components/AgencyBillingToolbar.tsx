import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { History, Search } from "lucide-react";
import { PLAN_OPTIONS } from "@/pages/super-admin/agency-billing-monitor/utils/billingPlan";
import type { BillingStatusTab } from "@/pages/super-admin/agency-billing-monitor/types";

type Props = {
	view: "monitor" | "history";
	search: string;
	onSearchChange: (value: string) => void;
	planFilter: string;
	onPlanFilterChange: (value: string) => void;
	statusTab: BillingStatusTab;
	onStatusTabChange: (value: BillingStatusTab) => void;
	onAddPlan: () => void;
};


export function AgencyBillingPageHeader({
	view,
	onToggleView,
}: {
	view: "monitor" | "history";
	onToggleView: () => void;
}) {
	return (
		<div className="mb-8 flex items-center justify-between">
			<h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
				Agency Billing Monitor
			</h1>
			<Button
				variant="ghost"
				className="rounded-[60px] bg-white/40 border border-white/30 hover:bg-white/60 text-[#10141a]"
				onClick={onToggleView}
			>
				<History className="h-5 w-5 text-[#808081]" />
				{view === "monitor" ? "Billing History" : "Back to Monitor"}
			</Button>
		</div>
	);
}

export function AgencyBillingToolbar({
	view,
	search,
	onSearchChange,
	planFilter,
	onPlanFilterChange,
	statusTab,
	onStatusTabChange,
	onAddPlan,
}: Props) {
	return (
		<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
						{view === "monitor" ? "Agency Billing Monitor" : "Billing History"}
					</h2>
					<p className="text-[14px] font-medium text-[#808081]">
						{view === "monitor"
							? "List of plans across Agencies"
							: "These are your billing history"}
					</p>
				</div>

				<div className="flex items-center gap-3">
					<div className="relative w-[280px]">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b2b2b3]" />
						<Input
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Search"
							className="pl-10 bg-white/60 border-white/30"
						/>
					</div>

					<Select value={planFilter} onValueChange={onPlanFilterChange}>
						<SelectTrigger className="h-11 w-[180px] rounded-xl border border-white/30 bg-white/60 px-4">
							<SelectValue placeholder="All plans" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All plans</SelectItem>
							{PLAN_OPTIONS.map((p) => (
								<SelectItem key={p.value} value={p.value}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{view === "monitor" ? (
						<div className="flex items-center gap-2 bg-white/40 border border-white/30 rounded-[60px] p-1">
							<button
								type="button"
								onClick={() => onStatusTabChange("active")}
								className={`px-5 h-9 rounded-[60px] text-[14px] font-semibold transition-all ${
									statusTab === "active"
										? "bg-[#00b4b8] text-white"
										: "text-[#808081] hover:bg-white/50"
								}`}
							>
								Active
							</button>
							<button
								type="button"
								onClick={() => onStatusTabChange("inactive")}
								className={`px-5 h-9 rounded-[60px] text-[14px] font-semibold transition-all ${
									statusTab === "inactive"
										? "bg-[#00b4b8] text-white"
										: "text-[#808081] hover:bg-white/50"
								}`}
							>
								Inactive
							</button>
						</div>
					) : null}

					{view === "monitor" ? (
						<Button
							onClick={onAddPlan}
							className="bg-[#00b5b8] hover:bg-[#00a7aa] active:bg-[#00979a]"
						>
							Add Plan
						</Button>
					) : null}
				</div>
		</div>
	);
}

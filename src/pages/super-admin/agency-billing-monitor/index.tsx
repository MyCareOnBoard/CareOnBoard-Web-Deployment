import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/datePicker";
import { Switch } from "@/components/ui/switch";
import {
	SuccessDialog,
	SuccessDialogContent,
} from "@/components/ui/success-dialog";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import {
	ArrowLeft,
	ArrowRight,
	History,
	Search,
} from "lucide-react";
import {
	useGetBillingMonitorAgenciesQuery,
	useGetBillingMonitorHistoryQuery,
	useUpsertAgencyBillingPlanMutation,
	type BillingPlanCode,
	type BillingMonitorAgency,
} from "@/pages/super-admin/agency-billing-monitor/api";

type BillingStatus = "active" | "inactive";

type PlanName = "Basic Plan" | "Pro Plan" | "Enterprise";

const PLAN_OPTIONS: { label: PlanName; value: BillingPlanCode }[] = [
	{ label: "Basic Plan", value: "basic" },
	{ label: "Pro Plan", value: "pro" },
	{ label: "Enterprise", value: "enterprise" },
];

function normalizePlanLabel(plan?: string): PlanName {
	const p = (plan || "").toLowerCase();
	if (p === "enterprise") return "Enterprise";
	if (p === "pro") return "Pro Plan";
	return "Basic Plan";
}

function planCodeFromLabel(label: PlanName): BillingPlanCode {
	if (label === "Enterprise") return "enterprise";
	if (label === "Pro Plan") return "pro";
	return "basic";
}

function formatShortDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function formatMonthYear(date: Date) {
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

function isActive(subEnd: Date) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const end = new Date(subEnd);
	end.setHours(0, 0, 0, 0);
	return end >= today;
}

export default function AgencyBillingMonitorPage() {
	const [view, setView] = useState<"monitor" | "history">("monitor");
	const [search, setSearch] = useState("");
	const [statusTab, setStatusTab] = useState<BillingStatus>("active");

	const [planFilter, setPlanFilter] = useState<string>("all");
	const [sortBy] = useState<string>("updatedAt");
	const [sortOrder] = useState<"asc" | "desc">("desc");
	const [monitorPage, setMonitorPage] = useState(1);
	const [historyPage, setHistoryPage] = useState(1);
	const limit = 10;

	const {
		data: agenciesResponse,
		isLoading: agenciesLoading,
		isFetching: agenciesFetching,
		error: agenciesError,
	} = useGetBillingMonitorAgenciesQuery({
		page: monitorPage,
		limit,
		search: view === "monitor" ? search : undefined,
		plan: planFilter === "all" ? undefined : planFilter,
		sortBy,
		sortOrder,
	});

	const {
		data: historyResponse,
		isLoading: historyLoading,
		isFetching: historyFetching,
		error: historyError,
	} = useGetBillingMonitorHistoryQuery({
		page: historyPage,
		limit,
		search: view === "history" ? search : undefined,
		plan: planFilter === "all" ? undefined : planFilter,
		sortBy,
		sortOrder,
	});

	const agencies: BillingMonitorAgency[] = agenciesResponse?.data ?? [];
	const agenciesPagination = agenciesResponse?.pagination;
	const historyItems = historyResponse?.data ?? [];
	const historyPagination = historyResponse?.pagination;

	const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
	const [editingBillingId, setEditingBillingId] = useState<string | null>(null);
	const [isSuccessOpen, setIsSuccessOpen] = useState(false);

	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const editingBilling = useMemo(() => {
		if (!editingBillingId) return null;
		return agencies.find((b) => b.agencyId === editingBillingId) ?? null;
	}, [agencies, editingBillingId]);

	const [formAgencyId, setFormAgencyId] = useState<string>("");
	const [formPlan, setFormPlan] = useState<PlanName | "">("");
	const [formStart, setFormStart] = useState<Date | null>(null);
	const [formEnds, setFormEnds] = useState<Date | null>(null);
	const [formNotify, setFormNotify] = useState(true);

	const [upsertBillingPlan, { isLoading: isSavingBilling }] =
		useUpsertAgencyBillingPlanMutation();

	const openAdd = () => {
		setEditingBillingId(null);
		setFormAgencyId("");
		setFormPlan("");
		setFormStart(null);
		setFormEnds(null);
		setFormNotify(true);
		setIsBillingDialogOpen(true);
	};

	const openEdit = (id: string) => {
		const target = agencies.find((b) => b.agencyId === id);
		if (!target) return;

		setEditingBillingId(id);
		setFormAgencyId(target.agencyId);
		setFormPlan(normalizePlanLabel(target.plan));
		setFormStart(target.subscriptionStart ? new Date(target.subscriptionStart) : null);
		setFormEnds(target.subscriptionEnd ? new Date(target.subscriptionEnd) : null);
		setFormNotify(Boolean(target.sendNotification));
		setIsBillingDialogOpen(true);
	};

	const openDelete = (id: string) => {
		setDeleteTargetId(id);
		setIsDeleteOpen(true);
	};

	const filteredBillings = useMemo(() => {
		return agencies.filter((b) => {
			const end = b.subscriptionEnd ? new Date(b.subscriptionEnd) : null;
			const active = end ? isActive(end) : true;
			return statusTab === "active" ? active : !active;
		});
	}, [agencies, statusTab]);

	const handleSaveBilling = async () => {
		if (!formAgencyId || !formPlan || !formStart || !formEnds) {
			return;
		}

		await upsertBillingPlan({
			agencyId: formAgencyId,
			data: {
				plan: planCodeFromLabel(formPlan as PlanName),
				subscriptionStart: formStart.toISOString(),
				subscriptionEnd: formEnds.toISOString(),
				sendNotification: formNotify,
			},
		}).unwrap();

		setIsBillingDialogOpen(false);
		setIsSuccessOpen(true);
	};

	const handleConfirmDelete = () => {
		// Backend delete endpoint not provided; keep UI confirmation only for now.
		setIsDeleteOpen(false);
		setDeleteTargetId(null);
	};

	return (
		<div className="min-h-[calc(100vh-200px)]">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
					Agency Billing Monitor
				</h1>
				<Button
					variant="ghost"
					className="rounded-[60px] bg-white/40 border border-white/30 hover:bg-white/60 text-[#10141a]"
					onClick={() => setView((v) => (v === "monitor" ? "history" : "monitor"))}
				>
					<History className="h-5 w-5 text-[#808081]" />
					{view === "monitor" ? "Billing History" : "Back to Monitor"}
				</Button>
			</div>

			<div className="backdrop-blur-[20px] bg-white/30 border border-white/30 rounded-[30px] p-6 min-h-[600px]">
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
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search"
								className="pl-10 bg-white/60 border-white/30"
							/>
						</div>

						<Select value={planFilter} onValueChange={setPlanFilter}>
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
									onClick={() => setStatusTab("active")}
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
									onClick={() => setStatusTab("inactive")}
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
								onClick={openAdd}
								className="bg-[#00b5b8] hover:bg-[#00a7aa] active:bg-[#00979a]"
							>
								Add Plan
							</Button>
						) : null}
					</div>
				</div>

				{view === "monitor" ? (
					<div className="space-y-4">
						{agenciesLoading ? (
							<div className="py-20 text-center text-[#808081]">Loading…</div>
						) : agenciesError ? (
							<div className="py-20 text-center text-[#d53411]">
								Failed to load agencies.
							</div>
						) : filteredBillings.length === 0 ? (
							<div className="py-20 text-center text-[#808081]">
								No agencies found.
							</div>
						) : (
							filteredBillings.map((b) => (
								<div
									key={b.agencyId}
									className="flex items-center justify-between gap-4 backdrop-blur-[20px] bg-white/50 rounded-[20px] p-4"
								>
									<div className="flex items-center gap-4">
										<div className="w-[52px] h-[60px] rounded-[10px] bg-[#b9ff63] flex items-center justify-center text-black font-semibold">
											{b.agencyName.charAt(0).toUpperCase()}
										</div>
										<div>
											<div className="flex items-center gap-3">
												<p className="text-[16px] font-semibold text-[#10141a]">
													{b.agencyName}
												</p>
												<span className="px-3 h-7 inline-flex items-center rounded-[60px] text-[12px] font-semibold bg-[#e6f7f7] text-[#00a3a7]">
													{normalizePlanLabel(b.plan)}
												</span>
											</div>
										</div>
									</div>

									<div className="hidden md:flex items-center gap-12">
										<div className="text-center">
											<p className="text-[12px] font-medium text-[#808081]">
												DSP
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
												{b.dspCount ?? 0}
											</p>
										</div>
										<div className="text-center">
											<p className="text-[12px] font-medium text-[#808081]">
												Clients
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
												{b.clientsCount ?? 0}
											</p>
										</div>
										<div className="text-center">
											<p className="text-[12px] font-medium text-[#808081]">
												Expiry Date
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
												{b.subscriptionEnd ? formatMonthYear(new Date(b.subscriptionEnd)) : "—"}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											className="border-[#ff4d4d] text-[#ff4d4d] hover:bg-[#ff4d4d]/10"
											onClick={() => openDelete(b.agencyId)}
										>
											Remove Plan
										</Button>
										<Button
											variant="outline"
											className="border-white/30 bg-white/40 hover:bg-white/60 text-[#10141a]"
											onClick={() => openEdit(b.agencyId)}
										>
											Edit Billing
										</Button>
									</div>
								</div>
							))
						)}

						<div className="pt-4 flex items-center justify-center gap-3 text-[#808081]">
							<button
								type="button"
								className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
								aria-label="Previous page"
								onClick={() => setMonitorPage((p) => Math.max(1, p - 1))}
								disabled={(agenciesPagination?.page ?? 1) <= 1}
							>
								<ArrowLeft className="h-4 w-4" />
							</button>
							<span className="text-[12px] font-medium">
								{(agenciesPagination?.page ?? monitorPage)}/
								{(agenciesPagination?.totalPages ?? 1)}
								{agenciesFetching ? " (updating…)" : ""}
							</span>
							<button
								type="button"
								className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
								aria-label="Next page"
								onClick={() =>
									setMonitorPage((p) =>
										Math.min(agenciesPagination?.totalPages ?? 1, p + 1)
									)
								}
								disabled={(agenciesPagination?.page ?? monitorPage) >= (agenciesPagination?.totalPages ?? 1)}
							>
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{historyLoading ? (
							<div className="py-20 text-center text-[#808081]">Loading…</div>
						) : historyError ? (
							<div className="py-20 text-center text-[#d53411]">
								Failed to load history.
							</div>
						) : historyItems.length === 0 ? (
							<div className="py-20 text-center text-[#808081]">
								No history found.
							</div>
						) : (
							historyItems.map((h) => (
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
													new Date(h.activityDate ?? h.createdAt ?? new Date().toISOString())
												)}
											</p>
										</div>
									</div>
								</div>
							))
						)}

						<div className="pt-4 flex items-center justify-center gap-3 text-[#808081]">
							<button
								type="button"
								className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
								aria-label="Previous page"
								onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
								disabled={(historyPagination?.page ?? 1) <= 1}
							>
								<ArrowLeft className="h-4 w-4" />
							</button>
							<span className="text-[12px] font-medium">
								{(historyPagination?.page ?? historyPage)}/
								{(historyPagination?.totalPages ?? 1)}
								{historyFetching ? " (updating…)" : ""}
							</span>
							<button
								type="button"
								className="h-10 w-10 rounded-full bg-white/40 border border-white/30 grid place-items-center hover:bg-white/60"
								aria-label="Next page"
								onClick={() =>
									setHistoryPage((p) =>
										Math.min(historyPagination?.totalPages ?? 1, p + 1)
									)
								}
								disabled={(historyPagination?.page ?? historyPage) >= (historyPagination?.totalPages ?? 1)}
							>
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>

			<Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
				<DialogContent
					showCloseButton={false}
					className="top-0 right-0 left-auto h-screen w-[520px] max-w-[92vw] translate-x-0 translate-y-0 rounded-l-[30px] rounded-r-none p-0 overflow-hidden"
				>
					<div className="h-full flex flex-col">
						<div className="px-6 pt-6 pb-4 border-b border-[#e5e5e6]">
							<div className="flex items-center justify-between">
								<DialogTitle className="text-[20px] font-semibold text-[#10141a]">
									{editingBillingId ? "Edit billing" : "Add new billing"}
								</DialogTitle>
								<button
									type="button"
									onClick={() => setIsBillingDialogOpen(false)}
									className="h-10 w-10 rounded-full grid place-items-center hover:bg-black/5"
									aria-label="Close"
								>
									<span className="text-[#808081] text-[18px]">×</span>
								</button>
							</div>
						</div>

						<div className="flex-1 overflow-auto px-6 py-6">
							<div className="space-y-5">
								<div>
									<p className="text-[12px] font-medium text-[#808081] mb-2">Agency</p>
									<Select
										value={formAgencyId}
										onValueChange={setFormAgencyId}
										disabled={Boolean(editingBillingId)}
									>
										<SelectTrigger className="h-11 rounded-xl border border-[#cccccd] bg-white px-4">
											<SelectValue placeholder="Select agency" />
										</SelectTrigger>
										<SelectContent>
											{(agenciesResponse?.data ?? []).map((a) => (
												<SelectItem key={a.agencyId} value={a.agencyId}>
													{a.agencyName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<p className="text-[12px] font-medium text-[#808081] mb-2">Plan</p>
									<Select
										value={formPlan}
										onValueChange={(v) => setFormPlan(v as PlanName)}
									>
										<SelectTrigger className="h-11 rounded-xl border border-[#cccccd] bg-white px-4">
											<SelectValue placeholder="Select Plan" />
										</SelectTrigger>
										<SelectContent>
											{PLAN_OPTIONS.map((p) => (
												<SelectItem key={p.label} value={p.label}>
													{p.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<p className="text-[12px] font-medium text-[#808081] mb-2">Subscription Start</p>
									<CustomDatePicker
										date={formStart}
										setDate={setFormStart}
										placeholder="Select date"
										className=""
									/>
								</div>

								<div>
									<p className="text-[12px] font-medium text-[#808081] mb-2">Subscription Ends</p>
									<CustomDatePicker
										date={formEnds}
										setDate={setFormEnds}
										placeholder="Select date"
										className=""
									/>
								</div>

								<div className="flex items-center justify-between pt-2">
									<div>
										<p className="text-[14px] font-medium text-[#10141a]">Send notification about plan</p>
										<p className="text-[12px] font-medium text-[#808081]">Optional</p>
									</div>
									<Switch
										checked={formNotify}
										onCheckedChange={(v) => setFormNotify(Boolean(v))}
									/>
								</div>
							</div>
						</div>

						<div className="px-6 py-5 border-t border-[#e5e5e6]">
							<div className="flex items-center justify-between gap-3">
								<Button
									variant="outline"
									className="w-[140px] border-[#cccccd]"
									onClick={() => setIsBillingDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={handleSaveBilling}
									className="w-[180px] bg-[#00b5b8] hover:bg-[#00a7aa] active:bg-[#00979a]"
									disabled={isSavingBilling}
								>
									{isSavingBilling ? "Saving…" : "Add Plan"}
								</Button>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<SuccessDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
				<SuccessDialogContent
					title="Billing added"
					description="New agency billing has been added successfully"
					buttonText="Okay"
					onButtonClick={() => setIsSuccessOpen(false)}
				/>
			</SuccessDialog>

			<DeleteConfirmationModal
				isOpen={isDeleteOpen}
				onClose={() => setIsDeleteOpen(false)}
				onConfirm={handleConfirmDelete}
				title="Remove plan?"
				message="Are you sure you want to remove this agency plan?"
				confirmText="Remove"
				cancelText="Cancel"
			/>
		</div>
	);
}

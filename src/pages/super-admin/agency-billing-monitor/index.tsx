import React, { useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import {
	useGetBillingMonitorAgenciesQuery,
	useGetBillingMonitorHistoryQuery,
	useUpsertAgencyBillingPlanMutation,
	useGetAgencyDspCountQuery,
	useGetAgencyClientCountQuery,
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

function DspCount({ agencyId }: { agencyId: string }) {
	const { data, isLoading, isFetching, error } = useGetAgencyDspCountQuery(
		{ agencyId },
		{ refetchOnMountOrArgChange: true }
	);

	if (isLoading || isFetching) return <span>…</span>;
	if (error) return <span>—</span>;
	return <span>{data ?? 0}</span>;
}

function ClientCount({ agencyId }: { agencyId: string }) {
	const { data, isLoading, isFetching, error } = useGetAgencyClientCountQuery(
		{ agencyId },
		{ refetchOnMountOrArgChange: true }
	);

	if (isLoading || isFetching) return <span>…</span>;
	if (error) return <span>—</span>;
	return <span>{data ?? 0}</span>;
}

type BillingOverride = {
	plan?: BillingPlanCode;
	subscriptionStart?: string;
	subscriptionEnd?: string;
};

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
		refetch: refetchAgencies,
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

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		if (!agenciesResponse) return;

		const sample = agenciesResponse.data?.[0];
		const missingExpiryCount = (agenciesResponse.data ?? []).filter(
			(a) => !a.subscriptionEnd
		).length;

		console.info("[billingMonitor] agencies list response", {
			pagination: agenciesResponse.pagination,
			sampleAgency: sample,
			missingExpiryCount,
			totalInPage: agenciesResponse.data?.length ?? 0,
		});
	}, [agenciesResponse]);

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
	const [billingOverrides, setBillingOverrides] = useState<Record<string, BillingOverride>>({});

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
		const override = billingOverrides[id];

		setEditingBillingId(id);
		setFormAgencyId(target.agencyId);
		setFormPlan(normalizePlanLabel(override?.plan ?? target.plan));
		setFormStart(
			override?.subscriptionStart
				? new Date(override.subscriptionStart)
				: target.subscriptionStart
					? new Date(target.subscriptionStart)
					: null
		);
		setFormEnds(
			override?.subscriptionEnd
				? new Date(override.subscriptionEnd)
				: target.subscriptionEnd
					? new Date(target.subscriptionEnd)
					: null
		);
		setFormNotify(Boolean(target.sendNotification));
		setIsBillingDialogOpen(true);
	};

	const openDelete = (id: string) => {
		setDeleteTargetId(id);
		setIsDeleteOpen(true);
	};

	const filteredBillings = useMemo(() => {
		return agencies.filter((b) => {
			const override = billingOverrides[b.agencyId];
			const effectiveEnd = override?.subscriptionEnd ?? b.subscriptionEnd;
			const end = effectiveEnd ? new Date(effectiveEnd) : null;
			const active = end ? isActive(end) : true;
			return statusTab === "active" ? active : !active;
		});
	}, [agencies, billingOverrides, statusTab]);

	const handleSaveBilling = async () => {
		if (!formAgencyId || !formPlan || !formStart || !formEnds) {
			toast.error("Please complete all billing fields.");
			return;
		}

		try {
			const result = await upsertBillingPlan({
				agencyId: formAgencyId,
				data: {
					plan: planCodeFromLabel(formPlan as PlanName),
					subscriptionStart: formStart.toISOString(),
					subscriptionEnd: formEnds.toISOString(),
					sendNotification: formNotify,
				},
			}).unwrap();

			if (import.meta.env.DEV) {
				console.info("[billingMonitor] upsertAgencyBillingPlan response", {
					agencyId: formAgencyId,
					message: (result as any)?.message,
					data: (result as any)?.data,
				});
			}

			const returned = result?.data as
				| {
					agencyId?: string;
					plan?: BillingPlanCode;
					subscriptionStart?: string;
					subscriptionEnd?: string;
				}
				| undefined;

			if (returned?.agencyId) {
				setBillingOverrides((prev) => ({
					...prev,
					[returned.agencyId as string]: {
						plan: returned.plan,
						subscriptionStart: returned.subscriptionStart,
						subscriptionEnd: returned.subscriptionEnd,
					},
				}));
			} else {
				setBillingOverrides((prev) => ({
					...prev,
					[formAgencyId]: {
						plan: planCodeFromLabel(formPlan as PlanName),
						subscriptionStart: formStart.toISOString(),
						subscriptionEnd: formEnds.toISOString(),
					},
				}));
			}

			void refetchAgencies();
			toast.success(editingBillingId ? "Billing updated" : "Billing added");
			setIsBillingDialogOpen(false);
			setIsSuccessOpen(true);
		} catch (e) {
			if (import.meta.env.DEV) {
				console.info("[billingMonitor] upsertAgencyBillingPlan error", {
					agencyId: formAgencyId,
					error: e,
				});
			}
			toast.error("Failed to update billing. Please try again.");
		}
	};

	const handleCancelPlan = async () => {
		if (!editingBillingId || !formAgencyId) return;

		const now = new Date();
		const planLabel = formPlan || normalizePlanLabel(editingBilling?.plan);
		const planCode = planCodeFromLabel((planLabel || "Basic Plan") as PlanName);
		const startIso = (formStart ?? (editingBilling?.subscriptionStart ? new Date(editingBilling.subscriptionStart) : null) ?? now).toISOString();

		try {
			const result = await upsertBillingPlan({
				agencyId: formAgencyId,
				data: {
					plan: planCode,
					subscriptionStart: startIso,
					subscriptionEnd: now.toISOString(),
					sendNotification: true,
				},
			}).unwrap();

			if (import.meta.env.DEV) {
				console.info("[billingMonitor] cancelPlan response", {
					agencyId: formAgencyId,
					message: (result as any)?.message,
					data: (result as any)?.data,
				});
			}

			const returned = result?.data as
				| {
					agencyId?: string;
					plan?: BillingPlanCode;
					subscriptionStart?: string;
					subscriptionEnd?: string;
				}
				| undefined;

			setBillingOverrides((prev) => ({
				...prev,
				[formAgencyId]: {
					plan: returned?.plan ?? planCode,
					subscriptionStart: returned?.subscriptionStart ?? startIso,
					subscriptionEnd: returned?.subscriptionEnd ?? now.toISOString(),
				},
			}));
			void refetchAgencies();
			toast.success("Plan canceled");
			setIsBillingDialogOpen(false);
		} catch (e) {
			if (import.meta.env.DEV) {
				console.info("[billingMonitor] cancelPlan error", {
					agencyId: formAgencyId,
					error: e,
				});
			}
			toast.error("Failed to cancel plan. Please try again.");
		}
	};

	const handleConfirmDelete = () => {
		if (!deleteTargetId) {
			setIsDeleteOpen(false);
			return;
		}

		const target = agencies.find((a) => a.agencyId === deleteTargetId);
		const now = new Date();
		const planLabel = normalizePlanLabel(target?.plan);
		const planCode = planCodeFromLabel(planLabel);
		const startIso = (target?.subscriptionStart ? new Date(target.subscriptionStart) : now).toISOString();

		upsertBillingPlan({
			agencyId: deleteTargetId,
			data: {
				plan: planCode,
				subscriptionStart: startIso,
				subscriptionEnd: now.toISOString(),
				sendNotification: true,
			},
		})
			.unwrap()
			.then((result) => {
				if (import.meta.env.DEV) {
					console.info("[billingMonitor] removePlan response", {
						agencyId: deleteTargetId,
						message: (result as any)?.message,
						data: (result as any)?.data,
					});
				}

				const returned = result?.data as
					| {
						agencyId?: string;
						plan?: BillingPlanCode;
						subscriptionStart?: string;
						subscriptionEnd?: string;
					}
					| undefined;

				setBillingOverrides((prev) => ({
					...prev,
					[deleteTargetId]: {
						plan: returned?.plan ?? planCode,
						subscriptionStart: returned?.subscriptionStart ?? startIso,
						subscriptionEnd: returned?.subscriptionEnd ?? now.toISOString(),
					},
				}));
				void refetchAgencies();
				toast.success("Plan removed");
			})
			.catch((e) => {
				if (import.meta.env.DEV) {
					console.info("[billingMonitor] removePlan error", {
						agencyId: deleteTargetId,
						error: e,
					});
				}
				toast.error("Failed to remove plan. Please try again.");
			})
			.finally(() => {
				setIsDeleteOpen(false);
				setDeleteTargetId(null);
			});
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
											<p className="text-[12px] font-medium text-[#808081]">
												DSP
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
												<DspCount agencyId={b.agencyId} />
											</p>
										</div>
										<div className="text-center">
											<p className="text-[12px] font-medium text-[#808081]">
												Clients
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
												<ClientCount agencyId={b.agencyId} />
											</p>
										</div>
										<div className="text-center">
											<p className="text-[12px] font-medium text-[#808081]">
												Expiry Date
											</p>
											<p className="text-[14px] font-semibold text-[#10141a]">
											{(() => {
												const override = billingOverrides[b.agencyId];
													const effectiveEnd =
														override?.subscriptionEnd ??
														b.subscriptionEnd ??
														(b as any).expiryDate;
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
					className="top-4 right-4 left-auto h-[calc(100vh-2rem)] w-[520px] max-w-[92vw] translate-x-0 translate-y-0 rounded-[30px] p-0 overflow-hidden shadow-2xl"
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
										endMonth={new Date(new Date().getFullYear() + 10, 11, 1)}
										className=""
									/>
								</div>

								<div>
									<p className="text-[12px] font-medium text-[#808081] mb-2">Subscription Ends</p>
									<CustomDatePicker
										date={formEnds}
										setDate={setFormEnds}
										placeholder="Select date"
										endMonth={new Date(new Date().getFullYear() + 10, 11, 1)}
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
								
								{editingBillingId ? (
									<Button
										variant="outline"
										className="w-40 border-black text-black hover:bg-[#ff4d4d] hover:text-white hover:border-[#ff4d4d]"
										onClick={handleCancelPlan}
										disabled={isSavingBilling}
									>
										Cancel Plan
									</Button>
								) : null}
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

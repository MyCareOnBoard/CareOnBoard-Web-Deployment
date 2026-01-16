import { useState } from "react";
import { toast } from "sonner";
import {
	useUpdateAgencyBillingStatusMutation,
	useUpsertAgencyBillingPlanMutation,
	type BillingMonitorAgency,
	type BillingSubscriptionStatus,
} from "@/pages/super-admin/agency-billing-monitor/api";
import type {
	BillingOverride,
	BillingStatusTab,
} from "@/pages/super-admin/agency-billing-monitor/types";
import {
	normalizePlanLabel,
	planCodeFromLabel,
	type PlanName,
} from "@/pages/super-admin/agency-billing-monitor/utils/billingPlan";

type SuccessCopy = { title: string; description: string };

type Params = {
	agencies: BillingMonitorAgency[];
	statusTab: BillingStatusTab;
	refetchAgencies: () => void;
};

export function useAgencyBillingActions({
	agencies,
	statusTab,
	refetchAgencies,
}: Params) {
	const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
	const [editingBillingId, setEditingBillingId] = useState<string | null>(null);
	const [isSuccessOpen, setIsSuccessOpen] = useState(false);
	const [successCopy, setSuccessCopy] = useState<SuccessCopy>({
		title: "Billing added",
		description: "New agency billing has been added successfully",
	});

	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const [formAgencyId, setFormAgencyId] = useState<string>("");
	const [formPlan, setFormPlan] = useState<PlanName | "">("");
	const [formStart, setFormStart] = useState<Date | null>(null);
	const [formEnds, setFormEnds] = useState<Date | null>(null);
	const [formNotify, setFormNotify] = useState(true);
	const [billingOverrides, setBillingOverrides] = useState<
		Record<string, BillingOverride>
	>({});

	const [upsertBillingPlan, { isLoading: isSavingBilling }] =
		useUpsertAgencyBillingPlanMutation();
	const [updateBillingStatus] = useUpdateAgencyBillingStatusMutation();

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

	const handleSaveBilling = async () => {
		if (!formAgencyId || !formPlan || !formStart || !formEnds) {
			toast.error("Please complete all billing fields.");
			return;
		}

		if (formEnds.getTime() < formStart.getTime()) {
			toast.error("Subscription end date must be after the start date.");
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

			const returned = result?.data;

			if (returned?.agencyId) {
				setBillingOverrides((prev) => ({
					...prev,
					[returned.agencyId as string]: {
						plan: returned.plan,
						subscriptionStart: returned.subscriptionStart,
						subscriptionEnd: returned.subscriptionEnd ?? returned.expiryDate,
						status: (returned.status ?? "active") as BillingSubscriptionStatus,
					},
				}));
			} else {
				setBillingOverrides((prev) => ({
					...prev,
					[formAgencyId]: {
						plan: planCodeFromLabel(formPlan as PlanName),
						subscriptionStart: formStart.toISOString(),
						subscriptionEnd: formEnds.toISOString(),
						status: "active",
					},
				}));
			}

			refetchAgencies();
			const isEdit = Boolean(editingBillingId);
			setSuccessCopy({
				title: isEdit ? "Billing updated" : "Billing added",
				description: isEdit
					? "Agency billing has been updated successfully"
					: "New agency billing has been added successfully",
			});
			toast.success(isEdit ? "Billing updated" : "Billing added");
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

		try {
			const result = await updateBillingStatus({
				agencyId: formAgencyId,
				data: {
					status: "cancelled",
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

			const returned = result?.data;
			setBillingOverrides((prev) => ({
				...prev,
				[formAgencyId]: {
					...prev[formAgencyId],
					status: returned?.status ?? "cancelled",
				},
			}));
			refetchAgencies();
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

		updateBillingStatus({
			agencyId: deleteTargetId,
			data: {
				status: "cancelled",
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

				const returned = result?.data;
				setBillingOverrides((prev) => ({
					...prev,
					[deleteTargetId]: {
						...prev[deleteTargetId],
						status: returned?.status ?? "cancelled",
					},
				}));
				refetchAgencies();
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

	const filteredBillings = agencies.filter((b) => {
		// Server filters by status; keep a local guard so overrides immediately reflect
		// cancel/remove without waiting for a refetch.
		const overrideStatus = billingOverrides[b.agencyId]?.status;
		if (!overrideStatus) return true;
		if (statusTab === "active") {
			return overrideStatus === "active" || overrideStatus === "expiring_soon";
		}
		return overrideStatus === "cancelled" || overrideStatus === "expired";
	});

	return {
		// overrides
		billingOverrides,
		filteredBillings,

		// dialog state
		isBillingDialogOpen,
		setIsBillingDialogOpen,
		editingBillingId,
		openAdd,
		openEdit,

		// form state
		formAgencyId,
		setFormAgencyId,
		formPlan,
		setFormPlan,
		formStart,
		setFormStart,
		formEnds,
		setFormEnds,
		formNotify,
		setFormNotify,

		// actions
		isSavingBilling,
		handleSaveBilling,
		handleCancelPlan,

		// success dialog
		isSuccessOpen,
		setIsSuccessOpen,
		successCopy,

		// delete modal
		isDeleteOpen,
		setIsDeleteOpen,
		openDelete,
		handleConfirmDelete,
	};
}

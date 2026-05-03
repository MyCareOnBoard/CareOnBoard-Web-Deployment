import React, { useState } from "react";
import {
	SuccessDialog,
	SuccessDialogContent,
} from "@/components/ui/success-dialog";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import {
	AgencyBillingPageHeader,
	AgencyBillingToolbar,
} from "@/pages/super-admin/agency-billing-monitor/components/AgencyBillingToolbar";
import { BillingPlanDialog } from "@/pages/super-admin/agency-billing-monitor/components/BillingPlanDialog";
import { HistoryList } from "@/pages/super-admin/agency-billing-monitor/components/HistoryList";
import { MonitorList } from "@/pages/super-admin/agency-billing-monitor/components/MonitorList";
import { useAgencyBillingActions } from "@/pages/super-admin/agency-billing-monitor/hooks/useAgencyBillingActions";
import { useBillingMonitorData } from "@/pages/super-admin/agency-billing-monitor/hooks/useBillingMonitorData";
import type { BillingStatusTab } from "@/pages/super-admin/agency-billing-monitor/types";

export default function AgencyBillingMonitorPage() {
	const [view, setView] = useState<"monitor" | "history">("monitor");
	const [search, setSearch] = useState("");
	const [statusTab, setStatusTab] = useState<BillingStatusTab>("active");
	const [planFilter, setPlanFilter] = useState<string>("all");

	const sortBy = "updatedAt";
	const sortOrder: "asc" | "desc" = "desc";
	const limit = 10;

	const [monitorPage, setMonitorPage] = useState(1);
	const [historyPage, setHistoryPage] = useState(1);

	const {
		agencies,
		agenciesPagination,
		agenciesLoading,
		agenciesFetching,
		agenciesError,
		refetchAgencies,
		historyItems,
		historyPagination,
		historyLoading,
		historyFetching,
		historyError,
	} = useBillingMonitorData({
		view,
		statusTab,
		search,
		planFilter,
		monitorPage,
		historyPage,
		limit,
		sortBy,
		sortOrder,
	});

	const {
		billingOverrides,
		filteredBillings,
		isBillingDialogOpen,
		setIsBillingDialogOpen,
		editingBillingId,
		openAdd,
		openEdit,
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
		isSavingBilling,
		handleSaveBilling,
		handleCancelPlan,
		isCancelling,
		isSuccessOpen,
		setIsSuccessOpen,
		successCopy,
		isDeleteOpen,
		setIsDeleteOpen,
		openDelete,
		handleConfirmDelete,
		isDeleting,
	} = useAgencyBillingActions({ agencies, statusTab, refetchAgencies });

	const monitorTotalPages = agenciesPagination?.totalPages ?? 1;
	const monitorResolvedPage = agenciesPagination?.page ?? monitorPage;

	const historyTotalPages = historyPagination?.totalPages ?? 1;
	const historyResolvedPage = historyPagination?.page ?? historyPage;

	const toggleView = () => {
		setView((v) => (v === "monitor" ? "history" : "monitor"));
	};

	return (
		<div className="min-h-[calc(100vh-200px)]">
			<AgencyBillingPageHeader view={view} onToggleView={toggleView} />

			<div className="backdrop-blur-[20px] bg-white/30 border border-white/30 rounded-[30px] p-6 min-h-[600px]">
				<AgencyBillingToolbar
					view={view}
					search={search}
					onSearchChange={setSearch}
					planFilter={planFilter}
					onPlanFilterChange={setPlanFilter}
					statusTab={statusTab}
					onStatusTabChange={setStatusTab}
					onAddPlan={openAdd}
				/>

				{view === "monitor" ? (
					<MonitorList
						items={filteredBillings}
						billingOverrides={billingOverrides}
						isLoading={agenciesLoading}
						isFetching={agenciesFetching}
						error={agenciesError}
						page={monitorResolvedPage}
						totalPages={monitorTotalPages}
						statusTab={statusTab}
						onPrevPage={() => setMonitorPage((p) => Math.max(1, p - 1))}
						onNextPage={() =>
							setMonitorPage((p) => Math.min(monitorTotalPages, p + 1))
						}
						onEdit={openEdit}
						onRemove={openDelete}
					/>
				) : (
					<HistoryList
						items={historyItems}
						isLoading={historyLoading}
						isFetching={historyFetching}
						error={historyError}
						page={historyResolvedPage}
						totalPages={historyTotalPages}
						onPrevPage={() => setHistoryPage((p) => Math.max(1, p - 1))}
						onNextPage={() =>
							setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
						}
					/>
				)}
			</div>

			<BillingPlanDialog
				open={isBillingDialogOpen}
				onOpenChange={setIsBillingDialogOpen}
				agencies={agencies}
				editingBillingId={editingBillingId}
				formAgencyId={formAgencyId}
				setFormAgencyId={setFormAgencyId}
				formPlan={formPlan}
				setFormPlan={setFormPlan}
				formStart={formStart}
				setFormStart={setFormStart}
				formEnds={formEnds}
				setFormEnds={setFormEnds}
				formNotify={formNotify}
				setFormNotify={setFormNotify}
				isSaving={isSavingBilling}
				onSave={handleSaveBilling}
				onCancelPlan={handleCancelPlan}
				isCancelling={isCancelling}
			/>

			<SuccessDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
				<SuccessDialogContent
					title={successCopy.title}
					description={successCopy.description}
					buttonText="Okay"
					onButtonClick={() => setIsSuccessOpen(false)}
				/>
			</SuccessDialog>

			<DeleteConfirmationModal
				isOpen={isDeleteOpen}
				onClose={() => setIsDeleteOpen(false)}
				onConfirm={handleConfirmDelete}
				isDeleting={isDeleting}
				title="Remove plan?"
				message="Are you sure you want to remove this agency plan?"
				confirmText="Remove"
				cancelText="Cancel"
			/>
		</div>
	);
}

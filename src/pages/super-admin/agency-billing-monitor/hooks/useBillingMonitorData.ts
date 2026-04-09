import { useMemo } from "react";
import {
	useGetBillingMonitorAgenciesQuery,
	useGetBillingMonitorHistoryQuery,
	type BillingMonitorAgency,
} from "@/pages/super-admin/agency-billing-monitor/api";
import type { BillingStatusTab } from "@/pages/super-admin/agency-billing-monitor/types";

type Params = {
	view: "monitor" | "history";
	statusTab: BillingStatusTab;
	search: string;
	planFilter: string;
	monitorPage: number;
	historyPage: number;
	limit: number;
	sortBy: string;
	sortOrder: "asc" | "desc";
};

export function useBillingMonitorData({
	view,
	statusTab,
	search,
	planFilter,
	monitorPage,
	historyPage,
	limit,
	sortBy,
	sortOrder,
}: Params) {
	const baseAgencyParams = useMemo(
		() => ({
			page: monitorPage,
			limit,
			search: view === "monitor" ? search : undefined,
			plan: planFilter === "all" ? undefined : planFilter,
			sortBy,
			sortOrder,
		}),
		[limit, monitorPage, planFilter, search, sortBy, sortOrder, view]
	);

	const agenciesQuery = useGetBillingMonitorAgenciesQuery(baseAgencyParams, {
		skip: view !== "monitor",
	});

	const agenciesLoading = agenciesQuery.isLoading;
	const agenciesFetching = agenciesQuery.isFetching;
	const agenciesError = agenciesQuery.error;

	const agenciesResponse = useMemo(() => {
		const response = agenciesQuery.data;
		const all = response?.data ?? [];
		const filtered = all.filter((agency) => {
			const status = agency.status;
			if (!status) return true;
			if (statusTab === "active") {
				return status === "active" || status === "expiring_soon";
			}
			return status === "cancelled" || status === "expired";
		});

		return {
			data: filtered,
			pagination: response?.pagination,
		};
	}, [agenciesQuery.data, statusTab]);

	const refetchAgencies = () => {
		agenciesQuery.refetch();
	};

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

	return {
		agencies,
		agenciesResponse,
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
	};
}

import { useEffect, useMemo } from "react";
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

	const activeAgenciesQuery = useGetBillingMonitorAgenciesQuery(
		{ ...baseAgencyParams, status: "active" },
		{ skip: view !== "monitor" || statusTab !== "active" }
	);
	const expiringSoonAgenciesQuery = useGetBillingMonitorAgenciesQuery(
		{ ...baseAgencyParams, status: "expiring_soon" },
		{ skip: view !== "monitor" || statusTab !== "active" }
	);
	const cancelledAgenciesQuery = useGetBillingMonitorAgenciesQuery(
		{ ...baseAgencyParams, status: "cancelled" },
		{ skip: view !== "monitor" || statusTab !== "inactive" }
	);
	const expiredAgenciesQuery = useGetBillingMonitorAgenciesQuery(
		{ ...baseAgencyParams, status: "expired" },
		{ skip: view !== "monitor" || statusTab !== "inactive" }
	);

	const agenciesLoading =
		statusTab === "active"
			? activeAgenciesQuery.isLoading || expiringSoonAgenciesQuery.isLoading
			: cancelledAgenciesQuery.isLoading || expiredAgenciesQuery.isLoading;
	const agenciesFetching =
		statusTab === "active"
			? activeAgenciesQuery.isFetching || expiringSoonAgenciesQuery.isFetching
			: cancelledAgenciesQuery.isFetching || expiredAgenciesQuery.isFetching;
	const agenciesError =
		statusTab === "active"
			? activeAgenciesQuery.error || expiringSoonAgenciesQuery.error
			: cancelledAgenciesQuery.error || expiredAgenciesQuery.error;

	const agenciesResponse = useMemo(() => {
		const relevant =
			statusTab === "active"
				? [activeAgenciesQuery.data, expiringSoonAgenciesQuery.data]
				: [cancelledAgenciesQuery.data, expiredAgenciesQuery.data];

		const merged = relevant.flatMap((r) => r?.data ?? []);
		const deduped = Array.from(
			new Map(merged.map((a) => [a.agencyId, a])).values()
		);
		const total = relevant.reduce(
			(sum, r) => sum + (r?.pagination?.total ?? 0),
			0
		);

		return {
			data: deduped,
			pagination: {
				page: monitorPage,
				limit,
				total,
				totalPages: Math.max(1, Math.ceil(total / limit)),
			},
		};
	}, [
		activeAgenciesQuery.data,
		expiringSoonAgenciesQuery.data,
		cancelledAgenciesQuery.data,
		expiredAgenciesQuery.data,
		limit,
		monitorPage,
		statusTab,
	]);

	const refetchAgencies = () => {
		if (statusTab === "active") {
			activeAgenciesQuery.refetch();
			expiringSoonAgenciesQuery.refetch();
			return;
		}
		cancelledAgenciesQuery.refetch();
		expiredAgenciesQuery.refetch();
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

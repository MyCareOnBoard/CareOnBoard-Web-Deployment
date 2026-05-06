import React from "react";
import {
	useGetAgencyClientCountQuery,
	useGetAgencyDspCountQuery,
} from "@/pages/super-admin/agency-billing-monitor/api";

export function DspCount({ agencyId }: { agencyId: string }) {
	const { data, isLoading, isFetching, error } = useGetAgencyDspCountQuery(
		{ agencyId },
		{}
	);

	if (isLoading || isFetching) return <span>…</span>;
	if (error) return <span>—</span>;
	return <span>{data ?? 0}</span>;
}

export function ClientCount({ agencyId }: { agencyId: string }) {
	const { data, isLoading, isFetching, error } = useGetAgencyClientCountQuery(
		{ agencyId },
		{}
	);

	if (isLoading || isFetching) return <span>…</span>;
	if (error) return <span>—</span>;
	return <span>{data ?? 0}</span>;
}

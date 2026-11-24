import { useEffect, useState } from "react";
import { useGetExpiredDocumentsQuery } from "@/pages/agency/compliance-alerts/api";
import { getSupportQueue } from "@/lib/api/support";

const COMPLIANCE_POLL_MS = 5 * 60_000;
const SUPPORT_POLL_MS = 2 * 60_000;

/**
 * Counts for the agency sidebar's red badges: expired staff documents on Compliance alerts and
 * support cases waiting on a reply on Support. Each is only fetched when its menu item is shown,
 * and a failed or forbidden request just leaves the badge off.
 */
export function useAgencyNavBadges({ agencyId, mode, complianceVisible, supportVisible }: {
    agencyId: string;
    mode: string | null | undefined;
    complianceVisible: boolean;
    supportVisible: boolean;
}): { compliance?: number; support?: number } {
    const { currentData: expired } = useGetExpiredDocumentsQuery(
        { agencyId, mode: mode ?? undefined },
        { skip: !complianceVisible || !agencyId, pollingInterval: COMPLIANCE_POLL_MS },
    );

    const [support, setSupport] = useState<number>();
    useEffect(() => {
        setSupport(undefined);
        if (!supportVisible || !agencyId) return;
        let cancelled = false;
        const load = () => getSupportQueue({ desk: "agency", status: "waiting", agencyId })
            .then((queue) => { if (!cancelled) setSupport(queue.counts?.waiting); })
            .catch(() => undefined);
        void load();
        const timer = setInterval(load, SUPPORT_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [supportVisible, agencyId]);

    return {
        compliance: complianceVisible ? expired?.count ?? expired?.data?.length : undefined,
        support,
    };
}

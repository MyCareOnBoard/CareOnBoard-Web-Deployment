import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import {
  cancelBillingClaim,
  listBillingClaims,
  updateBillingClaimStatus,
  type BillingClaimListItem,
  type BillingClaimStatus,
  type UpdateBillingClaimStatusPayload,
} from "@/lib/api/claims";
import { filterClaimsByClientSearch } from "../utils/savedClaimUtils";

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

type RefetchOptions = {
  force?: boolean;
};

type UseGeneratedClaimsOptions = {
  enabled?: boolean;
  statusFilter?: BillingClaimStatus | "all";
  clientSearch?: string;
  selectedClientName?: string;
};

export function useGeneratedClaims(
  dateRange: DateRangeValues,
  {
    enabled = true,
    statusFilter = "all",
    clientSearch = "",
    selectedClientName,
  }: UseGeneratedClaimsOptions = {},
) {
  const [rawClaims, setRawClaims] = useState<BillingClaimListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!enabled && !force) {
        return;
      }

      if (!hasCompleteDateRange(dateRange)) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const { claims } = await listBillingClaims({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setRawClaims(claims);
      } catch (fetchError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setRawClaims([]);
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load generated claims",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [dateRange.endDate, dateRange.startDate, enabled, statusFilter],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const claims = useMemo(
    () =>
      filterClaimsByClientSearch(rawClaims, {
        clientQuery: clientSearch,
        selectedClientName,
      }),
    [clientSearch, rawClaims, selectedClientName],
  );

  const updateClaimStatus = useCallback(
    async (claimId: string, payload: UpdateBillingClaimStatusPayload) => {
      setRawClaims((previous) =>
        previous.map((claim) =>
          claim.id === claimId
            ? {
                ...claim,
                status: payload.status,
                rejectionReason:
                  payload.status === "rejected"
                    ? payload.rejectionReason ?? null
                    : null,
              }
            : claim,
        ),
      );

      try {
        await updateBillingClaimStatus(claimId, payload);
      } catch (mutationError) {
        await refetch({ force: true });
        throw mutationError;
      }
    },
    [refetch],
  );

  const cancelClaim = useCallback(
    async (claimId: string) => {
      setRawClaims((previous) => previous.filter((claim) => claim.id !== claimId));

      try {
        await cancelBillingClaim(claimId);
      } catch (mutationError) {
        await refetch({ force: true });
        throw mutationError;
      }
    },
    [refetch],
  );

  return {
    claims,
    totalCount: rawClaims.length,
    loading,
    error,
    refetch,
    updateClaimStatus,
    cancelClaim,
  };
}

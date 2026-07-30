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
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

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
  const { agencyId, mode } = useOperationalAgency();
  const [rawClaims, setRawClaims] = useState<BillingClaimListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!enabled && !force) {
        return;
      }

      if (!agencyId || !hasCompleteDateRange(dateRange)) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const { claims } = await listBillingClaims({
          context: { agencyId },
          query: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
            ...(mode ? { mode } : {}),
          },
          signal: controller.signal,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setRawClaims(claims);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
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
    [agencyId, dateRange.endDate, dateRange.startDate, enabled, statusFilter, mode],
  );

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
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
    async (
      claimId: string,
      payload: UpdateBillingClaimStatusPayload,
      signal?: AbortSignal,
    ) => {
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
        await updateBillingClaimStatus({ context: { agencyId }, claimId, payload, signal });
      } catch (mutationError) {
        if (!signal?.aborted) await refetch({ force: true });
        throw mutationError;
      }
    },
    [agencyId, refetch],
  );

  const cancelClaim = useCallback(
    async (claimId: string, signal?: AbortSignal) => {
      setRawClaims((previous) => previous.filter((claim) => claim.id !== claimId));

      try {
        await cancelBillingClaim({ context: { agencyId }, claimId, signal });
      } catch (mutationError) {
        if (!signal?.aborted) await refetch({ force: true });
        throw mutationError;
      }
    },
    [agencyId, refetch],
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

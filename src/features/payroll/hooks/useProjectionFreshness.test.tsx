import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useProjectionFreshness } from "./useProjectionFreshness";
const projection = (clientRevalidateAfter?: string): import("../model/types").AgencyPayrollSetupProjection => ({ projectionRevision: 1, clientRevalidateAfter, integration: { state: "configured", environment: "sandbox" }, preflight: { values: {}, missingFieldCodes: [] }, readiness: { status: "ready", blockers: [], nextAction: null }, setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false }, capabilities: { canView: true, canManage: false, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false } });
describe("useProjectionFreshness", () => {
  it("marks an expired projection stale", () => { const { result } = renderHook(() => useProjectionFreshness(projection(new Date(0).toISOString()), vi.fn())); expect(result.current.isStale).toBe(true); });
  it("refetches at the server revalidation deadline", async () => { vi.useFakeTimers(); const refetch = vi.fn(); renderHook(() => useProjectionFreshness(projection(new Date(Date.now() + 100).toISOString()), refetch)); await act(() => vi.advanceTimersByTimeAsync(100)); expect(refetch).toHaveBeenCalledOnce(); vi.useRealTimers(); });
});

import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, expect, it, vi } from "vitest";
const base = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: base }));
import { goalsAndDocumentsApi as api } from "@/pages/agency/goalsAndDocuments/api";
import {
  defaultReviewFilters,
  validReviewFilters,
  canReviewCareer,
} from "./career-reconciliation";
const store = () =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (g) => g().concat(api.middleware),
  });
beforeEach(() =>
  base
    .mockReset()
    .mockResolvedValue({ data: { success: true, data: { shifts: [] } } }),
);
it("keeps scope in cache but never sends it; preserves every authorization filter", async () => {
  const s = store();
  for (const authorization of ["all", "exact", "needs_review"] as const) {
    const args = {
      scopeKey: "actor/db/a",
      agencyId: "a",
      clientId: "c",
      startDate: "2026-09-01",
      endDate: "2026-09-17",
      authorization,
      ...(authorization === "exact" ? { serviceAuthorizationId: "auth" } : {}),
    };
    const request = s.dispatch(
      api.endpoints.getCareerReconciliation.initiate(args),
    );
    await request;
    const { scopeKey: _, ...params } = args;
    expect(base.mock.calls.at(-1)?.[0].params).toEqual(params);
    request.unsubscribe();
  }
});
it("isolates scopes and keeps transport failures as errors", async () => {
  const s = store();
  const args = {
    scopeKey: "first",
    clientId: "c",
    startDate: "2026-09-01",
    endDate: "2026-09-17",
    authorization: "all" as const,
  };
  await s.dispatch(api.endpoints.getCareerReconciliation.initiate(args));
  base.mockResolvedValueOnce({
    error: { status: 503, data: { code: "CAREER_REVIEW_RETRY" } },
  });
  const result = await s.dispatch(
    api.endpoints.getCareerReconciliation.initiate({
      ...args,
      scopeKey: "second",
    }),
  );
  expect(result.isError).toBe(true);
  expect(result.data).toBeUndefined();
  expect(base).toHaveBeenCalledTimes(2);
});
it("encodes the claim id and strips client-only scope", async () => {
  const s = store();
  await s.dispatch(
    api.endpoints.getCareerClaimReconciliation.initiate({
      scopeKey: "private",
      agencyId: "a",
      clientId: "c",
      claimId: "id /?",
    }),
  );
  expect(base.mock.calls[0][0]).toMatchObject({
    url: "/goalsAndDocuments/career-reconciliation/claims/id%20%2F%3F",
    params: { agencyId: "a", clientId: "c" },
  });
});
it("uses agency-local days and validates civil dates and ninety-day limit", () => {
  expect(
    defaultReviewFilters("Pacific/Honolulu", new Date("2026-09-17T01:00:00Z")),
  ).toEqual({
    startDate: "2026-08-18",
    endDate: "2026-09-16",
    authorization: "all",
  });
  expect(
    validReviewFilters({
      startDate: "2026-02-30",
      endDate: "2026-03-01",
      authorization: "all",
    }),
  ).toBe(false);
  expect(
    validReviewFilters({
      startDate: "2026-01-01",
      endDate: "2026-04-01",
      authorization: "all",
    }),
  ).toBe(false);
});
it("review permissions do not depend on Goals & Documents", () => {
  expect(
    canReviewCareer({
      userType: "agency_staff",
      profile: {
        isActive: true,
        agencyModes: ["ddd"],
        accessList: ["Client Management", "Notes", "Scheduling"],
      },
    }),
  ).toBe(true);
  expect(
    canReviewCareer({
      userType: "agency_staff",
      profile: { accessList: ["Goals & Documents", "Client Management"] },
    }),
  ).toBe(false);
});

it("rejects unexpected authorization ids and revoked or non-DDD admin scope", () => {
  const filters = {
    startDate: "2026-09-01",
    endDate: "2026-09-17",
    authorization: "all" as const,
    serviceAuthorizationId: "auth",
  };
  expect(validReviewFilters(filters)).toBe(false);
  expect(
    validReviewFilters({
      ...filters,
      authorization: "exact",
      serviceAuthorizationId: "bad/id",
    }),
  ).toBe(false);
  expect(
    canReviewCareer({
      userType: "super_admin",
      profile: {
        agencyModes: ["hha"],
        accessList: ["Clients Directory", "Notes"],
      },
    }),
  ).toBe(false);
  expect(
    canReviewCareer({ userType: "agency", profile: { status: "deleted" } }),
  ).toBe(false);
});

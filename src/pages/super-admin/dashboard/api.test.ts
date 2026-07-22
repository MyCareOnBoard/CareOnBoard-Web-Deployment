import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: vi.fn(),
}));

import {
  buildAgencyComplianceRequest,
  buildNetworkComplianceSummaryRequest,
} from "./api";

describe("super-admin dashboard compliance API", () => {
  it("keeps network summary requests scoped only by dates and program", () => {
    expect(
      buildNetworkComplianceSummaryRequest({
        startDate: "2026-06-21",
        endDate: "2026-07-21",
        mode: undefined,
      }),
    ).toEqual({
      url: "/superAdminDashboard/compliance/summary",
      method: "GET",
      params: {
        startDate: "2026-06-21",
        endDate: "2026-07-21",
      },
      requiresAuth: true,
    });
  });

  it("includes only non-empty agency IDs in summary requests", () => {
    expect(
      buildNetworkComplianceSummaryRequest({
        startDate: "2026-06-21",
        endDate: "2026-07-21",
        agencyIds: " agency-1,agency-2 ",
      }),
    ).toMatchObject({
      params: {
        startDate: "2026-06-21",
        endDate: "2026-07-21",
        agencyIds: "agency-1,agency-2",
      },
    });

    for (const agencyIds of [undefined, null, "   "]) {
      expect(
        buildNetworkComplianceSummaryRequest({
          startDate: "2026-06-21",
          endDate: "2026-07-21",
          agencyIds,
        }).params,
      ).toEqual({
        startDate: "2026-06-21",
        endDate: "2026-07-21",
      });
    }
  });

  it("includes interactive table parameters only in agency requests", () => {
    expect(
      buildAgencyComplianceRequest({
        startDate: "2026-06-21",
        endDate: "2026-07-21",
        mode: "hha",
        search: "Care",
        sortBy: "complianceRate",
        sortOrder: "asc",
        page: 2,
        limit: 20,
      }),
    ).toEqual({
      url: "/superAdminDashboard/compliance/agencies",
      method: "GET",
      params: {
        startDate: "2026-06-21",
        endDate: "2026-07-21",
        mode: "hha",
        search: "Care",
        sortBy: "complianceRate",
        sortOrder: "asc",
        page: 2,
        limit: 20,
      },
      requiresAuth: true,
    });
  });
});

import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";

import { payrollRunApi } from "./payrollRunEndpoints";

const clients = vi.hoisted(() => ({
  authenticated: vi.fn(),
  unauthenticated: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: clients.authenticated,
  axiosClientWithoutAuth: clients.unauthenticated,
}));

describe("force-build Axios transport", () => {
  it("forwards the authoritative force-build fence as the authenticated POST data", async () => {
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const fence = {
      periodStart: "2026-08-31",
      periodEnd: "2026-09-06",
      payday: "2026-09-11",
      expectedProjectionRevision: 27,
    };
    clients.authenticated.mockResolvedValue({
      data: { buildId: "build-a", state: "queued", pollAfterMs: 2000, attention: null },
    });

    await expect(store.dispatch(payrollRunApi.endpoints.forceBuildUpcomingPayroll.initiate({
      audience: "agency",
      actorUid: "actor-1",
      agencyId: "agency-1",
      mode: "ddd",
      ...fence,
    })).unwrap()).resolves.toEqual({ buildId: "build-a", state: "queued", pollAfterMs: 2000, attention: null });

    expect(clients.authenticated).toHaveBeenCalledOnce();
    expect(clients.authenticated).toHaveBeenCalledWith(expect.objectContaining({
      url: "/checkPayrollAgency/payroll/agency/upcoming/force-build",
      method: "POST",
      params: { mode: "ddd" },
      data: fence,
    }));
  });
});

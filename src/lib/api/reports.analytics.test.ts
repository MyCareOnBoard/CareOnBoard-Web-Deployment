import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import { reportsApi } from "./reports";
const { base } = vi.hoisted(() => ({
  base: vi.fn(async () => ({ data: { success: true, data: {} } })),
}));
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: base }));
it("keeps actor/database/permission scope in cache identity but out of HTTP for both endpoints", async () => {
  const store = configureStore({
    reducer: { [reportsApi.reducerPath]: reportsApi.reducer },
    middleware: (get) => get().concat(reportsApi.middleware),
  });
  for (const endpoint of [
    reportsApi.endpoints.getAnalyticsSummary,
    reportsApi.endpoints.getAnalyticsInsights,
  ]) {
    for (const scopeKey of ["actor-db-a", "actor-db-b"]) {
      const args = {
        mode: "hha",
        startDate: "2026-09-01",
        endDate: "2026-09-16",
        scopeKey,
      };
      const request =
        endpoint === reportsApi.endpoints.getAnalyticsSummary
          ? store.dispatch(
              reportsApi.endpoints.getAnalyticsSummary.initiate(args),
            )
          : store.dispatch(
              reportsApi.endpoints.getAnalyticsInsights.initiate(args),
            );
      await request;
      request.unsubscribe();
    }
  }
  expect(base).toHaveBeenCalledTimes(4);
  for (const call of base.mock.calls as unknown as any[][])
    expect(call[0].params).toEqual({
      mode: "hha",
      startDate: "2026-09-01",
      endDate: "2026-09-16",
    });
  expect(
    Object.keys(store.getState()[reportsApi.reducerPath].queries),
  ).toHaveLength(4);
  store.dispatch(reportsApi.util.resetApiState());
});

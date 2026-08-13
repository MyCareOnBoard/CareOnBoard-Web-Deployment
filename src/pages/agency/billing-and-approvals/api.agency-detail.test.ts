import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const baseQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

import { billingApi } from "./api";

describe("billing agency detail query", () => {
  beforeEach(() => {
    baseQuery.mockReset();
    baseQuery.mockResolvedValue({ data: { success: true, agency: { id: "atlas", name: "Atlas Care", address: "100 Provider Way" } } });
  });

  it("keys agency detail by the authorized agency id and reuses an existing cache entry", async () => {
    const store = configureStore({
      reducer: { [billingApi.reducerPath]: billingApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(billingApi.middleware),
    });

    await store.dispatch(billingApi.endpoints.getAgencyDetail.initiate("atlas"));
    await store.dispatch(billingApi.endpoints.getAgencyDetail.initiate("atlas"));
    await store.dispatch(billingApi.endpoints.getAgencyDetail.initiate("new-agency"));

    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect(baseQuery).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: "/agencies/atlas" }), expect.anything(), undefined);
    expect(baseQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: "/agencies/new-agency" }), expect.anything(), undefined);
  });
});

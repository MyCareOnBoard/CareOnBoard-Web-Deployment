import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  baseQuery: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: mocks.get },
}));

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: mocks.baseQuery,
}));

import { clientsApi, listClients } from "./clients";

describe("client list mode forwarding", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.baseQuery.mockReset();
    mocks.get.mockResolvedValue({ data: { success: true, clients: [] } });
    mocks.baseQuery.mockResolvedValue({ data: { success: true, clients: [] } });
  });

  it("forwards client type through imperative and RTK list requests", async () => {
    await listClients({ agencyId: "agency-1", type: "hha" });
    expect(mocks.get).toHaveBeenCalledWith(
      "/clients",
      expect.objectContaining({
        params: expect.objectContaining({ agencyId: "agency-1", type: "hha" }),
      }),
    );

    const store = configureStore({
      reducer: { [clientsApi.reducerPath]: clientsApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(clientsApi.middleware),
    });
    await store.dispatch(clientsApi.endpoints.listClients.initiate({
      agencyId: "agency-1",
      type: "hha",
    }));

    expect(mocks.baseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("type=hha"),
      }),
      expect.anything(),
      undefined,
    );
  });

  it("reads every raw page when the program filter leaves a sparse page", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { success: true, clients: [{ id: "first" }], pagination: { fetchedCount: 100 } } })
      .mockResolvedValueOnce({ data: { success: true, clients: [], pagination: { fetchedCount: 100 } } })
      .mockResolvedValueOnce({ data: { success: true, clients: [{ id: "last" }], pagination: { fetchedCount: 1 } } });

    const clients = await listClients({ agencyId: "agency-1", type: "sc", all: true });
    expect(clients.map((client) => client.id)).toEqual(["first", "last"]);
    expect(mocks.get.mock.calls.map(([, config]) => config.params.offset)).toEqual([0, 100, 200]);
  });
});

import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  baseQuery: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: mocks.get, put: mocks.put },
}));

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: mocks.baseQuery,
}));

import { clientsApi, listAgencyClients, listClients, saveScCaseload } from "./clients";

describe("client list mode forwarding", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.put.mockReset().mockResolvedValue({ data: { success: true } });
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

  it("loads sparse SC assignment pages without an unbounded list request", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { success: true, clients: [{ id: "first" }], pagination: { fetchedCount: 100 } } })
      .mockResolvedValueOnce({ data: { success: true, clients: [], pagination: { fetchedCount: 100 } } })
      .mockResolvedValueOnce({ data: { success: true, clients: [{ id: "last" }], pagination: { fetchedCount: 1 } } });

    const clients = await listAgencyClients({ agencyId: "agency-1", type: "sc", assignment: "available", coordinatorId: "sc-1", coordinatorName: "Alex", brief: true, limit: 100 });
    expect(clients.map((client) => client.id)).toEqual(["first", "last"]);
    expect(mocks.get.mock.calls.map(([, config]) => config.params.offset)).toEqual([0, 100, 200]);
    expect(mocks.get.mock.calls.every(([, config]) => config.params.brief && config.params.type === "sc")).toBe(true);
  });

  it("saves SC caseloads through the agency client management route", async () => {
    await saveScCaseload("sc-1", ["old"], ["new"]);
    expect(mocks.put).toHaveBeenCalledWith("/clientManagement/sc-caseload/sc-1", { currentClientIds: ["old"], selectedClientIds: ["new"] });
  });

  it("refreshes the Support Coordination client list after an assessment update", async () => {
    const store = configureStore({
      reducer: { [clientsApi.reducerPath]: clientsApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(clientsApi.middleware),
    });
    const list = store.dispatch(clientsApi.endpoints.listAgencyClients.initiate({ agencyId: "agency-1", type: "sc" }));
    await list;
    await store.dispatch(clientsApi.endpoints.updateClient.initiate({
      clientId: "client-1", data: {
        tier: "D",
        scAssessment: { answer: "yes", njcatStatus: "Available", assessmentDate: "2026-09-28", assessmentSource: "DDD / State record", determinationDate: "2026-09-28", effectiveDate: "2026-09-28", tierLetterAvailable: "Yes" },
      },
    }));
    await vi.waitFor(() => expect(mocks.baseQuery.mock.calls.filter(([request]) => request.url.startsWith("/clientManagement"))).toHaveLength(2));
    list.unsubscribe();
  });
});

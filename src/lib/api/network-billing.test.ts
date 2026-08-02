import { type AxiosRequestConfig } from "axios";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { axiosAdapter, testAxiosClient } = vi.hoisted(() => {
  const adapter = vi.fn();
  return {
    axiosAdapter: adapter,
    testAxiosClient: {
      get: (url: string, config: AxiosRequestConfig) => adapter({ ...config, url }),
    },
  };
});

vi.mock("@/lib/axios", () => ({ default: testAxiosClient }));

import {
  NETWORK_BILLING_KEEP_UNUSED_DATA_FOR,
  NETWORK_BILLING_QUERY_OPTIONS,
  networkBillingApi,
} from "./network-billing";

type RequestConfig = AxiosRequestConfig & { url?: string };

const baseArgs = {
  actorUid: "super-admin-a",
  environment: "staging",
  scope: { kind: "network" as const },
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  mode: "ddd" as const,
  tab: "saved" as const,
  sort: "createdAt:desc" as const,
  limit: 25,
};

const savedClaim = {
  id: "claim-1",
  kind: "claim",
  agencyId: "agency-a",
  agencyName: "Agency A",
  amount: 25,
};

const claimsPage = {
  success: true,
  data: {
    scope: { kind: "global", agencyCount: 1 },
    page: { rows: [savedClaim], total: 1, nextCursor: null, hasMore: false },
  },
};

function createStore() {
  return configureStore({
    reducer: { [networkBillingApi.reducerPath]: networkBillingApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(networkBillingApi.middleware),
  });
}

function respond(data: unknown = claimsPage) {
  axiosAdapter.mockImplementation((config: RequestConfig) => Promise.resolve({
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  }));
}

describe("network billing API", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    respond();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the network claims path and preserves server-supported query params", async () => {
    const store = createStore();

    await expect(store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({
      ...baseArgs,
      status: "pending",
      clientId: "client-a",
      clientAgencyId: "agency-a",
      cursor: "cursorA",
    })).unwrap()).resolves.toEqual(claimsPage.data);

    const request = axiosAdapter.mock.calls[0][0] as RequestConfig;
    expect(request.url).toBe("/superAdminOperations/billing/claims");
    expect(request.params).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      mode: "ddd",
      tab: "saved",
      sort: "createdAt:desc",
      limit: 25,
      status: "pending",
      clientId: "client-a",
      clientAgencyId: "agency-a",
      cursor: "cursorA",
    });
    expect(NETWORK_BILLING_QUERY_OPTIONS).toEqual({ refetchOnMountOrArgChange: 30 });
  });

  it("rejects malformed public scopes, cursor pages, and cross-agency rows", async () => {
    const store = createStore();
    respond({
      success: true,
      data: {
        scope: { kind: "network", agencyCount: 1 },
        page: { rows: [{ ...savedClaim, agencyName: undefined }], total: -1, nextCursor: "not/a/cursor", hasMore: false },
      },
    });

    await expect(store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs)).unwrap())
      .rejects.toMatchObject({ status: "PARSING_ERROR" });
  });

  it("deduplicates concurrent requests with identical serialized arguments", async () => {
    const store = createStore();
    let resolveRequest!: () => void;
    axiosAdapter.mockImplementation((config: RequestConfig) => new Promise((resolve) => {
      resolveRequest = () => resolve({ data: claimsPage, status: 200, statusText: "OK", headers: {}, config });
    }));

    const first = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    const second = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    resolveRequest();
    await Promise.all([first.unwrap(), second.unwrap()]);

    expect(axiosAdapter).toHaveBeenCalledOnce();
  });

  it("isolates actor, environment, filter, and cursor cache entries", async () => {
    const store = createStore();
    const inputs = [
      baseArgs,
      { ...baseArgs, actorUid: "super-admin-b" },
      { ...baseArgs, environment: "production" },
      { ...baseArgs, scope: { kind: "agency" as const, agencyId: "agency-a" } },
      { ...baseArgs, status: "paid" as const },
      { ...baseArgs, cursor: "cursorB" },
    ];

    await Promise.all(inputs.map((input) =>
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(input)).unwrap(),
    ));

    expect(axiosAdapter).toHaveBeenCalledTimes(inputs.length);
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(inputs.length);
  });

  it("passes RTK's cancellation signal to Axios without creating another controller", async () => {
    const store = createStore();
    let request: RequestConfig | undefined;
    axiosAdapter.mockImplementation((config: RequestConfig) => new Promise((_, reject) => {
      request = config;
      config.signal?.addEventListener?.("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    const pending = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    await vi.waitFor(() => expect(request).toBeDefined());
    pending.abort?.();
    await expect(pending.unwrap()).rejects.toMatchObject({ name: "AbortError" });
    expect(request?.signal?.aborted).toBe(true);
  });

  it("retains unused cache entries for sixty seconds", () => {
    expect(NETWORK_BILLING_KEEP_UNUSED_DATA_FOR).toBe(60);
  });

  it("resets all network billing cache state", async () => {
    const store = createStore();
    await store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs)).unwrap();
    store.dispatch(networkBillingApi.util.resetApiState());
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(0);
  });
});

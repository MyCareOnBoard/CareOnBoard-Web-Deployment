import { beforeEach, describe, expect, it, vi } from "vitest";
import { customBaseQuery } from "./baseQuery";

const clients = vi.hoisted(() => ({
  authenticated: vi.fn(),
  unauthenticated: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: clients.authenticated,
  axiosClientWithoutAuth: clients.unauthenticated,
}));

type ClientConfig = {
  signal?: AbortSignal;
  responseType?: string;
};

function rejectOnAbort(config: ClientConfig) {
  return new Promise<never>((_resolve, reject) => {
    config.signal?.addEventListener("abort", () => reject(new Error("canceled")), { once: true });
  });
}

const apiFor = (signal: AbortSignal) => ({ signal } as Parameters<typeof customBaseQuery>[1]);

describe("customBaseQuery cancellation", () => {
  beforeEach(() => {
    clients.authenticated.mockReset();
    clients.unauthenticated.mockReset();
  });

  it("aborts an authenticated GET through the RTK Query signal", async () => {
    clients.authenticated.mockImplementation(rejectOnAbort);
    const controller = new AbortController();
    const pending = customBaseQuery(
      { url: "/payroll", method: "GET", requiresAuth: true },
      apiFor(controller.signal),
      {},
    );

    controller.abort();

    await expect(pending).resolves.toEqual({
      error: { status: undefined, data: "canceled" },
    });
  });

  it("aborts an unauthenticated blob request and preserves its response type", async () => {
    let received: ClientConfig | undefined;
    clients.unauthenticated.mockImplementation((config: ClientConfig) => {
      received = config;
      return rejectOnAbort(config);
    });
    const controller = new AbortController();
    const pending = customBaseQuery(
      { url: "/artifact", method: "GET", responseType: "blob" },
      apiFor(controller.signal),
      {},
    );

    controller.abort();

    await expect(pending).resolves.toEqual({
      error: { status: undefined, data: "canceled" },
    });
    expect(received?.responseType).toBe("blob");
  });
});

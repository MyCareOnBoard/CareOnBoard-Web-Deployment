import { describe, expect, it, vi } from "vitest";

const { post, put } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));

vi.mock("@/lib/axios", () => ({
  default: { post, put },
}));

import { createClient, updateClient } from "./clients";

describe("client payroll API transport", () => {
  const payrollServiceLocation = {
    source: "primaryAddress" as const,
    attestedActualServiceLocation: true as const,
    effectiveFrom: "2026-08-14",
  };

  it("passes the public payroll DTO through create without adding scope or provider fields", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "client-1" } } });
    await createClient({ primaryAddress: { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" }, payrollServiceLocation });

    expect(post).toHaveBeenCalledWith("/clients", {
      primaryAddress: { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" },
      payrollServiceLocation: {
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-14",
      },
    });
  });

  it("passes the public payroll DTO through update without a scope or provider field", async () => {
    put.mockResolvedValueOnce({ data: { success: true, data: { id: "client-1" } } });
    await updateClient("client-1", { payrollServiceLocation });

    expect(put).toHaveBeenCalledWith("/clients/client-1", {
      payrollServiceLocation: {
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-14",
      },
    }, { params: undefined });
  });

  it("preserves explicit null and omitted payroll choices distinctly", async () => {
    put.mockResolvedValue({ data: { success: true, data: { id: "client-1" } } });
    await updateClient("client-1", { payrollServiceLocation: null });
    await updateClient("client-1", {});

    expect(put).toHaveBeenNthCalledWith(1, "/clients/client-1", { payrollServiceLocation: null }, { params: undefined });
    expect(put).toHaveBeenNthCalledWith(2, "/clients/client-1", {}, { params: undefined });
  });
});

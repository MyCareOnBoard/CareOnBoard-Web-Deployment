import { describe, expect, it, vi } from "vitest";

const { post, put } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));

vi.mock("@/lib/axios", () => ({
  default: { post, put },
}));

import { createClient, updateClient } from "./clients";

describe("client payroll API transport", () => {
  const payrollServiceLocations = [
    { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" },
    { source: "secondaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-09-01" },
  ];

  it("passes the public payroll DTO through create without adding scope or provider fields", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "client-1" } } });
    await createClient({ primaryAddress: { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" }, payrollServiceLocations });

    expect(post).toHaveBeenCalledWith("/clients", {
      primaryAddress: { line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", country: "US" },
      payrollServiceLocations,
    });
  });

  it("passes the public payroll DTO through update without a scope or provider field", async () => {
    put.mockResolvedValueOnce({ data: { success: true, data: { id: "client-1" } } });
    await updateClient("client-1", { payrollServiceLocations });

    expect(put).toHaveBeenCalledWith("/clients/client-1", {
      payrollServiceLocations,
    }, { params: undefined });
  });

  it("preserves backend error details from failed updates", async () => {
    const backendError = Object.assign(new Error("Request failed with status code 400"), {
      response: { data: { error: "The workplace effective date is invalid." } },
    });
    put.mockRejectedValueOnce(backendError);

    await expect(updateClient("client-1", {})).rejects.toBe(backendError);
  });

  it("preserves an explicit empty service-location selection and an omitted selection distinctly", async () => {
    put.mockResolvedValue({ data: { success: true, data: { id: "client-1" } } });
    await updateClient("client-1", { payrollServiceLocations: [] });
    await updateClient("client-1", {});

    expect(put).toHaveBeenNthCalledWith(1, "/clients/client-1", { payrollServiceLocations: [] }, { params: undefined });
    expect(put).toHaveBeenNthCalledWith(2, "/clients/client-1", {}, { params: undefined });
  });
});

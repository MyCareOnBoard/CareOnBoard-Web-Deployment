import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClientSave } from "./useClientSave";
import { createClient, updateClient } from "@/lib/api/clients";
import { createInitialAddClientFormData } from "../types/formData";

vi.mock("@/lib/api/clients", () => ({
  createClient: vi.fn().mockResolvedValue({ id: "client-1", firstName: "Jane", lastName: "Doe" }),
  updateClient: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils/documentUploadHandler", () => ({
  handleDocumentUploads: vi.fn().mockResolvedValue([]),
}));

function formData() {
  const data = createInitialAddClientFormData();
  data.stage1.firstName = "Jane";
  data.stage1.lastName = "Doe";
  data.stage1.address = "1 Main St";
  data.stage1.location = { lat: "40.7", lon: "-74.0" };
  return data;
}

function payrollFormData() {
  const data = formData();
  Object.assign(data.stage1, {
    address: "42 Service Lane, Newark, NJ 07102, USA",
    location: { lat: "40.7357", lon: "-74.1724" },
    countyState: "Essex / NJ",
    zipCode: "07102",
    line1: "42 Service Lane",
    line2: "Suite 3",
    city: "Newark",
    state: "NJ",
    postalCode: "07102",
    country: "US",
    payrollServiceLocations: [{
      source: "primaryAddress" as const,
      attestedActualServiceLocation: true as const,
      effectiveFrom: "2026-08-14",
    }],
  });
  return data;
}

describe("useClientSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates on first save when no clientId exists", async () => {
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      await result.current.saveClient(formData(), false, undefined, false, true, false);
    });
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("final non-progressive save updates instead of re-creating when clientId exists", async () => {
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      await result.current.saveClient(formData(), false, "client-1", false, false, true);
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(updateClient).toHaveBeenCalled();
    const firstUpdatePayload = vi.mocked(updateClient).mock.calls[0][1];
    expect(firstUpdatePayload.status).toBe("active");
  });

  it("one-shot final save creates with active status", async () => {
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      await result.current.saveClient(formData(), false, undefined, false, false, true);
    });
    expect(createClient).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(createClient).mock.calls[0][0];
    expect(payload.status).toBe("active");
  });

  it("sends the exact payroll attestation on create first pass but not its document/status pass", async () => {
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      await result.current.saveClient(payrollFormData(), false, undefined, false, true, true);
    });

    const firstPayload = vi.mocked(createClient).mock.calls[0][0];
    expect(firstPayload.primaryAddress).toEqual({ address: "42 Service Lane, Newark, NJ 07102, USA", location: { lat: "40.7357", lon: "-74.1724" }, countyState: "Essex / NJ", zipCode: "07102", line1: "42 Service Lane", line2: "Suite 3", city: "Newark", state: "NJ", postalCode: "07102", country: "US" });
    expect(firstPayload.payrollServiceLocations).toEqual([{ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" }]);
    expect(Object.keys(firstPayload.payrollServiceLocations![0])).toEqual(["source", "attestedActualServiceLocation", "effectiveFrom"]);
    expect(firstPayload).not.toHaveProperty("providerAssignmentId");
    expect(firstPayload).not.toHaveProperty("agencyId");
    expect(updateClient).toHaveBeenLastCalledWith("client-1", { documents: [], status: "active" });
  });

  it("sends the exact payroll attestation on update first pass but not its document/status pass", async () => {
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      await result.current.saveClient(payrollFormData(), true, "client-1", false, true, false);
    });

    expect(updateClient).toHaveBeenNthCalledWith(1, "client-1", expect.objectContaining({
      payrollServiceLocations: [{
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-14",
      }],
    }));
    expect(updateClient).toHaveBeenNthCalledWith(2, "client-1", { documents: [] });
  });

  it("does not call either API when the requested attestation has no effective date", async () => {
    const data = payrollFormData();
    data.stage1.payrollServiceLocations = [{ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "" }];
    const { result } = renderHook(() => useClientSave());
    let saveResult;
    await act(async () => { saveResult = await result.current.saveClient(data, false, undefined, false, true, false); });

    expect(saveResult).toMatchObject({ success: false, error: "Enter a valid effective date for the actual service-location attestation." });
    expect(createClient).not.toHaveBeenCalled();
    expect(updateClient).not.toHaveBeenCalled();
  });

  it("owns an explicit payroll opt-out only in the first update request", async () => {
    const data = payrollFormData();
    data.stage1.payrollServiceLocations = [];
    const { result } = renderHook(() => useClientSave());
    await act(async () => { await result.current.saveClient(data, true, "client-1", false, true, false); });

    expect(updateClient).toHaveBeenNthCalledWith(1, "client-1", expect.objectContaining({ payrollServiceLocations: [] }));
    expect(updateClient).toHaveBeenNthCalledWith(2, "client-1", { documents: [] });
  });

  it("omits an untouched payroll choice from the first update request", async () => {
    const data = payrollFormData();
    data.stage1.payrollServiceLocations = undefined;
    const { result } = renderHook(() => useClientSave());
    await act(async () => { await result.current.saveClient(data, true, "client-1", false, true, false); });

    expect(Object.hasOwn(vi.mocked(updateClient).mock.calls[0][1], "payrollServiceLocations")).toBe(false);
  });
});

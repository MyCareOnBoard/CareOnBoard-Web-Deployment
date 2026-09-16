import { clientToFormData } from "../utils/clientToFormData";
import { refreshClientDocumentBaseline } from "../utils/clientDocumentEdits";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClientSave } from "./useClientSave";
import { createClient, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
import { createInitialAddClientFormData } from "../types/formData";

vi.mock("@/lib/api/clients", () => ({
  createClient: vi.fn().mockResolvedValue({ id: "client-1", firstName: "Jane", lastName: "Doe" }),
  updateClient: vi.fn().mockResolvedValue(undefined),
  uploadClientDocument: vi.fn().mockResolvedValue({ fileName: "new.pdf", url: "https://example.test/new" }),
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
    expect(updateClient).toHaveBeenLastCalledWith("client-1", { status: "active" });
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
    expect(updateClient).toHaveBeenCalledTimes(1);
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
    expect(updateClient).toHaveBeenCalledTimes(1);
  });

  it("omits an untouched payroll choice from the first update request", async () => {
    const data = payrollFormData();
    data.stage1.payrollServiceLocations = undefined;
    const { result } = renderHook(() => useClientSave());
    await act(async () => { await result.current.saveClient(data, true, "client-1", false, true, false); });

    expect(Object.hasOwn(vi.mocked(updateClient).mock.calls[0][1], "payrollServiceLocations")).toBe(false);
  });
});

describe("document save flow", () => {
  beforeEach(() => vi.clearAllMocks());
  function existing(documents: Client["documents"]) {
    const data = formData();
    data.stage3 = clientToFormData({ id: "client-1", type: "ddd", documents } as Client).stage3;
    return data;
  }
  it("omits document writes for unrelated edits, including duplicates and absent signature", async () => {
    const documents = [{ key: "isp" as const, url: "a", expiryDate: "2026-09-15T15:00:00.000Z" }, { key: "isp" as const, url: "b" }, { key: "form485" as const, url: "485" }];
    const { result } = renderHook(() => useClientSave());
    await act(async () => { expect(await result.current.saveClient(existing(documents), true, "client-1", false, true)).toMatchObject({ success: true, documents }); });
    expect(updateClient).toHaveBeenCalledTimes(1);
    expect(updateClient).toHaveBeenCalledWith("client-1", expect.not.objectContaining({ documents: expect.anything() }));
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
  it("preflights ambiguous replacements and invalid dates before profile mutation or create", async () => {
    const original = { key: "isp" as const, url: "a" };
    const data = existing([original, original]);
    data.stage3.docs[0].file = new File(["a"], "a.pdf");
    const { result } = renderHook(() => useClientSave());
    await act(async () => { expect(await result.current.saveClient(data, true, "client-1", false, true)).toMatchObject({ success: false }); });
    const newData = formData();
    newData.stage3.docs[0].issuedOnDate = new Date(NaN);
    await act(async () => { expect(await result.current.saveClient(newData, false, undefined, false, true)).toMatchObject({ success: false }); });
    expect(createClient).not.toHaveBeenCalled();
    expect(updateClient).not.toHaveBeenCalled();
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
  it("saves a date correction with no upload and preserves the sibling record", async () => {
    const data = existing([{ key: "isp", url: "a" }, { key: "isp", url: "b" }]);
    data.stage3.docs[0].expiryDate = new Date(2027, 8, 16);
    data.stage3.docs[0].editedDates = { expiryDate: true };
    const { result } = renderHook(() => useClientSave());
    await act(async () => { await result.current.saveClient(data, true, "client-1", false, true); });
    expect(updateClient).toHaveBeenLastCalledWith("client-1", { documents: [{ key: "isp", url: "a", expiryDate: "2027-09-16" }, { key: "isp", url: "b" }] });
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
  it("progressive then final save does not upload a committed file twice", async () => {
    const data = formData();
    data.stage3.docs[0].file = new File(["a"], "a.pdf");
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      const saved = await result.current.saveClient(data, false, undefined, false, true);
      expect(saved.success).toBe(true);
      data.stage3 = refreshClientDocumentBaseline(data.stage3, saved.documents!);
      await result.current.saveClient(data, false, saved.clientId, false, false, true);
    });
    expect(uploadClientDocument).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
  it.each(["upload", "metadata"])("retains the created client ID and draft on %s failure for retry", async (failure) => {
    const data = formData();
    const file = new File(["a"], "a.pdf");
    data.stage3.docs[0].file = file;
    if (failure === "upload") vi.mocked(uploadClientDocument).mockRejectedValueOnce(new Error("upload failed"));
    else vi.mocked(updateClient).mockRejectedValueOnce(new Error("metadata failed"));
    const { result } = renderHook(() => useClientSave());
    await act(async () => {
      const saved = await result.current.saveClient(data, false, undefined, false, true);
      expect(saved).toMatchObject({ success: false, clientId: "client-1" });
      expect(saved.documents).toBeUndefined();
      expect(data.stage3.docs[0].file).toBe(file);
      expect(data.stage3.originalDocuments).toEqual([]);
      expect((await result.current.saveClient(data, false, saved.clientId, false, true)).success).toBe(true);
    });
    expect(createClient).toHaveBeenCalledTimes(1);
  });
  it("still finalizes HHA status when no document changes were made", async () => {
    const data = existing([null, { key: "form485", url: 123 }, { key: "form485", url: "https://example.test/485" }] as unknown as Client["documents"]);
    data.type = "hha";
    const { result } = renderHook(() => useClientSave());
    await act(async () => { await result.current.saveClient(data, true, "client-1", false, false, true); });
    expect(updateClient).toHaveBeenLastCalledWith("client-1", { status: "active" });
    expect(vi.mocked(updateClient).mock.calls.every(([, body]) => !("documents" in body))).toBe(true);
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
});

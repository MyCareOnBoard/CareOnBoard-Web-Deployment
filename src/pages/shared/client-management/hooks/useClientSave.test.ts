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
});

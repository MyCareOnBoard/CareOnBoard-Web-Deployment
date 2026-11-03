import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import { groupFolderFiles } from "./folderImport";
import { cleanNotes, createClientFromFolder, FolderCreateError, nameFromFolder } from "./folderAutoCreate";

const api = vi.hoisted(() => ({
  createClientWithReview: vi.fn(),
  updateClient: vi.fn(),
  uploadClientDocument: vi.fn(),
  extractClientIspViaApi: vi.fn(),
  extractClientHhaPocClinicalViaApi: vi.fn(),
  extractScClientOnboardingViaApi: vi.fn(),
  fetchFirstPlaceDetailsForQuery: vi.fn(),
  handleDocumentUploads: vi.fn(),
}));
vi.mock("@/lib/api/clients", () => ({ createClientWithReview: api.createClientWithReview, updateClient: api.updateClient, uploadClientDocument: api.uploadClientDocument }));
vi.mock("@/lib/api/gemini", () => ({ extractClientIspViaApi: api.extractClientIspViaApi, extractClientHhaPocClinicalViaApi: api.extractClientHhaPocClinicalViaApi, EXTRACT_DOCUMENT_TIMEOUT_MS: 1 }));
vi.mock("@/lib/api/sc-client-extraction", () => ({ extractScClientOnboardingViaApi: api.extractScClientOnboardingViaApi }));
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({ fetchFirstPlaceDetailsForQuery: api.fetchFirstPlaceDetailsForQuery }));
vi.mock("./documentUploadHandler", () => ({ handleDocumentUploads: api.handleDocumentUploads }));

function fileAt(path: string) {
  const file = new File(["%PDF"], path.split("/").pop()!, { type: "application/pdf" });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

const extraction = (draft: ClientExtractionResponse["draft"], warnings: string[] = []): ClientExtractionResponse => ({
  detectedDocumentType: "isp", draft, fieldConfidences: [], warnings: warnings.map(message => ({ message })),
});

const place = { formattedAddress: "12 Maple Ave, Trenton, NJ 08608, USA", street: "12 Maple Ave", line1: "12 Maple Ave", line2: null, city: "Trenton", county: "Mercer County", state: "New Jersey", stateLong: "New Jersey", stateCode: "NJ", zipCode: "08608", country: "United States", countryCode: "US", lat: 40.2, lng: -74.7 };

beforeEach(() => {
  vi.clearAllMocks();
  api.createClientWithReview.mockResolvedValue({ success: true, data: { id: "new-1" } });
  api.handleDocumentUploads.mockResolvedValue([{ key: "isp", url: "https://x" }]);
  api.updateClient.mockResolvedValue({});
  api.fetchFirstPlaceDetailsForQuery.mockResolvedValue(place);
});

describe("createClientFromFolder (DDD)", () => {
  it("creates a pending client from the ISP with tier, Acuity, address and a review marker", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Jane Doe/ISP.pdf")], "ddd");
    api.extractClientIspViaApi.mockResolvedValue(extraction({
      stage1: { firstName: "Jane", lastName: "Doe", dob: "2001-04-05", medicaidId: "123", dddId: "D1", tier: "Tier C", address: "12 Maple Ave" },
      stage3: { acuityRequired: true },
    } as ClientExtractionResponse["draft"], ["Tier C set from the ISP procedure."]));
    const result = await createClientFromFolder(client, "ddd", { folderName: "Intake" });
    expect(result).toMatchObject({ clientId: "new-1", name: "Jane Doe" });
    const payload = api.createClientWithReview.mock.calls[0][0];
    expect(payload).toMatchObject({ firstName: "Jane", lastName: "Doe", tier: "C", type: "ddd", acuityRequirements: { enabled: true, types: [] } });
    expect(payload.status).toBeUndefined();
    expect(payload.importReview).toMatchObject({ source: "folder_upload", folderName: "Intake" });
    expect(payload.importReview.notes).toEqual(expect.arrayContaining([
      "Tier C set from the ISP procedure.",
      expect.stringMatching(/^Acuity was found in the ISP/),
    ]));
    expect(payload.importReview.notes.join(" ")).not.toMatch(/address could not be matched/);
    expect(api.handleDocumentUploads).toHaveBeenCalledWith("new-1", expect.anything());
    expect(api.updateClient).toHaveBeenCalledWith("new-1", { documents: [{ key: "isp", url: "https://x" }] });
  });

  it("uses the folder name when the documents have no name, and flags missing details", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Doe, Jane/scan.pdf")], "ddd");
    api.extractClientIspViaApi.mockResolvedValue(extraction({}));
    const result = await createClientFromFolder(client, "ddd", { folderName: "Intake" });
    expect(api.createClientWithReview.mock.calls[0][0]).toMatchObject({ firstName: "Jane", lastName: "Doe" });
    expect(result.notes[0]).toMatch(/folder name "Doe, Jane" was used/);
    expect(result.notes).toEqual(expect.arrayContaining(["Date of birth was not found in the documents.", "No DDD tier was found."]));
  });

  it("does not create a client when the document cannot be read", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Jane Doe/ISP.pdf")], "ddd");
    api.extractClientIspViaApi.mockRejectedValue(new Error("boom"));
    await expect(createClientFromFolder(client, "ddd", { folderName: "Intake" })).rejects.toBeInstanceOf(FolderCreateError);
    expect(api.createClientWithReview).not.toHaveBeenCalled();
  });

  it("keeps the client when document upload fails, and says so", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Jane Doe/ISP.pdf")], "ddd");
    api.extractClientIspViaApi.mockResolvedValue(extraction({ stage1: { firstName: "Jane", lastName: "Doe" } } as ClientExtractionResponse["draft"]));
    api.handleDocumentUploads.mockRejectedValue(new Error("upload"));
    const result = await createClientFromFolder(client, "ddd", { folderName: "Intake" });
    expect(result.clientId).toBe("new-1");
    expect(result.documentError).toMatch(/did not upload/);
  });
});

describe("createClientFromFolder (review notes)", () => {
  it("drops the stale geocode warning and the repeated Acuity sentence", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Jane Doe/ISP.pdf")], "ddd");
    api.extractClientIspViaApi.mockResolvedValue(extraction({
      stage1: { firstName: "Jane", lastName: "Doe", address: "12 Maple Ave" },
      stage3: { acuityRequired: true },
    } as ClientExtractionResponse["draft"], ["Address present without verified geocode.", "Acuity requirement turned on from the ISP procedure."]));
    const result = await createClientFromFolder(client, "ddd", { folderName: "Intake" });
    expect(result.notes.join(" ")).not.toMatch(/without verified geocode|Acuity was found in the ISP/);
    expect(result.notes).toEqual(expect.arrayContaining(["Acuity requirement turned on from the ISP procedure.", expect.stringMatching(/^Choose Medication, Behavioral, or Both for Acuity/)]));
  });
});

describe("createClientFromFolder (HHA)", () => {
  it("lists authorizations that could not be saved without a staff rate", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/Ann Bell/plan of care.pdf")], "hha");
    api.extractClientHhaPocClinicalViaApi.mockResolvedValue(extraction({
      stage1: { firstName: "Ann", lastName: "Bell" },
      stage2: { hhaAuthorizations: [{ serviceCode: "T1019", serviceName: "Personal care", authorizationNumber: "A-7", approvedHours: "20" }] },
    } as unknown as ClientExtractionResponse["draft"]));
    const result = await createClientFromFolder(client, "hha", { folderName: "Intake", hhaServices: [{ id: "svc-1", code: "T1019", name: "Personal care", type: "hha", program: "hha" }] });
    expect(api.createClientWithReview.mock.calls[0][0].type).toBe("hha");
    expect(result.notes.join(" ")).toMatch(/Not saved, add a staff rate and pay type and re-enter: T1019 auth A-7 20 hrs/);
    expect(result.notes).toEqual(expect.arrayContaining(["Upload the signed Form 485 before activating the client."]));
  });
});

describe("createClientFromFolder (SC)", () => {
  it("creates a pending SC client and attaches every file", async () => {
    const [client] = groupFolderFiles([fileAt("Intake/John Smith/ISP.pdf"), fileAt("Intake/John Smith/letter.pdf")], "sc");
    api.extractScClientOnboardingViaApi.mockResolvedValue({
      detectedDocumentType: "isp", draft: { firstName: "John", lastName: "Smith", dob: "1990-01-02", periodStartDate: "2026-01-01", periodEndDate: "2026-12-31" },
      fieldConfidences: [], warnings: [], sourceDocument: { fileName: "ISP.pdf", mimeType: "application/pdf", fileSize: 4 },
    });
    api.uploadClientDocument.mockResolvedValue({ url: "https://doc", fileName: "f.pdf" });
    const result = await createClientFromFolder(client, "sc", { folderName: "Intake" });
    const payload = api.createClientWithReview.mock.calls[0][0];
    expect(payload).toMatchObject({ type: "ddd", servicePrograms: ["sc"], status: "pending", firstName: "John", lastName: "Smith", dateOfBirth: "1990-01-02", ispPeriod: { startDate: "2026-01-01", endDate: "2026-12-31" } });
    expect(payload.scEnrollment).toBeUndefined();
    expect(api.uploadClientDocument).toHaveBeenCalledTimes(2);
    expect(result.notes.join(" ")).toMatch(/signatures still need to be completed/);
  });
});

describe("helpers", () => {
  it("splits folder names into first and last names", () => {
    expect(nameFromFolder("Jane Ann Doe")).toEqual({ firstName: "Jane", lastName: "Ann Doe" });
    expect(nameFromFolder("Doe, Jane")).toEqual({ firstName: "Jane", lastName: "Doe" });
    expect(nameFromFolder("Jane")).toEqual({ firstName: "Jane", lastName: "" });
  });

  it("dedupes, trims and caps review notes", () => {
    expect(cleanNotes([" a ", "A", "", "b"])).toEqual(["a", "b"]);
    expect(cleanNotes(Array.from({ length: 40 }, (_, i) => `n${i}`))).toHaveLength(30);
    expect(cleanNotes(["x".repeat(400)])[0]).toHaveLength(300);
  });
});

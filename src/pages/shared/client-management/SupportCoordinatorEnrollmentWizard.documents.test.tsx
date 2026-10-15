import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { getAgencyById } from "@/lib/api/agencies";
import { createClient, getAgencyClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
import { extractScClientOnboardingViaApi } from "@/lib/api/sc-client-extraction";
import { SupportCoordinatorEnrollmentWizard } from "./SupportCoordinatorEnrollmentWizard";
import type { ScClientExtractionResponse } from "./types/scClientExtraction";

vi.unmock("react-router");
vi.setConfig({ testTimeout: 20000 });
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { uid: "owner", userType: "agency", agencyId: "agency" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/agencies", () => ({ getAgencyById: vi.fn() }));
vi.mock("@/lib/api/clients", () => ({ createClient: vi.fn(), getAgencyClientById: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
vi.mock("@/lib/api/sc-client-extraction", () => ({ extractScClientOnboardingViaApi: vi.fn() }));
vi.mock("@/lib/api/sc-monitoring-policy", async original => ({ ...await original<typeof import("@/lib/api/sc-monitoring-policy")>(), getScMonitoringPolicy: vi.fn().mockResolvedValue({ policy: { version: 1, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, documentReviewsEnabled: false, documentRemindersEnabled: false, documentReviewIntervals: { ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null } }, timezone: "UTC", canEditPolicy: true }), saveScMonitoringPolicy: vi.fn() }));
vi.mock("./components/forms/AddressAutocompleteField", () => ({ AddressAutocompleteField: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <input aria-label={label} value={value} onChange={event => onChange(event.target.value)} /> }));

const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterAll(() => {
  if (scrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

const savedDocument = { key: "scDocuments", title: "Existing tier letter", category: "Tier", source: "DDD / iRecord", fileName: "Existing.pdf", url: "https://example.test/existing.pdf" } as const;
const client = {
  id: "client-1", firstName: "Alex", lastName: "Example", dateOfBirth: "1990-01-02", dddId: "DDD123", status: "active", phone: "2015550123",
  primaryAddress: { address: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", countyState: "Essex" },
  scOutcomes: [], documents: [savedDocument],
  scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: false, functional: false, financial: false, njResident: false, documents: false, requirements: false }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
} as Client;
const extraction: ScClientExtractionResponse = {
  detectedDocumentType: "njcat", draft: { firstName: "Alex", lastName: "Example", dddId: "DDD123", phone: "2015550123" }, fieldConfidences: [], warnings: [],
  sourceDocument: { fileName: "NJCAT.pdf", mimeType: "application/pdf", fileSize: 8 },
};

beforeEach(() => {
  vi.mocked(getAgencyById).mockResolvedValue({ id: "agency", uid: "owner", timezone: "UTC" } as Awaited<ReturnType<typeof getAgencyById>>);
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockReset().mockResolvedValue(client);
  vi.mocked(createClient).mockReset();
  vi.mocked(uploadClientDocument).mockReset().mockImplementation(async (_id, _type, file) => ({ fileName: file.name, url: `https://example.test/${file.name}` } as Awaited<ReturnType<typeof uploadClientDocument>>));
  vi.mocked(extractScClientOnboardingViaApi).mockReset().mockResolvedValue(extraction);
  URL.createObjectURL = vi.fn(() => "blob:document-preview");
  URL.revokeObjectURL = vi.fn();
});

async function editDocuments() {
  render(<MemoryRouter initialEntries={["/edit/client-1"]}><Routes><Route path="/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} /><Route path="*" element={<p>Saved client details</p>} /></Routes></MemoryRouter>);
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Documents.*Completed/ }));
}

test("Documents is optional and continues to monitoring without uploading any files", async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue({ ...client, documents: [] });
  await editDocuments();
  expect(screen.getByRole("heading", { name: "Documents", level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Monitoring settings", level: 1 })).toBeInTheDocument();
  expect(createClient).not.toHaveBeenCalled();
  expect(updateClient).not.toHaveBeenCalled();
  expect(uploadClientDocument).not.toHaveBeenCalled();
  expect(extractScClientOnboardingViaApi).not.toHaveBeenCalled();
});

function addFiles(...files: File[]) {
  fireEvent.change(screen.getByLabelText("Add client documents"), { target: { files } });
}

async function selectOption(article: HTMLElement, label: string, option: string) {
  fireEvent.keyDown(within(article).getByRole("combobox", { name: label }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

function selectDay(article: HTMLElement, label: string, day: number) {
  fireEvent.click(within(article).getByRole("button", { name: label }));
  const button = within(screen.getByRole("grid")).getAllByRole("button").find(candidate => candidate.textContent === String(day));
  expect(button).toBeDefined();
  fireEvent.click(button!);
}

function saveChanges() {
  fireEvent.click(screen.getByRole("button", { name: /Review & sign.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
}

function continueToDocuments() {
  fireEvent.click(screen.getByRole("button", { name: "Continue editing" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function expectUnknownDates(article: HTMLElement) {
  for (const label of ["Effective date", "Expiry date"]) {
    const picker = within(article).getByRole("button", { name: label });
    expect(within(picker).getByPlaceholderText("Unknown / not provided")).toHaveValue("");
  }
}

test("ordinary uploads keep edited metadata across navigation and append to existing documents only on final Save", async () => {
  await editDocuments();
  const file = new File(["%PDF-1.7"], "Support.pdf", { type: "application/pdf" });
  expect(screen.getByRole("region", { name: "Saved documents" })).toHaveTextContent("Existing tier letter");
  addFiles(file);
  let article = screen.getByRole("article", { name: "Support.pdf document" });
  expectUnknownDates(article);
  fireEvent.change(within(article).getByRole("textbox", { name: "Document name" }), { target: { value: "Community inclusion authorization" } });
  await selectOption(article, "Document type", "PA");
  await selectOption(article, "Source", "DDD / iRecord");
  fireEvent.change(within(article).getByRole("textbox", { name: /Related provider/ }), { target: { value: "Community Agency" } });
  selectDay(article, "Effective date", 10);
  selectDay(article, "Expiry date", 20);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  article = screen.getByRole("article", { name: "Support.pdf document" });
  expect(within(article).getByRole("textbox", { name: "Document name" })).toHaveValue("Community inclusion authorization");
  expect(within(article).getByRole("combobox", { name: "Document type" })).toHaveTextContent("PA");
  expect(within(article).getByRole("combobox", { name: "Source" })).toHaveTextContent("DDD / iRecord");
  expect(within(article).getByRole("textbox", { name: /Related provider/ })).toHaveValue("Community Agency");
  expect(within(article).getByRole("button", { name: "Clear effective date for Support.pdf" })).toBeInTheDocument();
  expect(createClient).not.toHaveBeenCalled();
  expect(updateClient).not.toHaveBeenCalled();
  expect(uploadClientDocument).not.toHaveBeenCalled();
  expect(extractScClientOnboardingViaApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  saveChanges();
  await screen.findByText("Saved client details");
  expect(uploadClientDocument).toHaveBeenCalledTimes(1);
  expect(uploadClientDocument).toHaveBeenCalledWith("client-1", "support-coordination", file);
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  expect(updateClient).toHaveBeenCalledWith("client-1", { documents: [savedDocument, {
    key: "scDocuments", title: "Community inclusion authorization", fileName: "Support.pdf", url: "https://example.test/Support.pdf", category: "PA", source: "DDD / iRecord", provider: "Community Agency", issuedOnDate: `${month}-10`, expiryDate: `${month}-20`,
  }] });
});

test("imported originals appear with detected categories and unknown dates, and removing one retains autofill", async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue({ ...client, phone: "" });
  await editDocuments();
  fireEvent.click(screen.getByRole("button", { name: /^Program selection/ }));
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  const file = new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" });
  fireEvent.change(picker.querySelector('input[type="file"]')!, { target: { files: [file] } });
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  continueToDocuments();
  const article = screen.getByRole("article", { name: "NJCAT.pdf document" });
  expect(within(article).getByRole("combobox", { name: "Document type" })).toHaveTextContent("Assessment");
  expectUnknownDates(article);
  fireEvent.click(within(article).getByRole("button", { name: "Remove NJCAT.pdf attachment" }));
  expect(screen.queryByRole("article", { name: "NJCAT.pdf document" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Participant information/ }));
  expect(screen.getByRole("textbox", { name: /First name/ })).toHaveValue("Alex");
  expect(screen.getByRole("textbox", { name: /DDD client ID/ })).toHaveValue("DDD123");
  expect(screen.getByRole("textbox", { name: /Phone/ })).toHaveValue("2015550123");
  expect(uploadClientDocument).not.toHaveBeenCalled();
});

test("autofill from a queued document starts with that original and keeps one attachment", async () => {
  await editDocuments();
  const file = new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" });
  addFiles(file);
  const article = screen.getByRole("article", { name: "NJCAT.pdf document" });
  fireEvent.change(within(article).getByRole("textbox", { name: "Document name" }), { target: { value: "Reviewed NJCAT" } });
  await selectOption(article, "Document type", "Assessment");
  fireEvent.click(screen.getByRole("button", { name: "Use NJCAT.pdf for autofill" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  expect(within(picker).getByRole("list", { name: "Selected documents" })).toHaveTextContent("NJCAT.pdf");
  expect(extractScClientOnboardingViaApi).not.toHaveBeenCalled();
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  expect(within(review).getByRole("checkbox", { name: "Replace fields I've already filled in" })).not.toBeChecked();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  expect(screen.getAllByRole("article", { name: "NJCAT.pdf document" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  saveChanges();
  await screen.findByText("Saved client details");
  expect(uploadClientDocument).toHaveBeenCalledTimes(1);
  expect(updateClient).toHaveBeenCalledWith("client-1", { documents: [savedDocument, expect.objectContaining({ title: "Reviewed NJCAT", category: "Assessment", fileName: "NJCAT.pdf" })] });
});

test("an expiry before its effective date blocks Continue and final Save until corrected", async () => {
  await editDocuments();
  addFiles(new File(["%PDF-1.7"], "Plan.pdf", { type: "application/pdf" }));
  const article = screen.getByRole("article", { name: "Plan.pdf document" });
  selectDay(article, "Effective date", 20);
  selectDay(article, "Expiry date", 10);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Documents", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/expiry|expiration/i);
  saveChanges();
  expect(screen.getByRole("heading", { name: "Documents", level: 1 })).toBeInTheDocument();
  expect(updateClient).not.toHaveBeenCalled();
  expect(uploadClientDocument).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("article", { name: "Plan.pdf document" })).getByRole("button", { name: "Clear expiry date for Plan.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Monitoring settings", level: 1 })).toBeInTheDocument();
});

test("ordinary file selection keeps supported files and rejects unsupported files without extraction", async () => {
  await editDocuments();
  addFiles(new File(["%PDF-1.7"], "Plan.pdf", { type: "application/pdf" }), new File(["not a document"], "notes.txt", { type: "text/plain" }));
  expect(screen.getByRole("article", { name: "Plan.pdf document" })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "notes.txt document" })).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/PDF|PNG|JPG|JPEG/i);
  expect(extractScClientOnboardingViaApi).not.toHaveBeenCalled();
  expect(uploadClientDocument).not.toHaveBeenCalled();
});

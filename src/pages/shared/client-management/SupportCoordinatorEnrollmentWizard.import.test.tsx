import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { getAgencyById } from "@/lib/api/agencies";
import { getAgencyClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
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

const njcat: ScClientExtractionResponse = {
  detectedDocumentType: "njcat", draft: { firstName: "Alex", lastName: "Example", dob: "1990-01-02", dddId: "DDD123", address: "42 Service Lane", city: "Newark", county: "Essex", state: "NJ", zip: "07102", gender: "male", guardianName: "Sam Example", guardianRelationship: "guardian", phone: "2015550123" }, fieldConfidences: [], warnings: [], sourceDocument: { fileName: "NJCAT.pdf", mimeType: "application/pdf", fileSize: 8 },
};
const client = {
  id: "client-1", firstName: "Alex", lastName: "Example", dateOfBirth: "1990-01-02", dddId: "DDD123", status: "active", phone: "2015550123",
  primaryAddress: { address: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", countyState: "Essex" },
  scOutcomes: [], documents: [{ key: "scDocuments", category: "Other", fileName: "Existing.pdf", url: "https://example.test/existing.pdf" }],
  scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: false, functional: false, financial: false, njResident: false, documents: false, requirements: false }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
} as Client;

beforeEach(() => {
  vi.mocked(extractScClientOnboardingViaApi).mockReset().mockResolvedValue(njcat);
  vi.mocked(getAgencyById).mockResolvedValue({ id: "agency", uid: "owner", timezone: "UTC" } as Awaited<ReturnType<typeof getAgencyById>>);
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockReset().mockResolvedValue(client);
  vi.mocked(uploadClientDocument).mockReset().mockImplementation(async (_id, _type, file) => ({ fileName: file.name, url: `https://example.test/${file.name}` } as Awaited<ReturnType<typeof uploadClientDocument>>));
});

async function importFile(name = "NJCAT.pdf") {
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF-1.7"], name, { type: "application/pdf" })] } });
  const extract = within(dialog).queryByRole("button", { name: "Extract information" });
  if (extract) fireEvent.click(extract);
  return screen.findByRole("dialog", { name: "Review extracted information" });
}

test("reviews NJCAT values before applying, preserves selected program and leaves attestations manual", async () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  const dialog = await importFile();
  expect(within(dialog).getByText("Alex")).toBeInTheDocument();
  expect(within(dialog).getByText("DDD123")).toBeInTheDocument();
  expect(screen.queryByText("Enrolling Alex Example")).not.toBeInTheDocument();
  expect(within(dialog).getByRole("checkbox", { name: "Replace fields I've already filled in" })).not.toBeChecked();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Supports Program SP/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: /First name/ })).toHaveValue("Alex");
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("42 Service Lane");
  expect(screen.getByRole("textbox", { name: "Medicaid ID" })).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("checkbox", { name: "This participant has a legal guardian or authorized representative" })).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("checkbox", { name: /Active NJ Medicaid/ })).not.toBeChecked();
  expect(updateClient).not.toHaveBeenCalled();
});

test("fill-empty preserves entered contact values and replacement requires opting in", async () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), { target: { value: "entered@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  vi.mocked(extractScClientOnboardingViaApi).mockResolvedValue({ ...njcat, draft: { ...njcat.draft, email: "imported@example.test" } });
  let dialog = await importFile();
  expect(within(dialog).getByText("entered@example.test")).toBeInTheDocument();
  expect(within(dialog).getByText("imported@example.test")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue("entered@example.test");
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  dialog = await importFile();
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Replace fields I've already filled in" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue("imported@example.test");
});

test("wrong participant blocks Apply even when replacement is enabled", async () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  fireEvent.change(screen.getByRole("textbox", { name: /First name/ }), { target: { value: "Different" } });
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  const dialog = await importFile();
  expect(within(dialog).getByRole("button", { name: "Apply to form" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Replace fields I've already filled in" }));
  expect(within(dialog).getByRole("button", { name: "Apply to form" })).toBeDisabled();
});

test("sequential imports retain originals with SC categories and existing documents on Save", async () => {
  render(<MemoryRouter initialEntries={["/edit/client-1"]}><Routes><Route path="/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} /><Route path="*" element={<p>Client details</p>} /></Routes></MemoryRouter>);
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  vi.mocked(extractScClientOnboardingViaApi).mockResolvedValue({ ...njcat, draft: { firstName: "Alex", lastName: "Example", dddId: "DDD123" } });
  let dialog = await importFile();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  vi.mocked(extractScClientOnboardingViaApi).mockResolvedValue({ ...njcat, detectedDocumentType: "isp", draft: { firstName: "Alex", lastName: "Example", dddId: "DDD123" } });
  dialog = await importFile("ISP.pdf");
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue editing" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("article", { name: "NJCAT.pdf document" })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "ISP.pdf document" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: /Review & sign.*Completed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(uploadClientDocument).toHaveBeenCalledTimes(2));
  expect(uploadClientDocument).toHaveBeenNthCalledWith(1, "client-1", "support-coordination", expect.objectContaining({ name: "NJCAT.pdf" }));
  await waitFor(() => expect(updateClient).toHaveBeenCalledWith("client-1", { documents: expect.arrayContaining([
    expect.objectContaining({ fileName: "Existing.pdf" }), expect.objectContaining({ fileName: "NJCAT.pdf", category: "Assessment" }), expect.objectContaining({ fileName: "ISP.pdf", category: "ISP" }),
  ]) }));
});

test("removing a pending original keeps reviewed field values", async () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  const dialog = await importFile();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  fireEvent.click(within(picker).getByRole("button", { name: "Remove NJCAT.pdf attachment" }));
  expect(within(picker).queryByRole("button", { name: "Remove NJCAT.pdf attachment" })).not.toBeInTheDocument();
  fireEvent.click(within(picker).getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload document" })).toHaveTextContent("Upload document");
  expect(uploadClientDocument).not.toHaveBeenCalled();
});

test("one selection reviews both ISP and NJCAT before applying complementary fields", async () => {
  vi.mocked(extractScClientOnboardingViaApi).mockImplementation(async file => file.name === "ISP.pdf"
    ? { ...njcat, detectedDocumentType: "isp", draft: { firstName: "Alex", lastName: "Example", dob: "1990-01-02", dddId: "DDD123", program: "SP", email: "participant@example.test" } }
    : njcat);
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  fireEvent.change(picker.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF-1.7"], "ISP.pdf", { type: "application/pdf" }), new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" })] } });
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  expect(extractScClientOnboardingViaApi).toHaveBeenCalledTimes(2);
  expect(within(review).getByText("ISP.pdf", { exact: true })).toBeInTheDocument();
  expect(within(review).getByText("NJCAT.pdf", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText("Enrolling Alex Example")).not.toBeInTheDocument();
  expect(within(review).getByRole("checkbox", { name: "Replace fields I've already filled in" })).not.toBeChecked();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue("participant@example.test");
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("42 Service Lane");
});

test("a failed file is reported beside successful extraction without losing either original", async () => {
  vi.mocked(extractScClientOnboardingViaApi).mockImplementation(async file => {
    if (file.name === "Unreadable.pdf") throw Object.assign(new Error("Unavailable"), { isAxiosError: true, response: { data: { message: "The document could not be read.", extractionJobId: "12345678-1234-4234-8234-123456789012" } } });
    return njcat;
  });
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  fireEvent.change(picker.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" }), new File(["%PDF-1.7"], "Unreadable.pdf", { type: "application/pdf" })] } });
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  const failed = within(review).getByRole("region", { name: "Files without extraction" });
  expect(within(failed).getByText(/Unreadable.pdf/)).toBeInTheDocument();
  expect(within(failed).getByText(/original will attach without autofill/)).toBeInTheDocument();
  expect(within(failed).getByText(/Reference: 12345678-1234-4234-8234-123456789012/)).toBeInTheDocument();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const pending = screen.getByRole("region", { name: "Documents ready to attach" });
  expect(within(pending).getByText("NJCAT.pdf")).toBeInTheDocument();
  expect(within(pending).getByText("Unreadable.pdf")).toBeInTheDocument();
});

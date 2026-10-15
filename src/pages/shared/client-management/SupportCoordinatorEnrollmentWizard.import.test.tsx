import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { getAgencyById } from "@/lib/api/agencies";
import { getAgencyClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
import { extractScClientOnboardingViaApi } from "@/lib/api/sc-client-extraction";
import { fetchFirstPlaceDetailsForQuery, type AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { SupportCoordinatorEnrollmentWizard } from "./SupportCoordinatorEnrollmentWizard";
import type { ScClientExtractionResponse } from "./types/scClientExtraction";

vi.unmock("react-router");
vi.setConfig({ testTimeout: 20000 });
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { uid: "owner", userType: "agency", agencyId: "agency" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/agencies", () => ({ getAgencyById: vi.fn() }));
vi.mock("@/lib/api/clients", () => ({ createClient: vi.fn(), getAgencyClientById: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
vi.mock("@/lib/api/sc-client-extraction", () => ({ extractScClientOnboardingViaApi: vi.fn() }));
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({ fetchFirstPlaceDetailsForQuery: vi.fn() }));
vi.mock("@/lib/api/sc-monitoring-policy", async original => ({ ...await original<typeof import("@/lib/api/sc-monitoring-policy")>(), getScMonitoringPolicy: vi.fn().mockResolvedValue({ policy: { version: 1, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, documentReviewsEnabled: false, documentRemindersEnabled: false, documentReviewIntervals: { ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null } }, timezone: "UTC", canEditPolicy: true }), saveScMonitoringPolicy: vi.fn() }));
vi.mock("./components/forms/AddressAutocompleteField", () => ({ AddressAutocompleteField: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <input aria-label={label} value={value} onChange={event => onChange(event.target.value)} /> }));

const njcat: ScClientExtractionResponse = {
  detectedDocumentType: "njcat", draft: { firstName: "Alex", lastName: "Example", dob: "1990-01-02", dddId: "DDD123", address: "42 Service Ln", city: "Newark", county: "Essex", state: "NJ", zip: "07102", gender: "male", guardianName: "Sam Example", guardianRelationship: "guardian", phone: "2015550123" }, fieldConfidences: [], warnings: [], sourceDocument: { fileName: "NJCAT.pdf", mimeType: "application/pdf", fileSize: 8 },
};
const googleAddress: AddressDetails = { formattedAddress: "42 Service Lane, Newark, NJ 07102, USA", street: "42 Service Lane", line1: "42 Service Lane", line2: null, city: "Newark", county: "Essex County", state: "New Jersey", stateLong: "New Jersey", stateCode: "NJ", zipCode: "07102", country: "United States", countryCode: "US", lat: 40, lng: -74 };
const client = {
  id: "client-1", firstName: "Alex", lastName: "Example", dateOfBirth: "1990-01-02", dddId: "DDD123", status: "active", phone: "2015550123",
  primaryAddress: { address: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", countyState: "Essex" },
  scOutcomes: [], documents: [{ key: "scDocuments", category: "Other", fileName: "Existing.pdf", url: "https://example.test/existing.pdf" }],
  scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: false, functional: false, financial: false, njResident: false, documents: false, requirements: false }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
} as Client;

beforeEach(() => {
  vi.mocked(extractScClientOnboardingViaApi).mockReset().mockResolvedValue(njcat);
  vi.mocked(fetchFirstPlaceDetailsForQuery).mockReset().mockResolvedValue(googleAddress);
  vi.mocked(getAgencyById).mockResolvedValue({ id: "agency", uid: "owner", timezone: "UTC" } as Awaited<ReturnType<typeof getAgencyById>>);
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockReset().mockResolvedValue(client);
  vi.mocked(uploadClientDocument).mockReset().mockImplementation(async (_id, _type, file) => ({ fileName: file.name, url: `https://example.test/${file.name}` } as Awaited<ReturnType<typeof uploadClientDocument>>));
});

async function importFile(name = "NJCAT.pdf") {
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
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
  const addressReview = within(dialog).getByRole("region", { name: "Primary address match for NJCAT.pdf" });
  expect(within(addressReview).getByText("42 Service Ln, Newark, NJ 07102")).toBeInTheDocument();
  expect(within(addressReview).getByText("42 Service Lane, Newark, NJ 07102")).toBeInTheDocument();
  expect(within(addressReview).getByRole("checkbox", { name: "Use this Google address match" })).toBeChecked();
  expect(fetchFirstPlaceDetailsForQuery).toHaveBeenCalledWith("42 Service Ln, Newark, NJ 07102", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Supports Program SP/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: /First name/ })).toHaveValue("Alex");
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("42 Service Lane");
  expect(screen.getByRole("textbox", { name: "County" })).toHaveValue("Essex County");
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
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  fireEvent.click(within(picker).getByRole("button", { name: "Remove NJCAT.pdf attachment" }));
  expect(within(picker).queryByRole("button", { name: "Remove NJCAT.pdf attachment" })).not.toBeInTheDocument();
  fireEvent.click(within(picker).getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Autofill from documents" })).toHaveTextContent("Autofill from documents");
  expect(uploadClientDocument).not.toHaveBeenCalled();
});

test("one selection reviews both ISP and NJCAT before applying complementary fields", async () => {
  vi.mocked(extractScClientOnboardingViaApi).mockImplementation(async file => file.name === "ISP.pdf"
    ? { ...njcat, detectedDocumentType: "isp", draft: { firstName: "Alex", lastName: "Example", dob: "1990-01-02", dddId: "DDD123", program: "SP", email: "participant@example.test" } }
    : njcat);
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
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
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
  const picker = screen.getByRole("dialog", { name: "Import client document" });
  fireEvent.change(picker.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" }), new File(["%PDF-1.7"], "Unreadable.pdf", { type: "application/pdf" })] } });
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  const failed = within(review).getByRole("region", { name: "Files without extraction" });
  expect(within(failed).getByText(/Unreadable.pdf/)).toBeInTheDocument();
  expect(within(failed).getByText(/original will attach without autofill/)).toBeInTheDocument();
  expect(within(failed).getByText(/Reference: 12345678-1234-4234-8234-123456789012/)).toBeInTheDocument();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
  const pending = screen.getByRole("region", { name: "Documents ready to attach" });
  expect(within(pending).getByText("NJCAT.pdf")).toBeInTheDocument();
  expect(within(pending).getByText("Unreadable.pdf")).toBeInTheDocument();
});

test("skipping the Google match applies other information without importing the raw address", async () => {
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  const review = await importFile();
  const match = within(review).getByRole("region", { name: "Primary address match for NJCAT.pdf" });
  fireEvent.click(within(match).getByRole("checkbox", { name: "Use this Google address match" }));
  expect(within(review).queryByText("Street address", { selector: "dt span" })).not.toBeInTheDocument();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  expect(screen.getByText("Enrolling Alex Example")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "Primary address search" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "County" })).toHaveValue("");
});

test("an unavailable Google match leaves the address unchanged while other fields can apply", async () => {
  vi.mocked(fetchFirstPlaceDetailsForQuery).mockResolvedValue(null);
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  const review = await importFile();
  expect(within(review).getByText(/Google Places could not match a complete US address/)).toBeInTheDocument();
  expect(within(review).queryByRole("checkbox", { name: "Use this Google address match" })).not.toBeInTheDocument();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  expect(screen.getByRole("textbox", { name: /First name/ })).toHaveValue("Alex");
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("");
});

test("a Google match preserves the existing address unless replacement is selected", async () => {
  vi.mocked(fetchFirstPlaceDetailsForQuery).mockResolvedValue({ ...googleAddress, line1: "120 Broad Street", street: "120 Broad Street", city: "Trenton", county: "Mercer County", zipCode: "08608" });
  render(<MemoryRouter initialEntries={["/edit/client-1"]}><Routes><Route path="/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} /></Routes></MemoryRouter>);
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  let review = await importFile();
  expect(within(review).getByRole("checkbox", { name: "Replace fields I've already filled in" })).not.toBeChecked();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue editing" }));
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("42 Service Lane");
  expect(screen.getByRole("textbox", { name: "City" })).toHaveValue("Newark");
  expect(screen.getByRole("textbox", { name: "County" })).toHaveValue("Essex");
  fireEvent.click(screen.getByRole("button", { name: /Program selection.*Completed/ }));
  review = await importFile();
  fireEvent.click(within(review).getByRole("checkbox", { name: "Replace fields I've already filled in" }));
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue editing" }));
  expect(screen.getByRole("textbox", { name: "Street address" })).toHaveValue("120 Broad Street");
  expect(screen.getByRole("textbox", { name: "City" })).toHaveValue("Trenton");
  expect(screen.getByRole("textbox", { name: "County" })).toHaveValue("Mercer County");
  expect(screen.getByRole("textbox", { name: "ZIP code" })).toHaveValue("08608");
});

test("closing during Google matching cancels the lookup and ignores its late result", async () => {
  let finishMatch!: (details: AddressDetails) => void;
  vi.mocked(fetchFirstPlaceDetailsForQuery).mockImplementation(() => new Promise(resolve => { finishMatch = resolve; }));
  render(<MemoryRouter><SupportCoordinatorEnrollmentWizard /></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
  const picker = screen.getByRole("dialog");
  fireEvent.change(picker.querySelector('input[type="file"]')!, { target: { files: [new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" })] } });
  fireEvent.click(within(picker).getByRole("button", { name: "Extract information" }));
  await waitFor(() => expect(fetchFirstPlaceDetailsForQuery).toHaveBeenCalledOnce());
  const signal = vi.mocked(fetchFirstPlaceDetailsForQuery).mock.calls[0][1]?.signal;
  fireEvent.click(within(picker).getByRole("button", { name: "Cancel" }));
  expect(signal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Autofill from documents" }));
  await act(async () => { finishMatch(googleAddress); });
  expect(screen.getByRole("dialog", { name: "Import client document" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Review extracted information" })).not.toBeInTheDocument();
  expect(screen.queryByText("Enrolling Alex Example")).not.toBeInTheDocument();
});

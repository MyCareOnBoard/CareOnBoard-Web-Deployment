import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import type { AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { getAgencyById } from "@/lib/api/agencies";
import { createClient, getAgencyClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
import { getScMonitoringPolicy, saveScMonitoringPolicy, type MonitoringPolicyResponse } from "@/lib/api/sc-monitoring-policy";
import { SupportCoordinatorEnrollmentWizard } from "./SupportCoordinatorEnrollmentWizard";

const { toast, auth } = vi.hoisted(() => ({ toast: vi.fn(), auth: { user: { uid: "owner", userType: "agency", agencyId: "agency" } } }));
vi.setConfig({ testTimeout: 20000 });
vi.unmock("react-router");
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/utils/auth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/api/agencies", () => ({ getAgencyById: vi.fn() }));
vi.mock("@/lib/api/clients", () => ({ createClient: vi.fn(), getAgencyClientById: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
vi.mock("@/lib/api/sc-monitoring-policy", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api/sc-monitoring-policy")>(), getScMonitoringPolicy: vi.fn(), saveScMonitoringPolicy: vi.fn() }));
vi.mock("./components/forms/AddressAutocompleteField", () => ({
  AddressAutocompleteField: ({ label, value, onChange, onSelectDetails }: { label: string; value: string; onChange: (value: string) => void; onSelectDetails?: (details: AddressDetails) => void }) => <div><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} /><button type="button" onClick={() => onSelectDetails?.({ formattedAddress: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", street: "Service Lane", line2: null, city: "Newark", county: "Essex", state: "NJ", stateLong: "New Jersey", stateCode: "NJ", zipCode: "07102", country: "US", countryCode: "US", lat: 40, lng: -74 })}>Use sample address</button></div>,
}));
vi.mock("@/pages/applicant/application/components/DigitalSignature", () => ({
  default: ({ onSave, setIsOpen }: { onSave: (payload: { signatureType: string; signatureData: string }) => Promise<void>; setIsOpen: (open: boolean) => void }) => <button type="button" onClick={async () => { await onSave({ signatureType: "type", signatureData: "data:image/png;base64,YQ==" }); setIsOpen(false); }}>Capture test signature</button>,
}));

const off: MonitoringPolicyResponse = {
  policy: { version: 1, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, documentReviewsEnabled: false, documentRemindersEnabled: false, documentReviewIntervals: { ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null }, activatedAt: null, updatedAt: null, updatedBy: null },
  timezone: "UTC", canEditPolicy: true,
};
const client = {
  id: "real-1", firstName: "Alex", lastName: "Example", dateOfBirth: "1990-01-02", status: "active",
  primaryAddress: { address: "42 Service Lane, Newark, NJ 07102", line1: "42 Service Lane", city: "Newark", state: "NJ", postalCode: "07102", countyState: "Essex" },
  scOutcomes: [],
  scEnrollment: { program: "SP", hasGuardian: false, familyMemberParticipates: false, eligibility: { medicaid: true, functional: true, financial: true, njResident: true, documents: true, requirements: true }, agreementSummaryReviewed: true, participantSignature: "Alex Example", participantSignatureImage: "data:image/png;base64,YQ==", signedOn: "2026-01-01" },
} as Client;

beforeEach(() => {
  vi.resetAllMocks();
  auth.user = { uid: "owner", userType: "agency", agencyId: "agency" };
  vi.mocked(getAgencyById).mockResolvedValue({ id: "agency", uid: "owner", timezone: "UTC" } as Awaited<ReturnType<typeof getAgencyById>>);
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(createClient).mockResolvedValue(client);
  vi.mocked(updateClient).mockResolvedValue(client);
  vi.mocked(uploadClientDocument).mockResolvedValue({ url: "https://example.com/photo.png", fileName: "photo.png" } as Awaited<ReturnType<typeof uploadClientDocument>>);
  vi.mocked(getScMonitoringPolicy).mockResolvedValue(off);
  vi.mocked(saveScMonitoringPolicy).mockResolvedValue({ ...off, policy: { ...off.policy, revision: 1 } });
  URL.createObjectURL = vi.fn(() => "blob:client-photo");
  URL.revokeObjectURL = vi.fn();
});

function wizard(edit = false) {
  return <MemoryRouter initialEntries={[edit ? "/agency/clients/edit/real-1" : "/agency/clients/add"]}><Routes>
    <Route path="/agency/clients/add" element={<SupportCoordinatorEnrollmentWizard />} />
    <Route path="/agency/clients/edit/:clientId" element={<SupportCoordinatorEnrollmentWizard isEditMode />} />
    <Route path="/agency/clients/:clientId" element={<p>Saved client details</p>} />
    <Route path="/agency/clients" element={<p>Client list</p>} />
  </Routes></MemoryRouter>;
}
function chooseDate(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
  const day = within(screen.getByRole("grid")).getAllByRole("button").find(button => !(button as HTMLButtonElement).disabled);
  expect(day).toBeDefined();
  fireEvent.click(day!);
}
async function newMonitoring({ photo = false } = {}) {
  const view = render(wizard());
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Supports Program SP/ }));
  fireEvent.click(screen.getByRole("button", { name: "Get started" }));
  fireEvent.change(screen.getByRole("textbox", { name: /First name/ }), { target: { value: "Alex" } });
  fireEvent.change(screen.getByRole("textbox", { name: /Last name/ }), { target: { value: "Example" } });
  chooseDate("Date of birth");
  fireEvent.click(screen.getByRole("button", { name: "Use sample address" }));
  if (photo) fireEvent.change(screen.getByLabelText("Client photo"), { target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Monitoring settings" })).toBeInTheDocument();
  await screen.findByLabelText("Enable monitoring contact schedules");
  return view;
}
async function editMonitoring() {
  render(wizard(true));
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Monitoring settings/ }));
  await screen.findByLabelText("Enable monitoring contact schedules");
}
function enableContacts(reason?: string) {
  fireEvent.click(screen.getByLabelText("Enable monitoring contact schedules"));
  fireEvent.change(screen.getByLabelText("Rolling interval (days)"), { target: { value: "30" } });
  fireEvent.click(screen.getByLabelText("In person"));
  if (reason) fireEvent.change(screen.getByLabelText("Reason for this change"), { target: { value: reason } });
}
async function newReview() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Enrollment agreement" })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("I have reviewed the enrollment overview"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Full name/ }), { target: { value: "Alex Example" } });
  fireEvent.click(screen.getByRole("button", { name: "Participant signature" }));
  fireEvent.click(await screen.findByRole("button", { name: "Capture test signature" }));
  await waitFor(() => expect(screen.getByRole("img", { name: "Participant signature" })).toBeInTheDocument());
  chooseDate("Date");
}
function editReview() {
  fireEvent.click(screen.getByRole("button", { name: /Review & sign/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
}

test("monitoring is the fifth of seven steps before agreement and signatures", async () => {
  render(wizard());
  await act(async () => {});
  const steps = within(screen.getByRole("navigation", { name: "Enrollment steps" })).getAllByRole("button");
  expect(steps).toHaveLength(7);
  expect(steps[4]).toHaveTextContent("Monitoring settings");
  expect(steps[5]).toHaveTextContent("Enrollment agreement");
  expect(steps[6]).toHaveTextContent("Review & sign");
  expect(screen.getByText("0 of 7 steps completed")).toBeInTheDocument();
  expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
});

test("a new enrollment can leave every setting off without writing a policy", async () => {
  await newMonitoring();
  for (const label of ["Enable monitoring contact schedules", "Send reminders to the assigned SC", "Enable recurring document reviews", "Send document review reminders to the assigned SC"]) expect(screen.getByLabelText(label)).not.toBeChecked();
  await newReview();
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  await screen.findByText("Saved client details");
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  expect(vi.mocked(createClient).mock.calls[0][0]).not.toHaveProperty("monitoringSettings");
});

test("contact and document changes remain a local draft while visiting earlier steps", async () => {
  await newMonitoring();
  enableContacts();
  fireEvent.click(screen.getByLabelText("Send reminders to the assigned SC"));
  fireEvent.click(screen.getByLabelText("Enable recurring document reviews"));
  fireEvent.change(screen.getByLabelText("ISP review interval (days)"), { target: { value: "90" } });
  fireEvent.click(screen.getByLabelText("Send document review reminders to the assigned SC"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  expect(screen.getByLabelText("Rolling interval (days)")).toHaveValue(30);
  expect(screen.getByLabelText("ISP review interval (days)")).toHaveValue(90);
  expect(screen.getByLabelText("Send document review reminders to the assigned SC")).toBeChecked();
  expect(createClient).not.toHaveBeenCalled();
  expect(updateClient).not.toHaveBeenCalled();
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
});

test("initial settings save only after the client is acknowledged with an automatic setup reason", async () => {
  await newMonitoring();
  enableContacts();
  fireEvent.click(screen.getByLabelText("Enable recurring document reviews"));
  fireEvent.change(screen.getByLabelText("ISP review interval (days)"), { target: { value: "90" } });
  await newReview();
  let finishCreate!: (value: Client) => void;
  vi.mocked(createClient).mockImplementationOnce(() => new Promise(resolve => { finishCreate = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  await act(async () => finishCreate(client));
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenCalledWith("real-1", expect.objectContaining({ expectedRevision: 0, enabled: true, intervalDays: 30, qualifyingMethods: ["in_person"], documentReviewsEnabled: true, documentReviewIntervals: { ISP: 90, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null }, changeReason: "Initial monitoring setup during enrollment" })));
  expect(vi.mocked(createClient).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(saveScMonitoringPolicy).mock.invocationCallOrder[0]);
});

test("unchanged saved settings are loaded authoritatively and are not written again", async () => {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, timezone: "America/New_York", policy: { ...off.policy, revision: 8, enabled: true, intervalDays: 45, qualifyingMethods: ["phone"], remindersEnabled: true } });
  await editMonitoring();
  expect(screen.getByText("America/New_York")).toBeInTheDocument();
  expect(screen.getByLabelText("Rolling interval (days)")).toHaveValue(45);
  expect(screen.getByLabelText("Phone")).toBeChecked();
  editReview();
  await screen.findByText("Saved client details");
  expect(updateClient).toHaveBeenCalledTimes(1);
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
});

test("a failed edit-policy load blocks saving until the owner explicitly reloads", async () => {
  vi.mocked(getScMonitoringPolicy).mockRejectedValueOnce(new Error("Unavailable"));
  render(wizard(true));
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Monitoring settings/ }));
  expect(await screen.findByText(/Monitoring policy could not be loaded/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Enable monitoring contact schedules")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Review & sign/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(updateClient).not.toHaveBeenCalled();
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Monitoring settings/ }));
  fireEvent.click(screen.getByRole("button", { name: "Reload policy" }));
  expect(await screen.findByLabelText("Enable monitoring contact schedules")).not.toBeChecked();
});

test("edit monitoring shows the skeleton while its separate policy request is pending", async () => {
  let finishLoad!: (value: MonitoringPolicyResponse) => void;
  vi.mocked(getScMonitoringPolicy).mockImplementationOnce(() => new Promise(resolve => { finishLoad = resolve; }));
  render(wizard(true));
  await screen.findByText("Editing Alex Example");
  fireEvent.click(screen.getByRole("button", { name: /Monitoring settings/ }));
  expect(screen.getByRole("status", { name: "Loading monitoring settings" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Enable monitoring contact schedules")).not.toBeInTheDocument();
  await act(async () => finishLoad(off));
  expect(await screen.findByLabelText("Enable monitoring contact schedules")).toBeInTheDocument();
});

test("policy permission wins over owner-looking auth and still allows other enrollment changes", async () => {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, canEditPolicy: false });
  await editMonitoring();
  expect(screen.getByText("Only the agency owner can change monitoring rules.")).toBeInTheDocument();
  expect(screen.getByLabelText("Enable monitoring contact schedules")).toBeDisabled();
  expect(screen.getByLabelText("ISP review interval (days)")).toBeDisabled();
  editReview();
  await screen.findByText("Saved client details");
  expect(updateClient).toHaveBeenCalledTimes(1);
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
});

test("new-client settings are read-only when the agency owner UID does not match auth", async () => {
  auth.user = { uid: "staff", userType: "agency", agencyId: "agency" };
  await newMonitoring();
  expect(screen.getByLabelText("Enable monitoring contact schedules")).toBeDisabled();
  expect(screen.getByLabelText("Enable recurring document reviews")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  await newReview();
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  await screen.findByText("Saved client details");
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
});

test("an edited configuration requires a reason before final client save", async () => {
  await editMonitoring();
  enableContacts();
  editReview();
  expect(updateClient).not.toHaveBeenCalled();
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Monitoring settings" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Reason for this change"), { target: { value: "Monthly contact schedule" } });
  editReview();
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenCalledWith("real-1", expect.objectContaining({ expectedRevision: 0, intervalDays: 30, changeReason: "Monthly contact schedule" })));
});

test("missing agency timezone prevents enabling schedules but permits an all-off enrollment", async () => {
  vi.mocked(getAgencyById).mockResolvedValue({ id: "agency", uid: "owner" } as Awaited<ReturnType<typeof getAgencyById>>);
  await newMonitoring();
  expect(screen.getByRole("link", { name: "View agency time zone" })).toBeInTheDocument();
  expect(screen.getByLabelText("Enable monitoring contact schedules")).toBeDisabled();
  expect(screen.getByLabelText("Enable recurring document reviews")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  await newReview();
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  await screen.findByText("Saved client details");
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
});

test("policy failure retains the saved client and retries settings without repeating client or photo writes", async () => {
  await newMonitoring({ photo: true });
  enableContacts();
  await newReview();
  vi.mocked(saveScMonitoringPolicy).mockRejectedValueOnce(new Error("Network unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  expect(await screen.findByText("Client saved; monitoring settings were not saved.")).toBeInTheDocument();
  expect(screen.queryByText("Saved client details")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /saved client|client record/i })).toHaveAttribute("href", "/agency/clients/real-1");
  const updates = vi.mocked(updateClient).mock.calls.length;
  const reads = vi.mocked(getScMonitoringPolicy).mock.calls.length;
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(uploadClientDocument).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(2));
  expect(getScMonitoringPolicy).toHaveBeenCalledTimes(reads + 1);
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(updateClient).toHaveBeenCalledTimes(updates);
  expect(uploadClientDocument).toHaveBeenCalledTimes(1);
});

test("a lost policy-save response is reconciled without reposting an already matching configuration", async () => {
  await newMonitoring();
  enableContacts();
  fireEvent.click(screen.getByLabelText("Phone"));
  await newReview();
  vi.mocked(saveScMonitoringPolicy).mockRejectedValueOnce(new Error("Response lost"));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  await screen.findByText("Client saved; monitoring settings were not saved.");
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, policy: { ...off.policy, revision: 1, enabled: true, intervalDays: 30, qualifyingMethods: ["phone", "in_person"] } });
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await screen.findByText("Saved client details");
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(1);
});

test("a stale revision keeps the owner's draft and reason until explicit reapplication", async () => {
  await editMonitoring();
  enableContacts("Use a monthly schedule");
  vi.mocked(saveScMonitoringPolicy).mockRejectedValueOnce({ response: { status: 409 } });
  editReview();
  await screen.findByText("Client saved; monitoring settings were not saved.");
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, policy: { ...off.policy, revision: 2, enabled: true, intervalDays: 60, qualifyingMethods: ["phone"] } });
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  const reapply = await screen.findByRole("button", { name: "Reapply my draft" });
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rolling interval (days)")).toHaveValue(30);
  expect(screen.getByLabelText("Reason for this change")).toHaveValue("Use a monthly schedule");
  fireEvent.click(reapply);
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenLastCalledWith("real-1", expect.objectContaining({ expectedRevision: 2, intervalDays: 30, qualifyingMethods: ["in_person"], changeReason: "Use a monthly schedule" })));
  expect(updateClient).toHaveBeenCalledTimes(1);
});

test("an unknown client-create result disables resubmission and directs the owner to the list", async () => {
  await newMonitoring();
  enableContacts();
  await newReview();
  vi.mocked(createClient).mockRejectedValueOnce(new Error("Response lost"));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit enrollment" })).toBeDisabled());
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Retry monitoring settings" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Back to clients|Back to client list/ }));
  await screen.findByText("Client list");
});

test("duplicate submits while client creation is pending issue one client request", async () => {
  await newMonitoring();
  enableContacts();
  await newReview();
  let finishCreate!: (value: Client) => void;
  vi.mocked(createClient).mockImplementationOnce(() => new Promise(resolve => { finishCreate = resolve; }));
  const form = screen.getByRole("button", { name: "Submit enrollment" }).closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(createClient).toHaveBeenCalledTimes(1);
  await act(async () => finishCreate(client));
  await screen.findByText("Saved client details");
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(1);
});

test("unmount during client creation prevents later attachment and policy writes", async () => {
  const view = await newMonitoring({ photo: true });
  enableContacts();
  await newReview();
  let finishCreate!: (value: Client) => void;
  vi.mocked(createClient).mockImplementationOnce(() => new Promise(resolve => { finishCreate = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  view.unmount();
  await act(async () => finishCreate(client));
  expect(uploadClientDocument).not.toHaveBeenCalled();
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
});

test("an auth-scope change during creation prevents policy writes for the previous account", async () => {
  const view = await newMonitoring();
  enableContacts();
  await newReview();
  let finishCreate!: (value: Client) => void;
  vi.mocked(createClient).mockImplementationOnce(() => new Promise(resolve => { finishCreate = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Submit enrollment" }));
  auth.user = { uid: "another-owner", userType: "agency", agencyId: "another-agency" };
  view.rerender(wizard());
  await act(async () => finishCreate(client));
  expect(saveScMonitoringPolicy).not.toHaveBeenCalled();
  expect(screen.queryByText("Saved client details")).not.toBeInTheDocument();
});

test("policy retries reload restored timezone before validating a retained enabled draft", async () => {
  await editMonitoring();
  enableContacts("Monthly schedule");
  vi.mocked(saveScMonitoringPolicy).mockRejectedValueOnce(new Error("Unavailable"));
  editReview();
  await screen.findByText("Client saved; monitoring settings were not saved.");
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, timezone: null });
  const reads = vi.mocked(getScMonitoringPolicy).mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await waitFor(() => expect(getScMonitoringPolicy).toHaveBeenCalledTimes(reads + 1));
  await screen.findByRole("link", { name: "View agency time zone" });
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Rolling interval (days)")).toHaveValue(30);
  expect(screen.getByRole("button", { name: "Retry monitoring settings" })).toBeEnabled();
  vi.mocked(getScMonitoringPolicy).mockResolvedValue(off);
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await screen.findByText("Saved client details");
  expect(getScMonitoringPolicy).toHaveBeenCalledTimes(reads + 2);
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(2);
  expect(updateClient).toHaveBeenCalledTimes(1);
});

test("policy retries reload restored owner permission without repeating the saved client update", async () => {
  await editMonitoring();
  enableContacts("Monthly schedule");
  vi.mocked(saveScMonitoringPolicy).mockRejectedValueOnce(new Error("Unavailable"));
  editReview();
  await screen.findByText("Client saved; monitoring settings were not saved.");
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ ...off, canEditPolicy: false });
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await screen.findByText("Only the agency owner can change monitoring rules.");
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Retry monitoring settings" })).toBeEnabled();
  vi.mocked(getScMonitoringPolicy).mockResolvedValue(off);
  fireEvent.click(screen.getByRole("button", { name: "Retry monitoring settings" }));
  await screen.findByText("Saved client details");
  expect(saveScMonitoringPolicy).toHaveBeenCalledTimes(2);
  expect(updateClient).toHaveBeenCalledTimes(1);
});

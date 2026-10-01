import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, startOfWeek } from "date-fns";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ user: { uid: 'owner', userType: 'agency', agencyId: 'a', profile: {} } as any }));
const removeClient = vi.hoisted(() => vi.fn());
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: auth.user }) }));
beforeEach(() => { auth.user = { uid: 'owner', userType: 'agency', agencyId: 'a', profile: {} }; vi.mocked(updateClient).mockReset(); removeClient.mockReset(); toast.mockClear(); });
vi.unmock("react-router");
vi.mock("@/lib/api/clients", () => {
  const updateClient = vi.fn();
  return { getAgencyClientById: vi.fn(), updateClient, useDeleteClientMutation: () => [(args: unknown) => ({ unwrap: () => removeClient(args) })], uploadClientDocument: vi.fn(), useUpdateClientMutation: () => [({ clientId, data }: { clientId: string; data: unknown }) => ({ unwrap: async () => { const result = await updateClient(clientId, data); return { success: true, data: result, assessmentHistoryEntry: result?.assessmentHistoryEntry }; } })] };
});
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/api/sc-agency-monitoring", () => ({
  getAgencyMonitoringOverview: vi.fn().mockResolvedValue({ clientId: 'real-monitor', timezone: 'UTC', canUpdateFollowUps: true,
    lastContactAt: null, activeFollowUpCount: 0, nextFollowUpDueDate: null,
    activeFollowUps: { items: [], nextCursor: null }, contacts: { items: [], nextCursor: null } }),
  listAgencyMonitoringFollowUps: vi.fn(), listAgencyMonitoringContacts: vi.fn(),
}));
import { getAgencyClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";
import { getAgencyMonitoringOverview } from "@/lib/api/sc-agency-monitoring";
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
const hasPointerCapture = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hasPointerCapture");
const setPointerCapture = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "setPointerCapture");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: () => {} });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: () => false });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: () => {} });
});
afterAll(() => {
  if (scrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  if (hasPointerCapture) Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", hasPointerCapture);
  else Reflect.deleteProperty(HTMLElement.prototype, "hasPointerCapture");
  if (setPointerCapture) Object.defineProperty(HTMLElement.prototype, "setPointerCapture", setPointerCapture);
  else Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
});

const pendingClient = { id: 'pending-client', agencyId: 'a', firstName: 'Alex', lastName: 'Example', status: 'pending', servicePrograms: ['sc'] } as Client;
const pendingSchedule = { status: 'not_applicable' as const, clientStatus: 'pending', nextMonitoringDueDate: null, overdueDays: null, policyRevision: 1, timezone: 'UTC', evaluatedAt: '', latestQualifyingContactAt: null, latestQualifyingContactId: null, intervalDays: null, qualifyingMethods: null, requireDirectContact: null };
const pendingOverview = { clientId: 'pending-client', timezone: 'UTC', canUpdateFollowUps: true, hasAssignedCoordinator: true, lastContactAt: null, activeFollowUpCount: 0, nextFollowUpDueDate: null, activeFollowUps: { items: [], nextCursor: null }, contacts: { items: [], nextCursor: null }, monitoringSchedule: pendingSchedule };
const activationPage = () => <MemoryRouter initialEntries={['/agency/clients/pending-client?tab=information']}><Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /><Route path="/agency/clients" element={<p>Client list</p>} /></Routes></MemoryRouter>;

it('opens Client Information first by default and keeps sample clients read-only', () => {
  render(<MemoryRouter initialEntries={['/agency/clients/182441']}><Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Client Information' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('heading', { name: 'Client Information' })).toBeInTheDocument();
  expect(screen.getByText(/Preview only. These sample details/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit Client' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete client' })).not.toBeInTheDocument();
});

it('explains pending enrollment using the saved client status with older schedule responses', async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  vi.mocked(getAgencyMonitoringOverview).mockResolvedValueOnce({ ...pendingOverview, monitoringSchedule: { ...pendingSchedule, clientStatus: undefined } });
  render(<MemoryRouter initialEntries={['/agency/clients/pending-client?tab=monitoring']}><Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Monitoring starts when this client is activated' })).toBeInTheDocument();
});

it('confirms activation, shows a loader, and refreshes monitoring with the saved status', async () => {
  const user = userEvent.setup();
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  vi.mocked(getAgencyMonitoringOverview).mockResolvedValueOnce({ ...pendingOverview, monitoringSchedule: { ...pendingSchedule, status: 'overdue', clientStatus: 'active', nextMonitoringDueDate: '2026-10-01', overdueDays: 1 } });
  let finish!: (client: Client) => void;
  vi.mocked(updateClient).mockClear().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  toast.mockClear();
  render(activationPage());
  expect(await screen.findByRole('heading', { name: 'Client Information' })).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Client details tabs' })).getAllByRole('link')[0]).toHaveTextContent('Client Information');
  expect(within(screen.getByRole('heading', { name: 'Alex Example' }).closest('header')!).queryByRole('button', { name: 'Edit Client' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Activate client' }));
  expect(updateClient).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Activate this client?' });
  await user.click(within(dialog).getByRole('button', { name: 'Activate client' }));
  const saving = within(dialog).getByRole('button', { name: 'Saving…' });
  expect(saving).toBeDisabled();
  expect(dialog).toHaveAttribute('aria-busy', 'true');
  expect(saving.querySelector('.animate-spin')).toBeInTheDocument();
  expect(updateClient).toHaveBeenCalledWith('pending-client', { status: 'active' });
  await act(async () => finish({ ...pendingClient, status: 'active' }));
  await user.click(screen.getByRole('link', { name: 'Monitoring' }));
  expect(await screen.findByRole('heading', { name: 'Monitoring contact overdue' })).toBeInTheDocument();
  expect(screen.getByText('active')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activate client' })).not.toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Client activated', variant: 'success' }));
});

it('keeps pending status and shows an error when activation cannot be confirmed', async () => {
  const user = userEvent.setup();
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  vi.mocked(updateClient).mockClear().mockRejectedValueOnce(new Error('Network error'));
  toast.mockClear();
  render(activationPage());
  await user.click(await screen.findByRole('button', { name: 'Activate client' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate client' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Refresh this page');
  expect(screen.getByRole('button', { name: 'Activate client' })).toBeDisabled();
  expect(screen.getAllByText('pending')[0]).toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not confirm client change', variant: 'destructive' }));
});

it.each([
  { userType: 'super_admin', agencyId: 'a', profile: {} },
  { userType: 'agency_staff', agencyId: 'a', profile: { accessList: [], agencyModes: ['sc'] } },
  { userType: 'agency_staff', agencyId: 'a', profile: { accessList: ['Client Management'], agencyModes: ['ddd'] } },
  { userType: 'agency', agencyId: 'other', profile: {} },
  { userType: 'agency', agencyId: 'a', profile: { isActive: false } },
])('does not offer activation to a restricted actor: %j', async actor => {
  auth.user = { uid: 'actor', ...actor };
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  render(activationPage());
  expect(await screen.findByRole('heading', { name: 'Alex Example' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activate client' })).not.toBeInTheDocument();
});

it('allows authorized SC client-management staff and lets them cancel without a write', async () => {
  auth.user = { uid: 'staff', userType: 'agency_staff', agencyId: 'a', profile: { accessList: ['Client Management'], agencyModes: ['sc'] } };
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  vi.mocked(updateClient).mockClear();
  const user = userEvent.setup();
  render(activationPage());
  await user.click(await screen.findByRole('button', { name: 'Activate client' }));
  expect(screen.queryByRole('button', { name: 'Delete client' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Not now' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(updateClient).not.toHaveBeenCalled();
});

it.each([
  ['active', 'Deactivate client', 'inactive', 'Client deactivated'],
  ['inactive', 'Activate client', 'active', 'Client activated'],
] as const)('changes %s client status through the existing API after confirmation', async (status, label, next, title) => {
  vi.mocked(getAgencyClientById).mockResolvedValue({ ...pendingClient, status });
  vi.mocked(updateClient).mockResolvedValue({ ...pendingClient, status: next });
  const user = userEvent.setup();
  render(activationPage());
  await user.click(await screen.findByRole('button', { name: label }));
  expect(updateClient).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }));
  await waitFor(() => expect(updateClient).toHaveBeenCalledWith('pending-client', { status: next }));
  expect(screen.getAllByText(next)[0]).toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title, variant: 'success' }));
});

it('uses the existing delete mutation and returns to the client list after archiving', async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  removeClient.mockResolvedValue({ success: true, message: 'Client deleted successfully' });
  const user = userEvent.setup();
  render(activationPage());
  await user.click(await screen.findByRole('button', { name: 'Delete client' }));
  expect(screen.getByText(/archive the client and remove them from active client lists/)).toBeInTheDocument();
  expect(removeClient).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete client' }));
  expect(await screen.findByText('Client list')).toBeInTheDocument();
  expect(removeClient).toHaveBeenCalledWith({ clientId: 'pending-client', agencyId: 'a' });
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Client deleted', variant: 'success' }));
});

it('keeps a confirmed status change when the user switches tabs during saving', async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  let finish!: (client: Client) => void;
  vi.mocked(updateClient).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup();
  render(activationPage());
  await user.click(await screen.findByRole('button', { name: 'Activate client' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate client' }));
  // Simulate navigation that unmounts the modal, such as browser history.
  fireEvent.click(screen.getByRole('link', { name: 'Planning', hidden: true }));
  await act(async () => finish({ ...pendingClient, status: 'active' }));
  expect(screen.getByText('active')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Client Information' }));
  expect(screen.getByRole('button', { name: 'Deactivate client' })).toBeInTheDocument();
});

it.each(['archived'] as const)('does not activate clients with status %s', async status => {
  vi.mocked(getAgencyClientById).mockResolvedValue({ ...pendingClient, status });
  render(activationPage());
  expect(await screen.findByRole('heading', { name: 'Alex Example' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activate client' })).not.toBeInTheDocument();
});

it('ignores an activation response after the actor scope changes', async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue(pendingClient);
  let finish!: (client: Client) => void;
  vi.mocked(updateClient).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  toast.mockClear();
  const user = userEvent.setup();
  const { rerender } = render(activationPage());
  await user.click(await screen.findByRole('button', { name: 'Activate client' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate client' }));
  auth.user = { uid: 'reviewer', userType: 'super_admin', agencyId: 'a', profile: {} };
  rerender(activationPage());
  expect((await screen.findAllByText('pending'))[0]).toBeInTheDocument();
  await act(async () => finish({ ...pendingClient, status: 'active' }));
  expect(screen.queryByText('active')).not.toBeInTheDocument();
  expect(toast).not.toHaveBeenCalled();
});

it('routes real SC clients to saved monitoring records instead of the sample calendar', async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue({ id: 'real-monitor', firstName: 'Alex', lastName: 'Example', servicePrograms: ['sc'] } as Client);
  render(<MemoryRouter initialEntries={['/agency/clients/real-monitor?tab=monitoring']}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Client monitoring' })).toBeInTheDocument();
  expect(getAgencyMonitoringOverview).toHaveBeenCalledWith('real-monitor', expect.any(AbortSignal));
  expect(screen.queryByRole('button', { name: 'Choose monitoring date' })).not.toBeInTheDocument();
  expect(screen.queryByText('PA Missing')).not.toBeInTheDocument();
});

it("keeps the client header while routing tabs through the query parameter", async () => {
  const user = userEvent.setup();
  function Location() { const location = useLocation(); return <output data-testid="location">{location.search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=profile-isp"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activate client' })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "DDD Assessment & Determination" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Assessment & Tier" })).toHaveAttribute("aria-current", "page");
  await user.click(screen.getByRole("button", { name: "View NJCAT Document" }));
  const dialog = screen.getByRole("dialog", { name: "NJCAT Assessment" });
  expect(within(dialog).getAllByText("02/23/2026")).toHaveLength(2);
  expect(within(dialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "NJCAT Assessment" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View Tier Letter Document" }));
  const tierDialog = screen.getByRole("dialog", { name: "Tier Letter — Tier D" });
  expect(within(tierDialog).getByText("DDD / iRecord")).toBeInTheDocument();
  expect(within(tierDialog).getByText("TierLetter_Alexander_2026.pdf")).toBeInTheDocument();
  expect(within(tierDialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(tierDialog).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026" }));
  const currentHistory = screen.getByRole("dialog", { name: "NJCAT — 2026" });
  expect(within(currentHistory).getByText("T. Booker")).toBeInTheDocument();
  expect(within(currentHistory).getByText(/Annual reassessment\. Tier D confirmed/)).toBeInTheDocument();
  await user.click(within(currentHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2023" }));
  const oldHistory = screen.getByRole("dialog", { name: "NJCAT — 2023" });
  expect(within(oldHistory).getByText("Historical")).toBeInTheDocument();
  expect(within(oldHistory).getByText("04/11/2023")).toBeInTheDocument();
  await user.click(within(oldHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "No, information is pending" }));
  expect(screen.getByRole("heading", { name: "Data Lineage" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Section A — NJCAT Status" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Planning" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Monitoring" }));
  expect(screen.getByTestId("location")).toHaveTextContent("?tab=monitoring");
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Monitoring" })).toBeInTheDocument();
});

it("shows a saved ISP period in planning", async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue({
    id: "period-client", firstName: "Alex", lastName: "Example",
    ispPeriod: { startDate: "2026-09-01", endDate: "2027-08-31" },
  } as Client);
  render(<MemoryRouter initialEntries={["/agency/clients/period-client?tab=planning"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.getAllByText("09/01/2026 – 08/31/2027")).toHaveLength(2);
});

it("submits a real client's DDD assessment and keeps the saved selections", async () => {
  const user = userEvent.setup();
  const client = {
    id: "real-assessment", firstName: "Alex", lastName: "Example", tier: "C", scAssessmentHistory: [],
    scAssessment: {
      answer: "yes", njcatStatus: "Available", assessmentDate: "2026-09-20",
      assessmentSource: "DDD / State record", determinationDate: "2026-09-21",
      effectiveDate: "2026-09-22", tierLetterAvailable: "Yes",
    },
  } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockResolvedValue({
    ...client, tier: "D", scAssessmentHistory: [
      { id: "legacy", assessment: client.scAssessment!, tier: "C", submittedAt: "", submittedBy: "" },
    ],
    assessmentHistoryEntry: { id: "new", assessment: client.scAssessment!, tier: "D", submittedAt: "2026-09-28T12:00:00.000Z", submittedBy: "staff" },
  } as Client);
  vi.mocked(updateClient).mockClear();
  render(<MemoryRouter initialEntries={["/agency/clients/real-assessment?tab=assessment"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Yes, I have information" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("combobox", { name: "NJCAT Status" })).toHaveTextContent("Available");
  expect(screen.getByDisplayValue("Sep 20, 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled();
  expect(screen.getByRole("heading", { name: "Assessment History / Timeline" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026" }));
  const history = screen.getByRole("dialog", { name: "NJCAT — 2026" });
  expect(within(history).getByText("09/20/2026")).toBeInTheDocument();
  expect(within(history).getByText("Tier C")).toBeInTheDocument();
  await user.click(within(history).getByRole("button", { name: "Close" }));
  expect(screen.getByText("No NJCAT document recorded.")).toBeInTheDocument();
  expect(screen.getByText("No tier letter recorded.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "No, information is pending" }));
  expect(screen.queryByRole("button", { name: "Submit assessment" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Yes, I have information" }));
  await user.click(screen.getByRole("combobox", { name: "Tier" }));
  await user.click(screen.getByRole("option", { name: "Tier D" }));
  expect(screen.getByRole("button", { name: "Submit assessment" })).toBeEnabled();
  await user.click(screen.getByRole("combobox", { name: "Tier" }));
  await user.click(screen.getByRole("option", { name: "Tier C" }));
  expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled();
  await user.click(screen.getByRole("combobox", { name: "Tier" }));
  await user.click(screen.getByRole("option", { name: "Tier D" }));
  await user.click(screen.getByRole("button", { name: "Submit assessment" }));
  expect(updateClient).toHaveBeenCalledWith("real-assessment", {
    tier: "D",
    scAssessment: client.scAssessment,
  });
  expect(screen.getByRole("combobox", { name: "Tier" })).toHaveTextContent("Tier D");
  expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled();
  expect(screen.getByRole("heading", { name: "Assessment History / Timeline" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /View NJCAT history for 2026, entry/ })).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026, entry 1" }));
  expect(within(screen.getByRole("dialog", { name: "NJCAT — 2026" })).getByText("Tier D")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026, entry 2" }));
  expect(within(screen.getByRole("dialog", { name: "NJCAT — 2026" })).getByText("Tier C")).toBeInTheDocument();
}, 15000);

it("shows a real client's uploaded assessment and tier letter in their matching sections", async () => {
  const user = userEvent.setup();
  const client = {
    id: "real-documents", firstName: "Alex", lastName: "Example", tier: "D",
    scAssessment: { answer: "yes", njcatStatus: "Available", assessmentDate: "2026-09-22", assessmentSource: "Document provided to SCA", determinationDate: "2026-09-22", effectiveDate: "2026-09-22", tierLetterAvailable: "Yes" },
    documents: [
      { key: "scDocuments", category: "Other", fileName: "Unrelated.pdf", url: "https://example.com/other.pdf" },
      { key: "scDocuments", category: "Assessment", fileName: "NJCAT_Example.pdf", url: "https://example.com/njcat.pdf", source: "DDD / State record", issuedOnDate: "2026-09-15" },
      { key: "scDocuments", category: "Tier", fileName: "TierLetter_Example.pdf", url: "https://example.com/tier.pdf" },
      { key: "scDocuments", category: "Assessment", fileName: "Unsafe.pdf", url: "javascript:alert(1)" },
    ],
  } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  render(<MemoryRouter initialEntries={["/agency/clients/real-documents?tab=assessment"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Yes, I have information" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("combobox", { name: "NJCAT Status" })).toHaveTextContent("Available");
  expect(screen.getByRole("combobox", { name: "Assessment Source" })).toHaveTextContent("Document provided to SCA");
  expect(screen.getByRole("combobox", { name: "Tier Letter Available?" })).toHaveTextContent("Yes");
  await user.click(screen.getByRole("button", { name: "View NJCAT Document" }));
  const njcatDetails = screen.getByRole("dialog", { name: "NJCAT Assessment" });
  expect(within(njcatDetails).getByText("NJCAT_Example.pdf")).toBeInTheDocument();
  expect(within(njcatDetails).getAllByText("On file")).toHaveLength(2);
  expect(within(njcatDetails).getByText("Effective Date").nextElementSibling).toHaveTextContent("09/15/2026");
  expect(within(njcatDetails).getByText("Source").nextElementSibling).toHaveTextContent("DDD / State record");
  expect(within(njcatDetails).queryByTitle("NJCAT Assessment preview")).not.toBeInTheDocument();
  await user.click(within(njcatDetails).getByRole("button", { name: "Preview NJCAT_Example.pdf" }));
  const njcatPreview = screen.getByRole("dialog", { name: "NJCAT Assessment" });
  expect(within(njcatPreview).getByTitle("NJCAT Assessment preview")).toHaveAttribute("src", "https://example.com/njcat.pdf#toolbar=0&navpanes=0");
  await user.click(within(njcatPreview).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View Tier Letter Document" }));
  const tierDetails = screen.getByRole("dialog", { name: "Tier Letter — Tier D" });
  expect(within(tierDetails).getByText("TierLetter_Example.pdf")).toBeInTheDocument();
  expect(within(tierDetails).getByText("Effective Date").nextElementSibling).toHaveTextContent("Not recorded");
  expect(within(tierDetails).getByText("Source").nextElementSibling).toHaveTextContent("Not recorded");
  expect(within(tierDetails).queryByTitle("Tier Letter preview")).not.toBeInTheDocument();
  await user.click(within(tierDetails).getByRole("button", { name: "Preview TierLetter_Example.pdf" }));
  const tierPreview = screen.getByRole("dialog", { name: "Tier Letter" });
  expect(within(tierPreview).getByTitle("Tier Letter preview")).toHaveAttribute("src", "https://example.com/tier.pdf#toolbar=0&navpanes=0");
  expect(screen.getByText("NJCAT_Example.pdf")).toBeInTheDocument();
  expect(screen.getByText("TierLetter_Example.pdf")).toBeInTheDocument();
  expect(screen.queryByText("Unrelated.pdf")).not.toBeInTheDocument();
  expect(screen.queryByText("Unsafe.pdf")).not.toBeInTheDocument();
  expect(screen.queryByText("SC Verified")).not.toBeInTheDocument();
});

it("keeps saved assessment decisions when current documents are on file", async () => {
  const user = userEvent.setup();
  vi.mocked(getAgencyClientById).mockResolvedValue({
    id: "saved-assessment", firstName: "Alex", lastName: "Example",
    scAssessment: { answer: "pending", njcatStatus: "Pending", assessmentSource: "Not selected", tierLetterAvailable: "Pending" },
    documents: [
      { key: "scDocuments", category: "Assessment", fileName: "NJCAT.pdf", url: "https://example.com/njcat.pdf", source: "DDD / State record" },
      { key: "scDocuments", category: "Tier", fileName: "Tier.pdf", url: "https://example.com/tier.pdf" },
    ],
  } as Client);
  render(<MemoryRouter initialEntries={["/agency/clients/saved-assessment?tab=assessment"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "No, information is pending" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Yes, I have information" }));
  expect(screen.getByRole("combobox", { name: "NJCAT Status" })).toHaveTextContent("Pending");
  expect(screen.getByRole("combobox", { name: "Assessment Source" })).toHaveTextContent("Not selected");
  expect(screen.getByRole("combobox", { name: "Tier Letter Available?" })).toHaveTextContent("Pending");
});

it("does not infer availability from expired assessment documents", async () => {
  vi.mocked(getAgencyClientById).mockResolvedValue({
    id: "expired-assessment", firstName: "Alex", lastName: "Example",
    documents: [
      { key: "scDocuments", category: "Assessment", fileName: "NJCAT.pdf", url: "https://example.com/njcat.pdf", expiryDate: "2020-01-01" },
      { key: "scDocuments", category: "Tier", fileName: "Tier.pdf", url: "https://example.com/tier.pdf", expiryDate: "2020-01-01" },
    ],
  } as Client);
  render(<MemoryRouter initialEntries={["/agency/clients/expired-assessment?tab=assessment"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "No, information is pending" })).toHaveAttribute("aria-pressed", "true");
});

it("opens the ISP quality checklist and keeps the preview review on the page", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: /ISP Quality Review Pre-finalization checklist Open/ }));
  const dialog = screen.getByRole("dialog", { name: "ISP Quality Review Checklist" });
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(8);
  await user.click(within(dialog).getByRole("checkbox", { name: "Plan is person-centered and reflects individual preferences and goals" }));
  expect(within(dialog).getByText("1 of 8 items confirmed")).toBeInTheDocument();
  await user.type(within(dialog).getByRole("textbox", { name: "Reviewer's name*" }), "T. Booker");
  await user.click(within(dialog).getByRole("button", { name: "Save review" }));
  expect(within(dialog).getByRole("textbox", { name: "Corrections note*" })).toBeInTheDocument();
  await user.type(within(dialog).getByRole("textbox", { name: "Corrections note*" }), "Confirm remaining documents.");
  await user.click(within(dialog).getByRole("button", { name: "Save review" }));
  expect(screen.queryByRole("dialog", { name: "ISP Quality Review Checklist" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /ISP Quality Review.*Saved in this preview/ })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /ISP Quality Review.*Saved in this preview/ }));
  expect(screen.getByRole("dialog", { name: "ISP Quality Review Checklist" })).toHaveTextContent("1 of 8 items confirmed");
});

it("opens the participant rights record and keeps its preview entries on the page", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: /Participant Rights Rights & Responsibilities record Open/ }));
  const dialog = screen.getByRole("dialog", { name: "Participant Rights & Responsibilities" });
  expect(within(dialog).getByText("Rights include the right to:")).toBeInTheDocument();
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(3);
  expect(within(dialog).getByRole("button", { name: "Date of birth" })).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Participant or representative signature" })).toBeInTheDocument();
  await user.click(within(dialog).getByRole("checkbox", { name: "Presented to participant / representative" }));
  await user.click(within(dialog).getByRole("button", { name: "Save record" }));
  expect(screen.getByRole("button", { name: /Participant Rights.*Saved in this preview/ })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Participant Rights.*Saved in this preview/ }));
  const reopened = screen.getByRole("dialog", { name: "Participant Rights & Responsibilities" });
  expect(within(reopened).getByRole("checkbox", { name: "Presented to participant / representative" })).toBeChecked();
  expect(within(reopened).getByRole("button", { name: "Participant or representative signature" })).toBeInTheDocument();
});

it("shows sample service authorizations and responds to service actions", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Service Authorization" })).toBeInTheDocument();
  const services = screen.getAllByRole("article");
  expect(services).toHaveLength(3);
  expect(within(services[0]).getByRole("heading", { name: "Individual supports" })).toBeInTheDocument();
  expect(within(services[0]).getByText("90 hrs/week")).toBeInTheDocument();
  const missingPa = within(services[1]).getByText("Missing");
  expect(missingPa.parentElement).toHaveTextContent("PA: Missing");
  expect(missingPa).toHaveClass("text-[#c52236]");
  expect(within(services[0]).getAllByText("Received")[0].parentElement).toHaveTextContent("PA: Received");
  expect(within(services[2]).getByText("Review")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add service" }));
  const addService = screen.getByRole("dialog", { name: "Add service" });
  expect(within(addService).getByRole("textbox", { name: "Service code" })).toBeInTheDocument();
  expect(within(addService).getByRole("spinbutton", { name: "Total authorized units" })).toHaveAttribute("placeholder", "e.g. 120 total units");
  expect(within(addService).getByRole("combobox", { name: "Unit" })).toBeInTheDocument();
  await user.click(within(addService).getByRole("button", { name: "Cancel" }));
  await user.click(within(services[0]).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "View details" }));
  const detail = screen.getByRole("dialog", { name: "Individual supports" });
  expect(detail).toHaveTextContent("Madu Sarah");
  expect(detail).toHaveTextContent("551.312.8522");
  expect(within(detail).getAllByRole("row")).toHaveLength(6);
  expect(detail).toHaveTextContent("Received · Effective 03/24/2026");
  await user.click(within(detail).getByRole("button", { name: "View PA document for Aug 10–16" }));
  expect(detail).toHaveTextContent("Sample PA document for Aug 10–16 is not available yet.");
  await user.click(within(detail).getByRole("button", { name: "Close" }));
  await user.click(within(services[1]).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "View details" }));
  expect(screen.getByRole("dialog", { name: "Community Inclusion Services" })).toHaveTextContent("No prior authorization history recorded.");
});

it("edits and deletes a sample service in the local preview", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  await user.click(within(screen.getAllByRole("article")[0]).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Edit service" }));
  const dialog = screen.getByRole("dialog", { name: "Edit service" });
  expect(within(dialog).getByRole("textbox", { name: "Service name" })).toHaveValue("Individual supports");
  expect(within(dialog).getByRole("spinbutton", { name: "Total authorized units" })).toHaveValue(90);
  await user.clear(within(dialog).getByRole("textbox", { name: "Service name" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "Updated supports");
  await user.click(within(dialog).getByRole("button", { name: "Edit service" }));
  const updated = screen.getAllByRole("article")[0];
  expect(within(updated).getByRole("heading", { name: "Updated supports" })).toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Service updated in preview", variant: "success" }));
  await user.click(within(updated).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete service" }));
  expect(screen.getByText("Delete Updated supports from this preview? This action cannot be undone.")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete service" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Delete service" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

it("adds a service to the local preview with total units and a selected unit", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  await user.click(screen.getByRole("button", { name: "Add service" }));
  const dialog = screen.getByRole("dialog", { name: "Add service" });
  await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "Community coaching");
  await user.type(within(dialog).getByRole("textbox", { name: "Service code" }), "H2020");
  await user.type(within(dialog).getByRole("textbox", { name: "Provider / Agency" }), "Sample Agency");
  await user.click(within(dialog).getByRole("button", { name: "Start date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "End date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Total authorized units" }), "120");
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Unit" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Hourly" }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Rate" }), "9.85");
  await user.click(within(dialog).getByRole("button", { name: "Add service" }));

  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(4);
  expect(within(cards[3]).getByRole("heading", { name: "Community coaching" })).toBeInTheDocument();
  expect(cards[3]).toHaveTextContent("120 total · Hourly");
  expect(cards[3]).toHaveTextContent("$1,182.00");
  expect(cards[3]).toHaveTextContent("Source: Local preview");
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Service added to preview", variant: "success" }));
}, 15000);

it("saves a real client's service under its outcome", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  const client = { id: "real-1", firstName: "Alex", lastName: "Example", servicePrograms: ["sc"], scOutcomes: [{ id: "outcome-1", statement: "Join activities", services: [] }] } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  let finishSave!: (value: Client) => void;
  vi.mocked(updateClient).mockImplementation(() => new Promise<Client>(resolve => { finishSave = resolve; }));
  render(<MemoryRouter initialEntries={["/agency/clients/real-1?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  expect(screen.getByRole("status", { name: "Loading client details" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit Client" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add service" }));
  const dialog = screen.getByRole("dialog", { name: "Add service" });
  expect(within(dialog).getByRole("combobox", { name: "ISP outcome *" })).toHaveValue("outcome-1");
  await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "Community coaching");
  await user.type(within(dialog).getByRole("textbox", { name: "Service code" }), "H2020");
  await user.type(within(dialog).getByRole("textbox", { name: "Provider / Agency" }), "Sample Agency");
  await user.click(within(dialog).getByRole("button", { name: "Start date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "End date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Total authorized units" }), "120");
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Unit" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Hourly" }));
  await user.type(within(dialog).getByRole("spinbutton", { name: "Rate" }), "9.85");
  await user.click(within(dialog).getByRole("button", { name: "Add service" }));
  const saveButton = within(dialog).getByRole("button", { name: "Saving…" });
  expect(saveButton).toBeDisabled();
  expect(saveButton).toHaveAttribute("aria-busy", "true");
  expect(saveButton.querySelector("svg.animate-spin")).toBeInTheDocument();
  expect(toast).not.toHaveBeenCalled();
  await act(async () => finishSave(undefined as unknown as Client));
  expect(updateClient).toHaveBeenCalledWith("real-1", { scOutcomes: [expect.objectContaining({ id: "outcome-1", services: [expect.objectContaining({ name: "Community coaching", code: "H2020" })] })] });
  expect(await screen.findByRole("heading", { name: "Community coaching" })).toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Service added", variant: "success" }));
}, 15000);

it("edits a real service, moves it between outcomes, and deletes it", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  const client = { id: "real-2", firstName: "Sam", lastName: "Example", servicePrograms: ["sc"], scOutcomes: [
    { id: "outcome-1", statement: "Join activities", services: [{ id: "service-1", name: "Coaching", code: "H2020", provider: "Provider", startAuthDate: "2026-09-28", endAuthDate: "2026-10-28", totalUnits: "12", unitType: "Hourly", clientRate: "9.85", frequency: "Weekly", narrative: "Keep this detail" }] },
    { id: "outcome-2", statement: "Build skills", services: [] },
  ] } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  vi.mocked(updateClient).mockResolvedValue(undefined as unknown as Client);
  render(<MemoryRouter initialEntries={["/agency/clients/real-2?tab=services"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  const card = await screen.findByRole("article");
  await user.click(within(card).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Edit service" }));
  const dialog = screen.getByRole("dialog", { name: "Edit service" });
  expect(within(dialog).getByRole("textbox", { name: "Service name" })).toHaveValue("Coaching");
  expect(within(dialog).getByRole("spinbutton", { name: "Total authorized units" })).toHaveValue(12);
  await user.clear(within(dialog).getByRole("textbox", { name: "Service name" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "Updated coaching");
  await user.selectOptions(within(dialog).getByRole("combobox", { name: "ISP outcome *" }), "outcome-2");
  await user.click(within(dialog).getByRole("button", { name: "Edit service" }));
  await waitFor(() => expect(updateClient).toHaveBeenCalledWith("real-2", { scOutcomes: [
    expect.objectContaining({ id: "outcome-1", services: [] }),
    expect.objectContaining({ id: "outcome-2", services: [expect.objectContaining({ id: "service-1", name: "Updated coaching", narrative: "Keep this detail" })] }),
  ] }));
  const updated = await screen.findByRole("article");
  const outcomeLabel = within(updated).getByText("Outcome");
  expect(outcomeLabel.nextElementSibling).toHaveTextContent("Build skills");
  expect(outcomeLabel.parentElement?.parentElement?.firstElementChild).toBe(outcomeLabel.parentElement);
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Service updated", variant: "success" }));
  await user.click(within(updated).getByRole("button", { name: "Actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete service" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete service" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Delete service" }));
  await waitFor(() => expect(updateClient).toHaveBeenLastCalledWith("real-2", { scOutcomes: [
    expect.objectContaining({ id: "outcome-1", services: [] }),
    expect.objectContaining({ id: "outcome-2", services: [] }),
  ] }));
  expect(screen.getByText("No service authorizations recorded yet.")).toBeInTheDocument();
}, 15000);

it("handles monitoring dates, follow-up tasks, and service monitoring in the local preview", async () => {
  const user = userEvent.setup();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=monitoring"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByText(format(today, "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(today, "EEEE, MMMM d, yyyy") })).toHaveAttribute("aria-current", "date");
  expect(screen.getByRole("button", { name: format(weekStart, "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: format(addDays(weekStart, 6), "EEEE, MMMM d, yyyy") })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next week" }));
  expect(screen.getByText(format(addDays(today, 7), "EEE, MMMM d"))).toBeInTheDocument();
  expect(screen.getByText("No services scheduled for this date.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Previous week" }));

  await user.click(screen.getByRole("button", { name: "Follow up" }));
  const followUp = screen.getByRole("dialog", { name: "Follow-Up: Missing PA (Aug 10–16)" });
  expect(within(followUp).getByRole("button", { name: "Create follow-up task" })).toBeDisabled();
  fireEvent.keyDown(within(followUp).getByRole("combobox", { name: "Follow-Up Method" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Phone call" }));
  await user.click(within(followUp).getByRole("button", { name: "Create follow-up task" }));
  expect(screen.queryByRole("dialog", { name: "Follow-Up: Missing PA (Aug 10–16)" })).not.toBeInTheDocument();
  expect(screen.getByText("3 Pending")).toBeInTheDocument();
  expect(screen.getByText("Missing PA follow-up task created · Phone call")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Start monitoring" }));
  const monitoring = screen.getByRole("dialog", { name: "Individual Supports" });
  await user.click(within(monitoring).getByRole("button", { name: "Save monitoring record" }));
  expect(within(monitoring).getByRole("alert")).toHaveTextContent("Answer each monitoring question");
  for (const question of ["Service Delivery", "Client Satisfaction", "Goal Alignment"]) {
    const fieldset = within(monitoring).getByRole("group", { name: new RegExp(question) });
    await user.click(within(fieldset).getByRole("button", { name: "Yes" }));
  }
  await user.click(within(monitoring).getByRole("button", { name: "Save monitoring record" }));
  expect(screen.queryByRole("dialog", { name: "Individual Supports" })).not.toBeInTheDocument();
  expect(screen.getByText("Completed today")).toBeInTheDocument();
  expect(screen.getByText("Individual Supports monitoring recorded")).toBeInTheDocument();
}, 15000);

it("shows sample documents and adds an uploaded document to the local preview", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=documents"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Document Control" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("row")).toHaveLength(7);
  expect(within(table).getByText("NJ ISP — Plan 10.04")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Upload document" }));
  const dialog = screen.getByRole("dialog", { name: "Upload document" });
  await user.upload(within(dialog).getByLabelText("Document file"), new File(["sample"], "sample.pdf", { type: "application/pdf" }));
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Document type" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Assessment" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Document name" }), "Follow-up assessment");
  await user.click(within(dialog).getByRole("button", { name: "Effective date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "Upload & save" }));

  expect(screen.queryByRole("dialog", { name: "Upload document" })).not.toBeInTheDocument();
  expect(within(table).getAllByRole("row")).toHaveLength(8);
  expect(within(table).getByText("Follow-up assessment")).toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Document added to preview", variant: "success" }));
}, 15000);

it("uploads a real client's document and saves its metadata", async () => {
  const user = userEvent.setup();
  toast.mockClear();
  const client = { id: "real-doc", firstName: "Alex", lastName: "Example", servicePrograms: ["sc"], documents: [] } as Client;
  vi.mocked(getAgencyClientById).mockResolvedValue(client);
  let finishUpload!: (value: Awaited<ReturnType<typeof uploadClientDocument>>) => void;
  vi.mocked(uploadClientDocument).mockImplementation(() => new Promise(resolve => { finishUpload = resolve; }));
  vi.mocked(updateClient).mockResolvedValue(undefined as unknown as Client);
  render(<MemoryRouter initialEntries={["/agency/clients/real-doc?tab=documents"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<SupportCoordinatorClientDetailsPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Alex Example" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Upload document" }));
  const dialog = screen.getByRole("dialog", { name: "Upload document" });
  const file = new File(["test"], "plan.pdf", { type: "application/pdf" });
  await user.upload(within(dialog).getByLabelText("Document file"), file);
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Document type" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "ISP" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Document name" }), "Current plan");
  await user.click(within(dialog).getByRole("button", { name: "Effective date" }));
  await user.click(screen.getByRole("button", { name: /^Today,/ }));
  await user.click(within(dialog).getByRole("button", { name: "Upload & save" }));
  const saveButton = within(dialog).getByRole("button", { name: "Saving…" });
  expect(saveButton).toBeDisabled();
  expect(saveButton).toHaveAttribute("aria-busy", "true");
  expect(saveButton.querySelector("svg.animate-spin")).toBeInTheDocument();
  expect(toast).not.toHaveBeenCalled();
  await act(async () => finishUpload({ fileName: "plan.pdf", fileSize: 4, fileType: "application/pdf", url: "https://example.com/plan.pdf", storagePath: "test/plan.pdf", uploadedAt: "2026-09-28T00:00:00Z" }));
  expect(uploadClientDocument).toHaveBeenCalledWith("real-doc", "support-coordination", file);
  expect(updateClient).toHaveBeenCalledWith("real-doc", { documents: [expect.objectContaining({ key: "scDocuments", category: "ISP", title: "Current plan", url: "https://example.com/plan.pdf" })] });
  await user.click(await screen.findByRole("button", { name: "Current plan" }));
  const preview = screen.getByRole("dialog", { name: "Current plan" });
  expect(within(preview).getByTitle("Current plan preview")).toHaveAttribute("src", "https://example.com/plan.pdf#toolbar=0&navpanes=0");
  await user.click(within(preview).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "Current plan" })).not.toBeInTheDocument();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Document uploaded", variant: "success" }));
}, 15000);

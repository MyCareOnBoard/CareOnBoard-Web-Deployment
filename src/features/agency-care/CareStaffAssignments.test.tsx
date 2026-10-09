import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareGrant, type CareMember, type CareNetwork, type CareStaffRoster } from "@/lib/api/agencyCare";
import { CareStaffAssignments } from "./CareStaffAssignments";

const fixtures = vi.hoisted(() => ({
  toast: vi.fn(),
  context: { uid: "owner", organization: { id: "provider", kind: "internal", name: "Provider agency", role: "administrator" } },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: fixtures.toast }) }));
vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: () => fixtures.context }));
vi.mock("@/lib/api/agencyCare", () => ({ agencyCareApi: { grants: vi.fn(), networkMembers: vi.fn(), relationships: vi.fn(), grant: vi.fn() } }));

const agencyKey = "internal:provider";
const network: CareNetwork = {
  id: "network", client: { id: "client", name: "John Client" },
  sourceClient: { clientId: "client", agencyId: "sc-source", program: "sc" },
  lifecycle: "active", revision: 1, reviewer: false,
  capabilities: ["view", "send", "submit", "manage"],
};
const person: CareMember = {
  uid: "jordan", name: "Jordan Reed", agencyKey, employeeId: "employee-jordan", jobRole: "Direct support professional",
  status: "active", eligibleCareRoles: ["dsp", "agency_contact"], allowedCapabilities: ["view", "send", "submit"],
  grantRevision: 4, assignment: null,
};
function roster(overrides: Partial<CareStaffRoster> = {}): CareStaffRoster {
  return { items: [person], nextCursor: null, relationshipRevision: 7, primaryContactUid: null, allowedCapabilities: ["view", "send", "submit"], ...overrides };
}
function grant(overrides: Partial<CareGrant> = {}): CareGrant {
  return { ...person, revision: 5, state: "active", careRole: "dsp", capabilities: ["view", "send"], isPrimaryContact: true, ...overrides };
}
function mount(currentNetwork = network, props = {}) {
  const refreshNetwork = vi.fn();
  const result = render(<MemoryRouter><CareStaffAssignments network={currentNetwork} agencyKey={agencyKey} scope="owner|provider|network" refreshNetwork={refreshNetwork} {...props} /></MemoryRouter>);
  return { ...result, refreshNetwork };
}
async function openNew() {
  fireEvent.click(await screen.findByRole("button", { name: "Assign staff" }));
  const dialog = within(await screen.findByRole("dialog"));
  const candidate = await dialog.findByRole("radio", { name: "Select Jordan Reed" });
  // The real dialog Link must share the production react-router context.
  expect(dialog.getByRole("link", { name: "Manage agency employees" })).toHaveAttribute("href", "/agency/dsp-management");
  const body = candidate.closest<HTMLDivElement>(".ac-dialog-body")!;
  body.scrollTop = 360;
  fireEvent.click(candidate);
  expect(body.scrollTop).toBe(0);
  return dialog;
}
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.context.uid = "owner";
  fixtures.context.organization.kind = "internal";
  fixtures.context.organization.role = "administrator";
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.networkMembers).mockResolvedValue(roster());
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [{ agencyKey, name: "Provider agency", state: "active", revision: 7, members: [] }], nextCursor: null });
  vi.mocked(agencyCareApi.grant).mockResolvedValue(grant());
});

it("assigns one verified provider employee with care role, bounded access, optional contact and both revisions", async () => {
  const { refreshNetwork } = mount();
  const dialog = await openNew();
  expect(dialog.queryByRole("option", { name: "Support Coordinator" })).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("radio", { name: /Contribute/ }));
  fireEvent.click(dialog.getByRole("checkbox", { name: /Primary contact/ }));
  fireEvent.click(dialog.getByRole("button", { name: "Assign staff" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenCalledWith("network", "jordan", expect.objectContaining({
    employeeId: "employee-jordan", careRole: "dsp", capabilities: ["view", "send", "submit"], isPrimaryContact: true,
    expectedRevision: 4, expectedRelationshipRevision: 7, operationId: expect.any(String),
  }), expect.objectContaining({ agencyKey, signal: expect.any(AbortSignal) })));
  await waitFor(() => expect(refreshNetwork).toHaveBeenCalledOnce());
  expect(fixtures.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Staff assigned", variant: "success" }));
});

it("keeps roster continuation available after an empty search page and debounces keypresses", async () => {
  vi.mocked(agencyCareApi.networkMembers).mockImplementation(async (_id, options) => options?.query === "Jordan" && !options.cursor
    ? roster({ items: [], nextCursor: "search-next" }) : roster({ allowedCapabilities: ["view"] }));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Assign staff" }));
  const dialog = within(await screen.findByRole("dialog"));
  await dialog.findByRole("radio", { name: "Select Jordan Reed" });
  const count = vi.mocked(agencyCareApi.networkMembers).mock.calls.length;
  fireEvent.change(dialog.getByRole("searchbox"), { target: { value: "Jordan" } });
  fireEvent.keyDown(dialog.getByRole("searchbox"), { key: "Enter" });
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
  expect(agencyCareApi.networkMembers).toHaveBeenCalledTimes(count);
  expect(await dialog.findByText("No matching staff on this page")).toBeVisible();
  fireEvent.click(dialog.getByRole("button", { name: "Next page" }));
  fireEvent.click(await dialog.findByRole("radio", { name: "Select Jordan Reed" }));
  expect(dialog.getByRole("radio", { name: /View only/ })).toBeChecked();
  expect(dialog.queryByRole("radio", { name: /Contribute/ })).not.toBeInTheDocument();
  expect(dialog.queryByRole("radio", { name: /View and message/ })).not.toBeInTheDocument();
  expect(agencyCareApi.networkMembers).toHaveBeenCalledWith("network", expect.objectContaining({ query: "Jordan", cursor: "search-next" }));
});

it("retains a conflicting draft and rechecks permissions without silently increasing or retaining disallowed access", async () => {
  vi.mocked(agencyCareApi.grant).mockRejectedValueOnce({ response: { status: 409 } }).mockResolvedValue(grant());
  mount();
  const dialog = await openNew();
  fireEvent.click(dialog.getByRole("radio", { name: /Contribute/ }));
  fireEvent.click(dialog.getByRole("button", { name: "Assign staff" }));
  const refresh = await dialog.findByRole("button", { name: "Refresh permissions" });
  expect(dialog.getByRole("radio", { name: /Contribute/ })).toBeChecked();
  expect(dialog.getByRole("button", { name: "Assign staff" })).toBeDisabled();
  vi.mocked(agencyCareApi.networkMembers).mockResolvedValue(roster({ relationshipRevision: 8, allowedCapabilities: ["view"] }));
  fireEvent.click(refresh);
  await waitFor(() => expect(dialog.queryByRole("button", { name: "Refresh permissions" })).not.toBeInTheDocument());
  expect(dialog.getByRole("button", { name: "Assign staff" })).toBeDisabled();
  fireEvent.click(dialog.getByRole("radio", { name: /View only/ }));
  fireEvent.click(dialog.getByRole("button", { name: "Assign staff" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenLastCalledWith("network", "jordan", expect.objectContaining({ capabilities: ["view"], expectedRelationshipRevision: 8, expectedRevision: 4 }), expect.anything()));
});

it("reconciles an unknown save using exactly the frozen command and operation receipt", async () => {
  vi.mocked(agencyCareApi.grant).mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValue(grant());
  mount();
  const dialog = await openNew();
  fireEvent.click(dialog.getByRole("button", { name: "Assign staff" }));
  fireEvent.click(await dialog.findByRole("button", { name: "Check assignment outcome" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenCalledTimes(2));
  expect(vi.mocked(agencyCareApi.grant).mock.calls[1][2]).toEqual(vi.mocked(agencyCareApi.grant).mock.calls[0][2]);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("requires a removal reason and clears the optional contact without needing a replacement", async () => {
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [grant()], nextCursor: null });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Manage" }));
  const dialog = within(await screen.findByRole("dialog"));
  const remove = await dialog.findByRole("button", { name: "Remove from care team" });
  const body = remove.closest<HTMLDivElement>(".ac-dialog-body")!;
  body.scrollTop = 200;
  fireEvent.click(remove);
  expect(body.scrollTop).toBe(0);
  expect(dialog.getByText(/primary contact will be cleared/)).toBeVisible();
  fireEvent.submit(dialog.getByRole("button", { name: "Remove staff" }).closest("form")!);
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
  expect(dialog.getByText("Choose a reason for removal.")).toBeVisible();
  fireEvent.change(dialog.getByRole("combobox", { name: "Reason for removal" }), { target: { value: "Staff reassigned" } });
  fireEvent.click(dialog.getByRole("button", { name: "Remove staff" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenCalledWith("network", "jordan", expect.objectContaining({
    capabilities: [], isPrimaryContact: false, reason: "Staff reassigned", expectedRevision: 5, expectedRelationshipRevision: 7,
  }), expect.anything()));
});

it("shows employee assignment and own team without calling management endpoints or exposing management controls", async () => {
  fixtures.context.uid = "jordan";
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [{
    agencyKey, name: "Provider agency", state: "active", revision: 7,
    members: [{ ...person, careRole: "dsp", capabilities: ["view", "send"], isPrimaryContact: true }],
  }], nextCursor: null });
  mount({ ...network, capabilities: ["view", "send"] });
  expect(await screen.findByText("My care assignment")).toBeVisible();
  expect(screen.getByText("View and message")).toBeVisible();
  expect(screen.getByText("Jordan Reed")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Assign staff|Manage/ })).not.toBeInTheDocument();
  expect(agencyCareApi.grants).not.toHaveBeenCalled();
  expect(agencyCareApi.networkMembers).not.toHaveBeenCalled();
});

it("protects elevated authorizations from replacement through staff presets", async () => {
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [grant({ capabilities: ["view", "manage"], protectedAuthority: true })], nextCursor: null });
  mount();
  expect(await screen.findByText("Existing authorized access")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
});

it("hides ordinary staff assignment for the formal source SC while preserving existing authorized controls", async () => {
  fixtures.context.organization.role = "support_coordinator";
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [grant(), grant({ uid: "authorized", capabilities: ["view", "manage"], protectedAuthority: true })], nextCursor: null });
  const onAdvancedAccess = vi.fn();
  mount(network, { onAdvancedAccess });
  expect(await screen.findByRole("button", { name: "Edit authorized access" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Assign staff" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit authorized access" }));
  expect(onAdvancedAccess).toHaveBeenCalledWith(expect.objectContaining({ uid: "authorized" }));
});

it("marks ineffective ordinary access and still permits reasoned removal after employment ends", async () => {
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [grant({ effective: false, eligibleCareRoles: [], allowedCapabilities: [], name: "Former member" })], nextCursor: null });
  vi.mocked(agencyCareApi.networkMembers).mockResolvedValue(roster({ items: [] }));
  mount();
  expect(await screen.findByText("Access unavailable")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Manage" }));
  const dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByRole("button", { name: "Save changes" })).toBeDisabled();
  fireEvent.click(dialog.getByRole("button", { name: "Remove from care team" }));
  fireEvent.change(dialog.getByRole("combobox", { name: "Reason for removal" }), { target: { value: "No longer part of this care team" } });
  await waitFor(() => expect(dialog.getByRole("button", { name: "Remove staff" })).toBeEnabled());
  fireEvent.click(dialog.getByRole("button", { name: "Remove staff" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenCalledWith("network", "jordan", expect.objectContaining({ capabilities: [], reason: "No longer part of this care team", expectedRevision: 5 }), expect.anything()));
});

it("suppresses stale save completion and success feedback after the workspace unmounts", async () => {
  let resolve!: (value: CareGrant) => void;
  vi.mocked(agencyCareApi.grant).mockImplementation(() => new Promise(value => { resolve = value; }));
  const { unmount, refreshNetwork } = mount();
  const dialog = await openNew();
  fireEvent.click(dialog.getByRole("button", { name: "Assign staff" }));
  await waitFor(() => expect(agencyCareApi.grant).toHaveBeenCalledOnce());
  unmount();
  resolve(grant());
  await Promise.resolve();
  expect(refreshNetwork).not.toHaveBeenCalled();
  expect(fixtures.toast).not.toHaveBeenCalled();
});

it("explains a staff target on another grant page and highlights it after authorized pagination", async () => {
  vi.mocked(agencyCareApi.grants).mockImplementation(async (_network, options) => ({
    items: options?.cursor ? [grant()] : [grant({ uid: "other", name: "Other employee" })],
    nextCursor: options?.cursor ? null : "grants-next",
  }));
  mount(network, { highlightedUid: "jordan" });
  expect(await screen.findByText(/staff member referenced by this notification is not on this page/)).toBeVisible();
  expect(screen.getByText("Other employee").closest("tr")).not.toHaveClass("ac-notification-target");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  const row = (await screen.findByText("Jordan Reed")).closest("tr")!;
  expect(row).toHaveClass("ac-notification-target");
  await waitFor(() => expect(row).toHaveFocus());
  expect(agencyCareApi.grants).toHaveBeenLastCalledWith("network", expect.objectContaining({ agencyKey, cursor: "grants-next" }));
  expect(agencyCareApi.networkMembers).not.toHaveBeenCalled();
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
});

it("does not fetch or imply a foreign or removed staff target exists in an employee's current team", async () => {
  fixtures.context.uid = "jordan";
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [{ agencyKey, name: "Provider agency", state: "active", revision: 7, members: [{ ...person, careRole: "dsp" }] }], nextCursor: null });
  mount({ ...network, capabilities: ["view"] }, { highlightedUid: "foreign-or-removed" });
  expect(await screen.findByText(/staff record referenced by this notification is not shown in your agency’s current results/)).toBeVisible();
  expect(screen.getByText("Jordan Reed").closest("li")).not.toHaveClass("ac-notification-target");
  expect(agencyCareApi.grants).not.toHaveBeenCalled();
  expect(agencyCareApi.networkMembers).not.toHaveBeenCalled();
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
});

it("lets a notification reader return to the first authorized page without losing the staff target", async () => {
  vi.mocked(agencyCareApi.grants).mockImplementation(async (_network, options) => ({
    items: options?.cursor ? [grant({ uid: "other", name: "Other employee" })] : [grant()],
    nextCursor: options?.cursor ? null : "grants-next",
  }));
  mount(network, { highlightedUid: "jordan" });
  expect((await screen.findByText("Jordan Reed")).closest("tr")).toHaveClass("ac-notification-target");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByText(/staff record referenced by this notification is not shown in your agency’s current results/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Back to first page" }));
  const row = (await screen.findByText("Jordan Reed")).closest("tr")!;
  expect(row).toHaveClass("ac-notification-target");
  await waitFor(() => expect(row).toHaveFocus());
  expect(agencyCareApi.grants).toHaveBeenLastCalledWith("network", expect.objectContaining({ agencyKey, cursor: "" }));
});

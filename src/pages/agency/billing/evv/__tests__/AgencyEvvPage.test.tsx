import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import AgencyEvvPage from "../index";
import EvvClientLinkDialog from "../EvvClientLinkDialog";
import { parseCodeLines } from "@/pages/agency/agency-settings/components/EvvSettingsTab";
import { UserType } from "@/utils/auth/types";
import type { EvvSettings, EvvVisit } from "@/lib/api/evv";

let user: any;
const api = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getSummary: vi.fn(),
  listVisits: vi.fn(),
  getVisit: vi.fn(),
  setReason: vi.fn(),
  resubmit: vi.fn(),
  voidVisit: vi.fn(),
  listClients: vi.fn(),
  listCaregivers: vi.fn(),
  listTransactions: vi.fn(),
  linkMember: vi.fn(),
  lookupMember: vi.fn(),
  syncCaregiver: vi.fn(),
}));
vi.unmock("react-router");
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({ useEffectiveAgencyMode: () => "hha" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/axios", () => ({ default: {} }));
vi.mock("@/lib/api/evv", async (importOriginal) => ({ ...(await importOriginal<object>()), evvApi: api }));

const settings: EvvSettings = {
  agencyId: "a", provider: "hhax", enabled: true, environment: "sandbox", effectiveEnvironment: "sandbox", goLiveDate: "2026-11-01",
  programs: { hha: true, ddd: false }, offices: [], defaultOfficeId: null,
  payers: [{ code: "NJMCD", label: "NJ Medicaid" }], reasonCodes: [{ code: "R1", label: "Phone issue" }], actionCodes: [], missedReasonCodes: [], taskCodes: [],
  credentialsConfigured: true, sendsEnabled: true, connection: { status: "connected", message: null, checkedAt: null },
  provider_identity: { taxIdLast4: "6789", npi: "123", medicaidProviderId: null }, updatedAt: null,
};

const visit: EvvVisit = {
  shiftId: "shift1", visitDate: "2026-11-20", program: "hha", clientId: "c1", clientName: "Ada Client", employeeId: "e1", caregiverName: "Cara Giver",
  state: "needs_info", issues: [{ field: "exception", message: "Manual entry: pick an HHAeXchange reason code." }], hhaxErrors: [], lastError: null,
  version: 1, sentVersion: 0, evvmsid: null, lastTransactionId: null, isMissed: false, captureMethod: "manual", deleted: false,
  transmittedAt: null, acceptedAt: null, updatedAt: null,
};

function renderPage(entry = "/agency/billing/evv") {
  return render(<MemoryRouter initialEntries={[entry]}><AgencyEvvPage /></MemoryRouter>);
}

describe("HHAeXchange EVV page", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    user = { uid: "u", agencyId: "a", userType: UserType.AGENCY, profile: {} };
    api.getSettings.mockResolvedValue(settings);
    api.getSummary.mockResolvedValue({ counts: { accepted: 4, needs_info: 1 }, needsAttention: 1 });
    api.listVisits.mockResolvedValue({ visits: [visit], nextCursor: null });
    api.getVisit.mockResolvedValue({ visit: { ...visit, missedReason: null, exception: null, changeReason: null, voidReason: null }, versions: [], transactions: [] });
    api.setReason.mockResolvedValue({ visit: { ...visit, state: "queued", issues: [] }, outcome: "versioned" });
  });

  it("lists visits that need attention for the active program", async () => {
    renderPage();
    expect(await screen.findByText("Ada Client")).toBeInTheDocument();
    expect(api.listVisits).toHaveBeenCalledWith(expect.objectContaining({ state: "attention", program: "hha" }), expect.anything());
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/Connected to HHAeXchange sandbox/)).toBeInTheDocument();
  });

  it("opens the visit and saves a manual-entry reason from the agency's code list", async () => {
    const interaction = userEvent.setup();
    renderPage();
    await interaction.click(await screen.findByRole("button", { name: "Nov 20, 2026" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Manual entry reason");
    await interaction.selectOptions(within(dialog).getByLabelText("Reason code"), "R1");
    await interaction.click(within(dialog).getByRole("button", { name: "Save reason" }));
    await waitFor(() => expect(api.setReason).toHaveBeenCalledWith("shift1", { kind: "exception", reasonCode: "R1", actionCode: null, note: null }));
  });

  it("opens a visit linked from another page and keeps view-only staff read-only", async () => {
    user = { uid: "s", agencyId: "a", userType: UserType.AGENCY_STAFF, profile: { accessList: ["EVV View"] } };
    renderPage("/agency/billing/evv?visit=shift1");
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/EVV Management access needs to pick a reason/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save reason" })).not.toBeInTheDocument();
    expect(api.getVisit).toHaveBeenCalledWith("shift1", expect.anything());
  });

  it("warns when sending is off", async () => {
    api.getSettings.mockResolvedValue({ ...settings, enabled: false });
    renderPage();
    expect(await screen.findByText(/Sending to HHAeXchange is off/)).toBeInTheDocument();
  });
});

describe("member link dialog", () => {
  it("validates the member id and saves the link", async () => {
    const interaction = userEvent.setup();
    const onLinked = vi.fn();
    api.linkMember.mockResolvedValue({ linkState: "linked", visitsRechecked: 2 });
    render(
      <EvvClientLinkDialog
        client={{ clientId: "c1", name: "Ada Client", program: "hha", status: "active", evvRequired: true, medicaidIdLast4: "8901", link: { linkState: "unlinked" } }}
        settings={settings}
        onClose={vi.fn()}
        onLinked={onLinked}
      />,
    );
    const save = screen.getByRole("button", { name: "Save link" });
    await interaction.type(screen.getByLabelText("Member id"), "12");
    expect(screen.getByText(/4 to 30 letters/)).toBeInTheDocument();
    expect(save).toBeDisabled();
    await interaction.type(screen.getByLabelText("Member id"), "345678901");
    await interaction.click(save);
    await waitFor(() => expect(api.linkMember).toHaveBeenCalledWith("c1", { memberQualifier: "medicaid_id", memberId: "12345678901", payerId: "NJMCD", officeId: null, hhaxPatientId: null }));
    expect(onLinked).toHaveBeenCalled();
  });
});

describe("code list parsing", () => {
  it("reads CODE, Label lines and reports duplicates", () => {
    expect(parseCodeLines("R1, Phone issue\n\nR2").codes).toEqual([{ code: "R1", label: "Phone issue" }, { code: "R2", label: "R2" }]);
    expect(parseCodeLines("R1, a\nR1, b").errors).toEqual(["Code R1 is listed twice."]);
  });
});

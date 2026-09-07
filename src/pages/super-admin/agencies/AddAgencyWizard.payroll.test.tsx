import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AddAgencyWizard from "./AddAgencyWizard";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  draft: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  getDraft: vi.fn(),
  getAgency: vi.fn(),
  navigate: vi.fn(),
  dispatch: vi.fn(),
  toast: vi.fn(),
  refreshProfile: vi.fn(),
  search: "",
  currentAgency: undefined as any,
  currentDraft: undefined as any,
}));

const mutationResult = (value?: unknown) => ({ unwrap: vi.fn().mockResolvedValue(value) });

vi.mock("./api", () => ({
  useCreateAgencyWithUserMutation: () => [mocks.create, { isLoading: false }],
  useSaveDraftMutation: () => [mocks.draft, { isLoading: false }],
  useUpdateAgencyMutation: () => [mocks.update, { isLoading: false }],
  useUploadAgencyFileMutation: () => [mocks.upload, { isLoading: false }],
  useLazyGetDraftAgencyQuery: () => [mocks.getDraft, { data: mocks.currentDraft }],
  useLazyGetAgencyQuery: () => [mocks.getAgency, { data: mocks.currentAgency }],
  useGetServicesQuery: () => ({ data: { services: [{ name: "Personal Care", code: "S5125", program: "ddd" }] } }),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: "/super-admin/agencies/add", search: mocks.search, hash: "", state: null, key: "test" }),
}));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { profile: { agencyScope: "all" } }, refreshProfile: mocks.refreshProfile }) }));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("./agencyCreationAccessRefresh", () => ({
  finalizeAgencyCreation: async ({ showSuccess, navigate }: any) => { showSuccess(); navigate(); },
}));
vi.mock("@/pages/super-admin/user-access-control/resetSuperAdminCaches", () => ({ resetSuperAdminCaches: vi.fn() }));
vi.mock("./agencyAccessRefreshToast", () => ({ dismissAgencyAccessRefreshWarning: vi.fn(), showAgencyAccessRefreshWarning: vi.fn() }));

vi.mock("@/pages/super-admin/agencies/components/StepOne", async () => {
  const actual = await vi.importActual<typeof import("@/pages/super-admin/agencies/components/StepOne")>("@/pages/super-admin/agencies/components/StepOne");
  const StepOne = actual.default;
  return {
    ...actual,
    default: ({ formData, onChange, fieldsWithErrors }: any) => <div>
      <StepOne formData={formData} onChange={onChange} fieldsWithErrors={fieldsWithErrors} />
      <button type="button" onClick={() => {
        const values = {
          agencyName: "Able Care", agencyType: "provider", primaryAddress: "100 Agency Way",
          county_or_state: "TX", zipCode: "78701", mainPhone: "5125550123", supportEmail: "hello@able.example",
          timezone: "America/Chicago",
          websiteUrl: "https://able.example",
        };
        Object.entries(values).forEach(([key, value]) => onChange(key, value));
      }}>Fill identity</button>
    </div>,
  };
});
vi.mock("@/pages/super-admin/agencies/components/StepTwo", () => ({ default: ({ onChange }: any) => <div>
  <button type="button" onClick={() => {
    Object.entries({ userName: "Agency Owner", userPhone: "+15125550125", userEmail: "owner@able.example", userPassword: "StrongPass1!", supportedClientTypes: ["ddd"], services: ["S5125"] }).forEach(([key, value]) => onChange(key, value));
  }}>Fill leadership</button>
  <button type="button" onClick={() => onChange("userName", "Updated Owner")}>Change leadership name</button>
</div> }));
vi.mock("@/pages/super-admin/agencies/components/StepThree", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("travelTimeRules", "Paid"); onChange("allowedFileTypes", ["pdf"]); }}>Fill operations</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepFour", () => ({ default: () => <p>AI settings</p> }));
vi.mock("@/pages/super-admin/agencies/components/StepFive", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => onChange("logo", new File(["logo"], "logo.png", { type: "image/png" }))}>Fill branding</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepSix", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("billingFormat", "csv"); onChange("invoiceName", "Care invoice"); }}>Fill billing</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepSeven", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("auditRetentionPeriodNumber", "12"); onChange("planStartDate", "2026-09-01"); }}>Fill subscription</button> }));

async function completeAgencyForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Fill identity" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill leadership" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill operations" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill branding" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill billing" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill subscription" }));
    await user.click(screen.getByLabelText(/all the information/i));
    await user.click(screen.getByRole("button", { name: "Create Agency" }));
}

beforeEach(() => {
  vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
  vi.clearAllMocks();
  mocks.search = "";
  mocks.currentAgency = undefined;
  mocks.currentDraft = undefined;
  mocks.create.mockReturnValue(mutationResult({ success: true, agency: { id: "created-agency" } }));
  mocks.draft.mockReturnValue(mutationResult());
  mocks.update.mockReturnValue(mutationResult());
  mocks.upload.mockReturnValue(mutationResult({ url: "https://files.example/logo.png" }));
  mocks.refreshProfile.mockResolvedValue(undefined);
});

describe("AddAgencyWizard agency onboarding", () => {
  it("starts with no browser-derived timezone and exposes a searchable IANA control", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    const timezone = screen.getByRole("combobox", { name: "Agency timezone" });
    expect(timezone).toHaveValue("");
    fireEvent.change(timezone, { target: { value: "New_York" } });
    expect(timezone).toHaveAccessibleDescription("Select a valid IANA timezone.");
    expect(screen.getByRole("alert")).toHaveTextContent("Select a valid IANA timezone.");
    await user.click(screen.getByRole("option", { name: "America/New_York" }));
    expect(timezone).toHaveValue("America/New_York");

    fireEvent.change(timezone, { target: { value: "Mars/Olympus_Mons" } });
    expect(timezone).toHaveValue("Mars/Olympus_Mons");
    expect(timezone).toHaveAccessibleDescription("Select a valid IANA timezone.");
  });

  it("keeps focus on the timezone combobox while navigating and selecting an active option", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    const timezone = screen.getByRole("combobox", { name: "Agency timezone" });
    await user.click(timezone);
    fireEvent.change(timezone, { target: { value: "New_York" } });
    const option = screen.getByRole("option", { name: "America/New_York" });

    await user.keyboard("{ArrowDown}");
    expect(timezone).toHaveFocus();
    expect(timezone).toHaveAttribute("aria-activedescendant", option.id);
    expect(option).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(timezone).toHaveAttribute("aria-activedescendant", option.id);

    await user.keyboard("{Enter}");
    expect(timezone).toHaveValue("America/New_York");
    expect(screen.queryByRole("listbox", { name: "IANA timezones" })).not.toBeInTheDocument();
    expect(timezone).toHaveFocus();
  });

  it("scrolls the active timezone option into view during keyboard navigation", async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      const user = userEvent.setup();
      render(<AddAgencyWizard />);

      const timezone = screen.getByRole("combobox", { name: "Agency timezone" });
      await user.click(timezone);
      fireEvent.change(timezone, { target: { value: "America/" } });
      expect(screen.getAllByRole("option").length).toBeGreaterThan(5);

      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");

      const activeId = timezone.getAttribute("aria-activedescendant");
      const activeOption = activeId ? document.getElementById(activeId) : null;
      expect(activeOption).not.toBeNull();
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(activeOption);
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("closes timezone options with Escape without moving focus from the combobox", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    const timezone = screen.getByRole("combobox", { name: "Agency timezone" });
    await user.click(timezone);
    fireEvent.change(timezone, { target: { value: "New_York" } });
    await user.keyboard("{ArrowDown}{Escape}");

    expect(screen.queryByRole("listbox", { name: "IANA timezones" })).not.toBeInTheDocument();
    expect(timezone).not.toHaveAttribute("aria-activedescendant");
    expect(timezone).toHaveFocus();
  });

  it("does not advance or submit with an empty or invalid timezone", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);
    await user.click(screen.getByRole("button", { name: "Fill identity" }));
    const timezone = screen.getByRole("combobox", { name: "Agency timezone" });

    fireEvent.change(timezone, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Fill leadership" })).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();

    fireEvent.change(timezone, { target: { value: "Mars/Olympus_Mons" } });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Fill leadership" })).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  }, 15_000);

  it("sends a blank needs-information profile through the draft endpoint without empty nested groups", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Save Name"), "Blank payroll draft");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.draft).toHaveBeenCalledTimes(1));
    expect(mocks.draft.mock.calls[0][0].agency.checkPayrollProfile).toBeUndefined();
    expect(JSON.stringify(mocks.draft.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);

  it("sends exactly the changed timezone after hydration and skips unrelated payroll validation", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: {
        name: "Able Care",
        email: "hello@able.example",
        timezone: "America/Denver",
        checkPayrollProfile: {
          legalName: "Able Care LLC",
          einStatus: { present: true, last4: "6789" },
          payrollContact: { name: "Payroll Contact", email: "payroll@able.example", phone: "+441234567890" },
        },
      },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await screen.findByDisplayValue("America/Denver");
    expect(screen.queryByLabelText("EIN")).not.toBeInTheDocument();
    expect(screen.queryByText("Payroll prerequisites")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Agency timezone" })).toHaveValue("America/Denver");
    expect(screen.queryByText("6789")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Agency timezone" }), { target: { value: "America/New_York" } });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toEqual({
      agencyId: "agency-1",
      data: { agency: { timezone: "America/New_York" } },
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.update.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);

  it("omits a field that is changed and then restored to its hydrated value", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: { name: "Able Care", email: "hello@able.example", timezone: "America/Denver", checkPayrollProfile: {} },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    const agencyName = await screen.findByLabelText("Agency Name");
    await user.clear(agencyName);
    await user.type(agencyName, "Renamed Care");
    await user.clear(agencyName);
    await user.type(agencyName, "Able Care");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("sends a changed agency identity field without unrelated agency, user, or payroll fields", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: { name: "Able Care", email: "hello@able.example", timezone: "America/Denver", checkPayrollProfile: {} },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    const agencyName = await screen.findByLabelText("Agency Name");
    await user.clear(agencyName);
    await user.type(agencyName, "Renamed Care");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toEqual({
      agencyId: "agency-1",
      data: { agency: { name: "Renamed Care" } },
    });
  });

  it("sends only the changed leadership field in the optional user payload", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: {
        name: "Able Care", agencyType: "provider", email: "hello@able.example", timezone: "America/Denver",
        address: "100 Agency Way", state: "TX", zipCode: "78701", phone: "+15125550123", checkPayrollProfile: {},
      },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await screen.findByLabelText("Agency Name");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Change leadership name" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toEqual({
      agencyId: "agency-1",
      data: { agency: {}, user: {fullName: "Updated Owner"} },
    });
  });

  it("hydrates the agency contact phone without payroll fields", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: {
        name: "Able Care",
        email: "hello@able.example",
        timezone: "America/Denver",
        phone: "+15125550123",
        checkPayrollProfile: { payrollContact: { name: "Pat Payroll", email: "pat@able.example", phone: "+15125550124" } },
      },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    render(<AddAgencyWizard />);
    expect(screen.queryByLabelText("Payroll contact phone")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Main Phone Number")).toHaveValue("5125550123");
    expect(screen.getAllByText("+1")).toHaveLength(1);
  });

  it("retains a saved draft timezone when hydrating and saving again", async () => {
    mocks.search = "?draftId=draft-1";
    mocks.currentDraft = {
      agencyData: { name: "Draft Care", email: "draft@example.com", timezone: "America/Los_Angeles", checkPayrollProfile: {} },
      user: { fullName: "Draft Owner", email: "owner@example.com", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    expect(await screen.findByRole("combobox", { name: "Agency timezone" })).toHaveValue("America/Los_Angeles");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Save Name"), "Draft with timezone");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.draft).toHaveBeenCalledTimes(1));
    expect(mocks.draft.mock.calls[0][0].agency.timezone).toBe("America/Los_Angeles");
  });

  it("keeps a malformed company phone visible and invalid until it is explicitly replaced", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: { name: "Able Care", email: "hello@able.example", phone: "+445125550123", timezone: "America/Denver", checkPayrollProfile: {} },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);
    const phone = await screen.findByLabelText("Main Phone Number");
    expect(phone).toHaveValue("+445125550123");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAccessibleDescription("Enter a valid US ten-digit company phone number.");
    await user.type(phone, "9");
    expect(phone).toHaveValue("+445125550123");
  });

  it("creates the agency without payroll setup before uploading branding", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await completeAgencyForm(user);

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      agencyId: "created-agency",
      data: { agency: { logo: "https://files.example/logo.png", letterhead: "" } },
    }));
    expect(mocks.create.mock.calls[0][0].agency.logo).toBe("");
    expect(mocks.upload).toHaveBeenCalledWith({ agencyId: "created-agency", file: expect.any(File), fileType: "logo" });
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(mocks.create.mock.calls[0][0].agency.timezone).toBe("America/Chicago");
    expect(mocks.create.mock.calls[0][0].agency.checkPayrollProfile).toBeUndefined();
    expect(mocks.create.mock.calls[0][0].user).toEqual({
      fullName: "Agency Owner", email: "owner@able.example", password: "StrongPass1!", phone: "+15125550125", userType: "agency",
    });
    expect(JSON.stringify(mocks.create.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);
  it.each(["upload", "update"] as const)("opens the created agency for repair when %s fails", async (failure) => {
    mocks[failure].mockReturnValue({ unwrap: () => Promise.reject(new Error("Branding unavailable")) });
    const user = userEvent.setup();
    render(<AddAgencyWizard />);
    await completeAgencyForm(user);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(
      "/super-admin/agencies/add?agencyId=created-agency", { replace: true },
    ));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({title: "Agency created; branding needs attention"}));
  }, 15_000);

  it("does not upload when creation fails", async () => {
    mocks.create.mockReturnValue({ unwrap: () => Promise.reject(new Error("Creation failed")) });
    const user = userEvent.setup();
    render(<AddAgencyWizard />);
    await completeAgencyForm(user);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({description: "Creation failed"})));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  }, 15_000);

  it("saves a draft without uploading its newly selected branding", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);
    await user.click(screen.getByRole("button", { name: "Fill identity" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill leadership" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill operations" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Fill branding" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Save Name"), "Branding draft");
    await user.click(within(dialog).getByRole("button", {name: "Save"}));
    await waitFor(() => expect(mocks.draft).toHaveBeenCalledTimes(1));
    expect(mocks.draft.mock.calls[0][0].agency.logo).toBe("");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({description: expect.stringContaining("Reselect new branding files")}));
  }, 15_000);
});
afterEach(() => vi.useRealTimers());

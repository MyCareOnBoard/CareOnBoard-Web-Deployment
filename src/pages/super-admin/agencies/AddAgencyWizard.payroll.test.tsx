import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
}));

const mutationResult = (value?: unknown) => ({ unwrap: vi.fn().mockResolvedValue(value) });

vi.mock("./api", () => ({
  useCreateAgencyWithUserMutation: () => [mocks.create, { isLoading: false }],
  useSaveDraftMutation: () => [mocks.draft, { isLoading: false }],
  useUpdateAgencyMutation: () => [mocks.update, { isLoading: false }],
  useUploadAgencyFileMutation: () => [mocks.upload, { isLoading: false }],
  useLazyGetDraftAgencyQuery: () => [mocks.getDraft, { data: undefined }],
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
  const { default: StepOne } = await vi.importActual<typeof import("@/pages/super-admin/agencies/components/StepOne")>("@/pages/super-admin/agencies/components/StepOne");
  return {
    default: ({ formData, onChange, fieldsWithErrors }: any) => <div>
      <StepOne formData={formData} onChange={onChange} fieldsWithErrors={fieldsWithErrors} />
      <button type="button" onClick={() => {
        const values = {
          agencyName: "Able Care", agencyType: "provider", primaryAddress: "100 Agency Way",
          county_or_state: "TX", zipCode: "78701", mainPhone: "5125550123", supportEmail: "hello@able.example",
          websiteUrl: "https://able.example", payrollLegalName: "Able Care LLC", payrollEin: "12-3456789",
          payrollEntityType: "llc", payrollIndustry: "health_care",
          payrollLegalAddress: { line1: "1 Legal Street", line2: "Suite 1", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
          payrollOfficeName: "Main office",
          payrollOfficeAddress: { line1: "2 Work Street", line2: "", city: "Austin", state: "TX", postalCode: "78702", country: "US" },
          payrollActualWorkLocationAttested: true, payrollContactName: "Pay Roll", payrollContactEmail: "payroll@able.example",
          payrollContactPhone: "5125550124", payrollFrequency: "weekly", payrollFirstPayday: "2026-09-04",
          payrollSecondPayday: "", payrollFirstPeriodEnd: "2026-09-03", payrollStartDate: "2026-08-28",
          expectedW2Workers: "3",
        };
        Object.entries(values).forEach(([key, value]) => onChange(key, value));
      }}>Fill identity and payroll</button>
    </div>,
  };
});
vi.mock("@/pages/super-admin/agencies/components/StepTwo", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => {
  Object.entries({ userName: "Agency Owner", userPhone: "+15125550125", userEmail: "owner@able.example", userPassword: "StrongPass1!", supportedClientTypes: ["ddd"], services: ["S5125"] }).forEach(([key, value]) => onChange(key, value));
}}>Fill leadership</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepThree", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("travelTimeRules", "Paid"); onChange("allowedFileTypes", ["pdf"]); }}>Fill operations</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepFour", () => ({ default: () => <p>AI settings</p> }));
vi.mock("@/pages/super-admin/agencies/components/StepFive", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => onChange("logo", new File(["logo"], "logo.png", { type: "image/png" }))}>Fill branding</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepSix", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("billingFormat", "csv"); onChange("invoiceName", "Care invoice"); }}>Fill billing</button> }));
vi.mock("@/pages/super-admin/agencies/components/StepSeven", () => ({ default: ({ onChange }: any) => <button type="button" onClick={() => { onChange("auditRetentionPeriodNumber", "12"); onChange("planStartDate", "2026-09-01"); }}>Fill subscription</button> }));

const expectedPayrollWrite = {
  legalName: "Able Care LLC",
  einChange: { mode: "replace", value: "12-3456789" },
  entityType: "llc",
  industry: "health_care",
  legalAddress: { line1: "1 Legal Street", line2: "Suite 1", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
  officeWorkplace: {
    name: "Main office",
    address: { line1: "2 Work Street", line2: "", city: "Austin", state: "TX", postalCode: "78702", country: "US" },
    actualWorkLocationAttested: true,
  },
  website: "https://able.example",
  phone: "+15125550123",
  payrollContact: { name: "Pay Roll", email: "payroll@able.example", phone: "+15125550124" },
  paySchedule: { frequency: "weekly", firstPayday: "2026-09-04", secondPayday: null, firstPeriodEnd: "2026-09-03", payrollStartDate: "2026-08-28" },
  expectedWorkerCounts: { w2: 3, contractor: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = "";
  mocks.currentAgency = undefined;
  mocks.create.mockReturnValue(mutationResult({ success: true }));
  mocks.draft.mockReturnValue(mutationResult());
  mocks.update.mockReturnValue(mutationResult());
  mocks.upload.mockReturnValue(mutationResult({ url: "https://files.example/logo.png" }));
  mocks.refreshProfile.mockResolvedValue(undefined);
});

describe("AddAgencyWizard payroll endpoint payloads", () => {
  it("sends a blank needs-information profile through the draft endpoint without empty nested groups", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Save Name"), "Blank payroll draft");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.draft).toHaveBeenCalledTimes(1));
    expect(mocks.draft.mock.calls[0][0].agency.checkPayrollProfile).toEqual({});
    expect(JSON.stringify(mocks.draft.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);

  it("hydrates an EIN status and sends preserve through the edit endpoint without exposing last4", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: {
        name: "Able Care",
        email: "hello@able.example",
        checkPayrollProfile: { legalName: "Able Care LLC", einStatus: { present: true, last4: "6789" } },
      },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await waitFor(() => expect(screen.getByLabelText("EIN")).toHaveAttribute("placeholder", "EIN on file"));
    expect(screen.getByLabelText("EIN")).toHaveValue("");
    expect(screen.queryByText("6789")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      agencyId: "agency-1",
      data: { agency: { checkPayrollProfile: { legalName: "Able Care LLC", einChange: { mode: "preserve" } } } },
    });
    expect(JSON.stringify(mocks.update.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);

  it("hydrates canonical payroll phones into fixed-prefix ten-digit controls", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: {
        name: "Able Care",
        email: "hello@able.example",
        phone: "+15125550123",
        checkPayrollProfile: { payrollContact: { name: "Pat Payroll", email: "pat@able.example", phone: "+15125550124" } },
      },
      user: { fullName: "Agency Owner", email: "owner@able.example", phone: "+15125550125", userType: "agency" },
    };
    render(<AddAgencyWizard />);
    expect(await screen.findByLabelText("Payroll contact phone")).toHaveValue("5125550124");
    expect(screen.getByLabelText("Main Phone Number")).toHaveValue("5125550123");
    expect(screen.getAllByText("+1")).toHaveLength(2);
  });

  it("keeps a malformed company phone visible and invalid until it is explicitly replaced", async () => {
    mocks.search = "?agencyId=agency-1";
    mocks.currentAgency = {
      agencyData: { name: "Able Care", email: "hello@able.example", phone: "+445125550123", checkPayrollProfile: {} },
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

  it("sends the exact canonical full payroll write through the create endpoint", async () => {
    const user = userEvent.setup();
    render(<AddAgencyWizard />);

    await user.click(screen.getByRole("button", { name: "Fill identity and payroll" }));
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

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0].agency.checkPayrollProfile).toEqual(expectedPayrollWrite);
    expect(mocks.create.mock.calls[0][0].user).toEqual({
      fullName: "Agency Owner", email: "owner@able.example", password: "StrongPass1!", phone: "+15125550125", userType: "agency",
    });
    expect(JSON.stringify(mocks.create.mock.calls[0][0])).not.toMatch(/einStatus|designatedSignerUserUid|payrollSchedule|nextPayoutDate|last4/);
  }, 15_000);
});

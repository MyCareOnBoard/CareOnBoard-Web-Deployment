import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StediEnrollment, StediEnrollmentOverview } from "@/lib/api/stediEnrollment";
import StediEnrollmentWizard from "./StediEnrollmentWizard";
import StediEnrollmentBanner from "./StediEnrollmentBanner";
import { taskPrefill, toEnrollmentInput, validateStep, formFromOverview } from "./stediEnrollmentUtils";

const mocks = vi.hoisted(() => ({ get: vi.fn(), status: vi.fn(), start: vi.fn(), submit: vi.fn(), refresh: vi.fn(), task: vi.fn() }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "a", mode: "hha" }),
}));
vi.mock("@/lib/api/stediEnrollment", () => ({
  getStediEnrollment: mocks.get,
  getStediEnrollmentStatus: mocks.status,
  startStediEnrollment: mocks.start,
  submitStediEnrollmentDrafts: mocks.submit,
  refreshStediEnrollment: mocks.refresh,
  answerStediEnrollmentTask: mocks.task,
}));

const EMPTY_ENROLLMENT: StediEnrollment = {
  status: "not_started",
  payerId: "100229",
  provider: null,
  contact: null,
  userEmail: "",
  transactions: [
    { key: "professionalClaimSubmission", label: "837P claims", njForm: "EDI-201", enrollmentId: "", status: null, reason: "", submittedAt: null, statusLastUpdatedAt: null, lastEraReceivedAt: null, payerName: "", tasks: [], error: null },
    { key: "claimPayment", label: "835 ERA (remittance)", njForm: "EDI-801", enrollmentId: "", status: null, reason: "", submittedAt: null, statusLastUpdatedAt: null, lastEraReceivedAt: null, payerName: "", tasks: [], error: null },
  ],
  createdAt: null,
  updatedAt: null,
  lastSyncedAt: null,
};

const OVERVIEW: StediEnrollmentOverview = {
  configured: true,
  enrollment: EMPTY_ENROLLMENT,
  defaults: {
    providerName: "Test Agency LLC",
    npi: "1679236764",
    taxIdLast4: "6789",
    taxIdSource: "payroll",
    medicaidProviderId: "1234567",
    payerId: "100229",
    contact: {
      organizationName: "Test Agency LLC",
      streetAddress1: "100 Main St",
      city: "Trenton",
      state: "NJ",
      zipCode: "08608",
      email: "billing@example.com",
      phone: "6095550100",
    },
    userEmail: "owner@example.com",
  },
  payer: { id: "100229", name: "New Jersey Medicaid" },
  transactionTypes: [
    { key: "professionalClaimSubmission", label: "837P claims", njForm: "EDI-201" },
    { key: "claimPayment", label: "835 ERA (remittance)", njForm: "EDI-801" },
  ],
};

function withStatus(status: StediEnrollment["status"], txStatus: StediEnrollment["transactions"][number]["status"]): StediEnrollment {
  return {
    ...EMPTY_ENROLLMENT,
    status,
    provider: { name: "Test Agency LLC", npi: "1679236764", taxIdLast4: "6789", medicaidProviderId: "1234567" },
    transactions: EMPTY_ENROLLMENT.transactions.map((tx) => ({ ...tx, enrollmentId: `e-${tx.key}`, status: txStatus })),
  };
}

describe("StediEnrollmentWizard", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("walks through the steps with the agency prefill and saves a draft", async () => {
    mocks.get.mockResolvedValue(OVERVIEW);
    mocks.start.mockResolvedValue({ enrollment: withStatus("draft", "DRAFT"), failed: [], skipped: [] });
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<StediEnrollmentWizard open onClose={vi.fn()} onChanged={onChanged} />);

    expect(await screen.findByLabelText("NPI")).toHaveValue("1679236764");
    expect(screen.getByText(/saved EIN ending in 6789/)).toBeInTheDocument();
    expect(screen.getByLabelText("EIN")).toHaveAccessibleDescription(/saved EIN ending in 6789/);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Street address")).toHaveValue("100 Main St");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText(/837P claims/)).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    expect(mocks.start).toHaveBeenCalledWith({
      context: { agencyId: "a" },
      enrollment: expect.objectContaining({
        npi: "1679236764",
        medicaidProviderId: "1234567",
        payerId: "100229",
        transactions: ["professionalClaimSubmission", "claimPayment"],
        submit: false,
      }),
    });
    expect(mocks.start.mock.calls[0][0].enrollment).not.toHaveProperty("taxId");
    expect(await screen.findByText(/Saved as a draft/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
    expect(screen.getByRole("button", { name: "Submit to Stedi" })).toBeInTheDocument();
  });

  it("stops on a step with invalid fields", async () => {
    mocks.get.mockResolvedValue({ ...OVERVIEW, defaults: { ...OVERVIEW.defaults, npi: "", taxIdLast4: "" } });
    const user = userEvent.setup();
    render(<StediEnrollmentWizard open onClose={vi.fn()} />);
    await screen.findByLabelText("NPI");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("NPI must be 10 digits")).toBeInTheDocument();
    expect(screen.getByText("Enter the agency EIN")).toBeInTheDocument();
    expect(screen.queryByLabelText("Street address")).not.toBeInTheDocument();
  });

  it("shows status and answers a provider task with the Medicaid ID prefilled", async () => {
    const enrollment = withStatus("action_required", "PROVIDER_ACTION_REQUIRED");
    enrollment.transactions[0].tasks = [{
      id: "t1", rank: 0, isComplete: false, responsibleParty: "PROVIDER", completedAt: null,
      instructions: "Enter your NJ Medicaid provider ID", links: [], values: [],
      fields: [{ key: "mid", label: "Medicaid provider ID", fieldType: "TEXT" }],
    }];
    mocks.get.mockResolvedValue({ ...OVERVIEW, enrollment });
    mocks.task.mockResolvedValue({ enrollment: withStatus("submitted", "PROVISIONING") });
    const user = userEvent.setup();
    render(<StediEnrollmentWizard open onClose={vi.fn()} />);

    expect(await screen.findByText("Enter your NJ Medicaid provider ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Medicaid provider ID")).toHaveValue("1234567");
    await user.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(mocks.task).toHaveBeenCalledWith({
      context: { agencyId: "a" }, taskId: "t1", values: [{ key: "mid", text: "1234567" }], completed: true,
    });
    expect(await screen.findByText("Task marked as done.")).toBeInTheDocument();
  });

  it("lets view-only staff see status without changing it", async () => {
    mocks.get.mockResolvedValue({ ...OVERVIEW, enrollment: withStatus("draft", "DRAFT") });
    render(<StediEnrollmentWizard open onClose={vi.fn()} canManage={false} />);
    expect(await screen.findByText(/Claims Management access is needed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit to Stedi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit draft" })).not.toBeInTheDocument();
  });
});

describe("StediEnrollmentBanner", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("prompts an agency that hasn't enrolled and opens the wizard", async () => {
    mocks.status.mockResolvedValue(OVERVIEW);
    mocks.get.mockResolvedValue(OVERVIEW);
    const user = userEvent.setup();
    render(<StediEnrollmentBanner />);
    await user.click(await screen.findByRole("button", { name: "Start enrollment" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("stays hidden once enrolled or when Stedi isn't set up", async () => {
    mocks.status.mockResolvedValueOnce({ ...OVERVIEW, enrollment: withStatus("live", "LIVE") });
    const { container, unmount } = render(<StediEnrollmentBanner />);
    await waitFor(() => expect(mocks.status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    unmount();
    mocks.status.mockResolvedValueOnce({ ...OVERVIEW, configured: false });
    const second = render(<StediEnrollmentBanner />);
    await waitFor(() => expect(mocks.status).toHaveBeenCalledTimes(2));
    expect(second.container).toBeEmptyDOMElement();
  });
});

describe("stediEnrollmentUtils", () => {
  it("validates, builds the request and prefills tasks", () => {
    const form = formFromOverview(OVERVIEW);
    expect(validateStep("contact", { ...form, contact: { ...form.contact, zipCode: "1", phone: "123" } }, "6789")).toEqual({
      zipCode: "ZIP must be 12345 or 12345-6789",
      phone: "Phone must be 10 digits",
    });
    const input = toEnrollmentInput({ ...form, taxId: "12-3456789", contact: { ...form.contact, state: "nj " } }, true);
    expect(input.taxId).toBe("123456789");
    expect(input.contact.state).toBe("NJ");
    expect(input.contact).not.toHaveProperty("streetAddress2");
    expect(input.submit).toBe(true);
    expect(
      taskPrefill(
        { id: "t", rank: 0, isComplete: false, responsibleParty: "PROVIDER", completedAt: null, instructions: "", links: [],
          fields: [{ key: "a", label: "Medicaid ID", fieldType: "TEXT" }, { key: "b", label: "Other", fieldType: "TEXT" }],
          values: [{ key: "b", text: "saved" }] },
        "999",
      ),
    ).toEqual({ a: "999", b: "saved" });
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LegacyAgencyPayrollDashboardPage } from "./legacy";

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "actor-1",
      agencyId: "agency-1",
      fullName: "Example Agency",
      agency: { id: "agency-1", name: "Example Agency", supportedClientTypes: ["ddd"] },
      profile: { accessList: ["DSP Management"] },
    },
  }),
}));
vi.mock("react-redux", () => ({ useSelector: () => "ddd" }));
vi.mock("@/lib/operational-agency/dataAdapters", () => ({
  createAgencyOperationalDataAdapter: () => ({}),
}));
vi.mock("@/lib/api/agencies", () => ({ getAgencyById: vi.fn() }));
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  OperationalAgencyProvider: ({ agencyId }: { agencyId: string }) => (
    <div data-testid="legacy-payroll-provider" data-agency-id={agencyId}>
      <span>Preserved legacy payroll controls</span>
    </div>
  ),
  useOperationalAgency: () => ({ agencyId: "agency-1" }),
}));

describe("LegacyAgencyPayrollDashboardPage", () => {
  it("preserves the authenticated legacy agency boundary for pre-cutover agencies", () => {
    render(<LegacyAgencyPayrollDashboardPage />);
    expect(screen.getByTestId("legacy-payroll-provider")).toHaveAttribute("data-agency-id", "agency-1");
    expect(screen.getByText("Preserved legacy payroll controls")).toBeInTheDocument();
  });
});

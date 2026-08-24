import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router", () => ({
  useNavigate: () => routing.navigate,
  useLocation: () => ({
    pathname: "/super-admin/billing/payroll-management",
    search: "?scope=network&status=open",
  }),
}));
vi.mock("../BillingWorkspaceContext", () => ({
  useBillingWorkspaceContext: () => ({ actorUid: "super-1" }),
}));
vi.mock("@/features/payroll/runs/pages/NetworkPayrollRunsWorkspace", () => ({
  NetworkPayrollRunsWorkspace: ({ actorUid, onOpenAgency }: {
    actorUid: string;
    onOpenAgency: (agencyId: string) => void;
  }) => (
    <div>
      <output aria-label="Network payroll actor">{actorUid}</output>
      <button type="button" onClick={() => onOpenAgency("atlas")}>Open Atlas Care payroll</button>
    </div>
  ),
}));

import NetworkPayroll from "./NetworkPayroll";

describe("NetworkPayroll", () => {
  it("adapts the network workspace into the existing trusted agency URL context", async () => {
    render(<NetworkPayroll />);
    expect(screen.getByLabelText("Network payroll actor")).toHaveTextContent("super-1");

    await userEvent.click(screen.getByRole("button", { name: "Open Atlas Care payroll" }));

    expect(routing.navigate).toHaveBeenCalledWith({
      pathname: "/super-admin/billing/payroll-management",
      search: "?status=open&agencyId=atlas",
    });
  });
});

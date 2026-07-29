import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

const getOperationalAgencyContext = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ accessList: ["Shift Management"] as string[] }));
const createSuperAdminOperationalDataAdapter = vi.hoisted(() => vi.fn(() => ({
  searchClients: vi.fn(),
  searchStaff: vi.fn(),
  listServices: vi.fn(),
})));

vi.mock("react-router", async () => vi.importActual<typeof import("react-router")>("react-router"));
vi.mock("@/lib/api/super-admin-operations", () => ({ getOperationalAgencyContext }));
vi.mock("@/lib/operational-agency/dataAdapters", () => ({ createSuperAdminOperationalDataAdapter }));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "super-1",
      userType: "super_admin",
      profile: { accessList: auth.accessList },
    },
  }),
}));
vi.mock("@/pages/agency/scheduling/shifts", () => ({ default: () => null }));
vi.mock("@/pages/agency/scheduling/approvals", () => ({ default: () => null }));
vi.mock("@/pages/agency/scheduling/activity-logs", () => ({ default: () => null }));

import { SuperAdminShiftScope } from "./SuperAdminShiftList";

const atlas = {
  id: "atlas",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd"] as const,
  timezone: "America/New_York",
};
const beacon = { ...atlas, id: "beacon", name: "Beacon Supports" };

function SwitchAgency() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/super-admin/shifts/list?agencyId=beacon")}>
      Switch agency
    </button>
  );
}

describe("SuperAdminShiftScope route transitions", () => {
  beforeEach(() => {
    auth.accessList = ["Shift Management"];
    getOperationalAgencyContext.mockReset();
    createSuperAdminOperationalDataAdapter.mockClear();
  });

  it("never renders the previous agency provider under a newly requested agency URL", async () => {
    getOperationalAgencyContext
      .mockResolvedValueOnce(atlas)
      .mockImplementationOnce(() => new Promise(() => {}));
    const renders: Array<{ requested: string | null; provided: string }> = [];

    function Probe() {
      const location = useLocation();
      const operational = useOperationalAgency();
      renders.push({
        requested: new URLSearchParams(location.search).get("agencyId"),
        provided: operational.agencyId,
      });
      return <output aria-label="Scoped agency">{operational.agency.name}</output>;
    }

    render(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=atlas"]}>
        <Routes>
          <Route
            path="/super-admin/shifts/list"
            element={(
              <>
                <SwitchAgency />
                <SuperAdminShiftScope><Probe /></SuperAdminShiftScope>
              </>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Atlas Care")).toBeVisible();
    renders.length = 0;
    await userEvent.click(screen.getByRole("button", { name: "Switch agency" }));
    await waitFor(() => expect(getOperationalAgencyContext).toHaveBeenCalledWith(
      "shift-management",
      "beacon",
      expect.any(AbortSignal),
    ));

    expect(renders).not.toContainEqual({ requested: "beacon", provided: "atlas" });
    expect(screen.queryByText("Atlas Care")).not.toBeInTheDocument();
  });

  it("does not mount a shift route without Shift Management access", () => {
    auth.accessList = ["Billing Management"];

    render(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=atlas"]}>
        <Routes>
          <Route
            path="/super-admin/shifts/list"
            element={<SuperAdminShiftScope><div>Restricted shift page</div></SuperAdminShiftScope>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have Shift Management access.");
    expect(screen.queryByText("Restricted shift page")).not.toBeInTheDocument();
    expect(getOperationalAgencyContext).not.toHaveBeenCalled();
  });
});

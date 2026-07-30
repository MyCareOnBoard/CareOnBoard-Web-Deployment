import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "./OperationalAgencyProvider";
import { agencyShiftRoutes, superAdminShiftRoutes } from "./routes";

const agency = {
  id: "agency-1",
  name: "Care One",
  status: "active" as const,
  supportedClientTypes: ["ddd", "hha"] as const,
  timezone: "America/Denver",
};

const data = {
  searchClients: async () => ({ items: [], truncated: false, scanLimit: null }),
  searchStaff: async () => ({ items: [], truncated: false, scanLimit: null }),
  listServices: async () => ({ items: [], truncated: false, scanLimit: null }),
  getClientSchedulingContext: async () => ({ id: "client-1" }),
  getStaffSchedulingContext: async () => ({ id: "staff-1", workAvailability: false }),
  createStaffActivity: async () => ({}),
  createGoalDocument: async () => ({ id: "goal-1", status: "draft" as const }),
};

describe("OperationalAgencyProvider", () => {
  it("throws when operational context is requested outside its provider", () => {
    expect(() => renderHook(() => useOperationalAgency())).toThrow(
      "useOperationalAgency must be used within an OperationalAgencyProvider",
    );
  });

  it("exposes the explicit agency actor context without consulting auth", () => {
    const { result } = renderHook(() => useOperationalAgency(), {
      wrapper: ({ children }) => (
        <OperationalAgencyProvider
          actor="agency"
          agencyId="agency-1"
          agency={agency}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: true }}
          data={data}
        >
          {children}
        </OperationalAgencyProvider>
      ),
    });

    expect(result.current).toMatchObject({
      actor: "agency",
      agencyId: "agency-1",
      agency,
      mode: "ddd",
      capabilities: { canManageShifts: true, canManageBilling: false, shiftMaintenance: true },
    });
    expect(result.current.data).toBe(data);
    expect(result.current.routes.details("shift-9", "?tab=notes")).toBe(
      "/agency/shifts/shift-9?tab=notes",
    );
  });

  it("uses the supplied singular super-admin agency and propagates capabilities", () => {
    const directoryRoutes = {
      clientDetails: (clientId: string) => `/super-admin/clients/${clientId}?agencyId=selected-agency`,
      staffDetails: (staffId: string) => `/future/staff/${staffId}?agencyId=selected-agency`,
    };
    const { result } = renderHook(() => useOperationalAgency(), {
      wrapper: ({ children }) => (
        <OperationalAgencyProvider
          actor="super_admin"
          agencyId="selected-agency"
          agency={{ ...agency, id: "selected-agency" }}
          mode="hha"
          capabilities={{
            canManageShifts: true,
            canManageBilling: true,
            shiftMaintenance: false,
            canAccessClientDirectory: true,
            canAccessStaffDirectory: false,
          }}
          directoryRoutes={directoryRoutes}
          data={data}
        >
          {children}
        </OperationalAgencyProvider>
      ),
    });

    expect(result.current.agencyId).toBe("selected-agency");
    expect(result.current.agency.id).toBe("selected-agency");
    expect(result.current.routes.details("shift-9", "?agencyId=selected-agency")).toBe(
      "/super-admin/shifts/shift-9?agencyId=selected-agency",
    );
    expect(result.current.capabilities.canManageBilling).toBe(true);
    expect(result.current.capabilities.canAccessClientDirectory).toBe(true);
    expect(result.current.capabilities.canAccessStaffDirectory).toBe(false);
    expect(result.current.directoryRoutes).toBe(directoryRoutes);
  });
});

describe("operational shift route builders", () => {
  it.each([
    {
      label: "agency",
      routes: agencyShiftRoutes,
      expected: {
        index: "/agency/dashboard/shifts",
        list: "/agency/shifts/shifts",
        approvals: "/agency/shifts/approvals",
        activityLogs: "/agency/shifts/activity-logs",
        maintenance: "/agency/shifts/maintenance",
        details: "/agency/shifts/shift%2F9",
      },
    },
    {
      label: "super-admin",
      routes: superAdminShiftRoutes,
      expected: {
        index: "/super-admin/shifts",
        list: "/super-admin/shifts/list",
        approvals: "/super-admin/shifts/approvals",
        activityLogs: "/super-admin/shifts/activity-logs",
        maintenance: "/super-admin/shift-maintenance",
        details: "/super-admin/shifts/shift%2F9",
      },
    },
  ])("builds every $label shift route with encoded IDs and preserved search", ({ routes, expected }) => {
    const search = "?filter=mine&agencyId=agency-1";

    expect(routes.index(search)).toBe(`${expected.index}${search}`);
    expect(routes.list(search)).toBe(`${expected.list}${search}`);
    expect(routes.approvals(search)).toBe(`${expected.approvals}${search}`);
    expect(routes.activityLogs(search)).toBe(`${expected.activityLogs}${search}`);
    expect(routes.maintenance(search)).toBe(`${expected.maintenance}${search}`);
    expect(routes.details("shift/9", search)).toBe(`${expected.details}${search}`);
  });
});

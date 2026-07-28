import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "./OperationalAgencyProvider";

const agency = {
  id: "agency-1",
  name: "Care One",
  status: "active" as const,
  supportedClientTypes: ["ddd", "hha"] as const,
  timezone: "America/Denver",
};

const data = {
  searchClients: async () => [],
  searchStaff: async () => [],
  listServices: async () => [],
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
          capabilities={{ canManageShifts: true, canManageBilling: false }}
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
      capabilities: { canManageShifts: true, canManageBilling: false },
    });
    expect(result.current.data).toBe(data);
    expect(result.current.routes.details("shift-9", "?tab=notes")).toBe(
      "/agency/shifts/shift-9?tab=notes",
    );
  });

  it("uses the supplied singular super-admin agency and propagates capabilities", () => {
    const { result } = renderHook(() => useOperationalAgency(), {
      wrapper: ({ children }) => (
        <OperationalAgencyProvider
          actor="super_admin"
          agencyId="selected-agency"
          agency={{ ...agency, id: "selected-agency" }}
          mode="hha"
          capabilities={{ canManageShifts: true, canManageBilling: true }}
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
  });
});

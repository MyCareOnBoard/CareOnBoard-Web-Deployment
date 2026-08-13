import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../axios", () => ({ default: { get } }));
vi.mock("@/utils/auth/helpers/resolveEmailVerified", () => ({
  resolveEmailVerified: () => true,
}));

import { getUser } from "./users";

describe("getUser", () => {
  beforeEach(() => get.mockReset());

  it("maps the canonical super-admin scope profile fields", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          id: "super-1",
          uid: "super-1",
          email: "ada@example.com",
          fullName: "Ada Admin",
          userType: "super_admin",
          createdAt: "2026-07-26T00:00:00.000Z",
          updatedAt: "2026-07-26T00:00:00.000Z",
          superAdminAccess: {
            role: "Compliance Manager",
            roleTemplate: "compliance_manager",
            accessList: ["Compliance Monitor"],
            agencyScope: "selected",
            agencyIds: ["agency-a"],
          },
        },
      },
    });

    const mapped = await getUser();

    expect(mapped.profile).toMatchObject({
      role: "Compliance Manager",
      roleTemplate: "compliance_manager",
      accessList: ["Compliance Monitor"],
      agencyScope: "selected",
      agencyIds: ["agency-a"],
    });
  });

  it("keeps the agency bootstrap limited to identity and supported client types", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          id: "agency-1",
          uid: "agency-1",
          email: "owner@atlas.example",
          fullName: "Atlas Owner",
          userType: "agency",
          agencyId: "agency-1",
          createdAt: "2026-07-26T00:00:00.000Z",
          updatedAt: "2026-07-26T00:00:00.000Z",
          profile: {
            id: "agency-1",
            name: "Atlas Care",
            status: "active",
            supportedClientTypes: ["ddd"],
            address: "must not be trusted",
            checkPayrollProfile: { legalName: "must not be trusted" },
          },
        },
      },
    });

    const mapped = await getUser();

    expect(mapped.agency).toEqual({
      id: "agency-1",
      name: "Atlas Care",
      status: "active",
      supportedClientTypes: ["ddd"],
    });
    expect(mapped.profile).toEqual({
      id: "agency-1",
      name: "Atlas Care",
      status: "active",
      supportedClientTypes: ["ddd"],
    });
  });
});

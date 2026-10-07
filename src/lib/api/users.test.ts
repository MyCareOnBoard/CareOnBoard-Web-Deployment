import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../axios", () => ({ default: { get } }));
vi.mock("@/utils/auth/helpers/resolveEmailVerified", () => ({
  resolveEmailVerified: () => true,
}));

import { getUser } from "./users";

describe("getUser", () => {
  beforeEach(() => get.mockReset());

  it("maps a limited profile without trusting embedded product privileges", async () => {
    get.mockResolvedValueOnce({ data: { success: true, user: {
      uid: 'partner-1', email: 'partner@example.test', fullName: 'Partner Person', userType: 'agency_care',
      agencyId: 'forged-agency', agency: { id: 'forged-agency' }, payrollEmploymentId: 'forged-payroll',
      canOpenAgencyPayrollSetup: true, profile: { role: 'admin', accessList: ['Payroll Management'] },
    } } });
    const mapped = await getUser();
    expect(get).toHaveBeenCalledExactlyOnceWith('/users/profile');
    expect(mapped).toMatchObject({ uid: 'partner-1', userType: 'agency_care', emailVerified: true });
    for (const field of ['agencyId', 'agency', 'payrollEmploymentId', 'canOpenAgencyPayrollSetup']) expect(mapped).not.toHaveProperty(field);
    expect(mapped.profile).toEqual({ fullName: 'Partner Person', email: 'partner@example.test' });
  });

  it("preserves the employee profile role for HHA display fallbacks", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          id: "employee-1",
          uid: "employee-1",
          email: "caregiver@example.com",
          fullName: "Casey Caregiver",
          userType: "employee",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
          profile: {
            id: "employee-profile-1",
            role: "hha",
          },
        },
      },
    });

    const mapped = await getUser();

    expect(mapped.profile?.role).toBe("hha");
  });

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

it.each([true, false])('preserves saved work availability %s after a profile refresh', async workAvailability => {
  get.mockResolvedValueOnce({data: {success: true, user: {
    uid: 'employee-1', userType: 'employee', profile: {role: 'dsp', workAvailability},
  }}});
  expect((await getUser()).profile?.workAvailability).toBe(workAvailability);
});

import { describe, expect, it } from "vitest";
import { settingsRouteForUserType } from "./dashboardHeaderRoutes";
import { UserType } from "@/utils/auth/types";

describe("settingsRouteForUserType", () => {
  it("routes agency owners and staff to Agency Settings", () => {
    expect(settingsRouteForUserType(UserType.AGENCY)).toBe("/agency/agency-settings");
    expect(settingsRouteForUserType(UserType.AGENCY_STAFF)).toBe("/agency/agency-settings");
  });

  it("preserves the dedicated system, employee, and applicant destinations", () => {
    expect(settingsRouteForUserType(UserType.SUPER_ADMIN)).toBe("/super-admin/system-settings");
    expect(settingsRouteForUserType(UserType.EMPLOYEE)).toBe("/user-panel/settings");
    expect(settingsRouteForUserType(UserType.APPLICANT)).toBe("/applicant/settings");
  });
});

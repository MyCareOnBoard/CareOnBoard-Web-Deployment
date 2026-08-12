import type { Page } from "@playwright/test";

export const LEGACY_PAYROLL_ROUTE = "/agency/billing/payroll-management?agencyId=payroll-baseline-agency";

export async function seedLegacyAgencyOwner(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("agencyId", "payroll-baseline-agency");
    localStorage.setItem("persist:root", JSON.stringify({
      auth: JSON.stringify({ user: { uid: "payroll-baseline-owner", userType: "agency", agencyId: "payroll-baseline-agency", role: "agency-owner" } }),
      agencyMode: JSON.stringify({ currentAgencyId: "payroll-baseline-agency" }),
    }));
  });
  await page.route("**/billing/payroll/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const payload = pathname.endsWith("/dashboard")
      ? { success: true, data: { overview: {}, payrollByStatus: { segments: [] }, overtimeAlerts: [] } }
      : { success: true, data: { entries: [], invoices: [], total: 0 } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
  });
  await page.route("**/agencies/**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { id: "payroll-baseline-agency", name: "Baseline Agency" } }) }));
  await page.route("**/agencyStaff/**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { entries: [], total: 0 } }) }));
}

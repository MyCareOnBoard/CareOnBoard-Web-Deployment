import { Routes } from "./constants";

export function preloadDirectAgencyPayrollRoute(
  pathname: string,
  load: () => Promise<unknown>,
): void {
  if (pathname === Routes.agency.billing.payrollManagement) {
    void load().catch(() => undefined);
  }
}

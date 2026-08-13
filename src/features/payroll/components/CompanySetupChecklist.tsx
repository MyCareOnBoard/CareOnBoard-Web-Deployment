import type { AgencyPayrollSetupProjection } from "../model/types";
export function CompanySetupChecklist({ projection }: { projection: AgencyPayrollSetupProjection }) {
  return <section aria-labelledby="company-setup-heading" className="border-b border-[#e5e7eb] pb-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Company record</p><h2 id="company-setup-heading" className="mt-1 text-xl font-semibold text-[#10141a]">Payroll company setup</h2>{projection.readiness.blockers.length ? <ul className="mt-4 space-y-2 text-sm text-[#5d626b]">{projection.readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p className="mt-3 text-sm text-[#5d626b]">Current status: {projection.readiness.status.replaceAll("_", " ")}.</p>}</section>;
}

import { describe, expect, it } from "vitest";
import { canUsePayrollAction } from "./capabilities";
const projection = (overrides = {}) => ({ projectionRevision: 1, readiness: { status: "ready", blockers: [], nextAction: null }, setup: { designatedSignerPresent: false, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: false }, capabilities: { canView: true, canManage: true, canDesignateSigner: true, createCompanyOnboardSession: false }, ...overrides } as any);
describe("canUsePayrollAction", () => {
  it("uses only exact server capability booleans", () => { expect(canUsePayrollAction(projection(), "designate_signer")).toBe(true); expect(canUsePayrollAction(projection({ capabilities: { canView: true, canManage: true, canDesignateSigner: false, createCompanyOnboardSession: false } }), "designate_signer")).toBe(false); });
});

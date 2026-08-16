import { describe, expect, it, vi } from "vitest";
import axiosClient from "@/lib/axios";
import { getUser } from "./users";
vi.mock("@/lib/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@/utils/auth/helpers/resolveEmailVerified", () => ({ resolveEmailVerified: () => true }));
describe("getUser payroll bootstrap", () => {
  it("maps only an explicit true setup capability", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, user: { uid: "u", email: "x@y.z", fullName: "X", userType: "agency", createdAt: {}, updatedAt: {}, canOpenAgencyPayrollSetup: true } } } as any);
    await expect(getUser()).resolves.toMatchObject({ canOpenAgencyPayrollSetup: true });
  });
  it("copies only a nonempty server payroll employment identity", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, user: { uid: "u", email: "x@y.z", fullName: "X", userType: "employee", createdAt: {}, updatedAt: {}, payrollEmploymentId: "employment-1" } } } as any);
    await expect(getUser()).resolves.toMatchObject({ payrollEmploymentId: "employment-1" });

    vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, user: { uid: "u", email: "x@y.z", fullName: "X", userType: "employee", createdAt: {}, updatedAt: {}, payrollEmploymentId: "" } } } as any);
    await expect(getUser()).resolves.not.toHaveProperty("payrollEmploymentId");
  });
});

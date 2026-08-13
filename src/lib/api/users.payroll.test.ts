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
});

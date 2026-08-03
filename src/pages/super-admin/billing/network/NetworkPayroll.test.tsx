import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ app: {}, auth: {}, db: {} }));
vi.mock("@/utils/auth/store/authSlice", () => ({
  default: (state = {}) => state,
  logoutUser: { fulfilled: { type: "auth/logout/fulfilled" } },
}));
vi.mock("@/utils/auth/services/authService", () => ({}));
vi.mock("react-loader-spinner", () => ({ Oval: () => null }));

import NetworkPayroll from "./NetworkPayroll";

describe("NetworkPayroll", () => {
  it("provides a provider-free network payroll controller", () => {
    expect(NetworkPayroll).toBeTypeOf("function");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/auth/store/authSlice", () => ({
  default: () => ({ user: null }),
  logoutUser: { fulfilled: { type: "auth/logout/fulfilled" } },
}));
vi.mock("@/utils/auth/services/authService", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {}, app: {} }));
vi.mock("react-loader-spinner", () => ({ Oval: () => null }));

import NetworkClaims from "./NetworkClaims";

describe("NetworkClaims", () => {
  it("owns a provider-free network claims route", () => {
    expect(NetworkClaims).toBeTypeOf("function");
  });
});

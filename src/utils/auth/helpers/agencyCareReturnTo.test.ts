import { describe, expect, it } from "vitest";
import { agencyCareReturnTo, authRouteWithReturnTo } from "./agencyCareReturnTo";

describe("Agency Care authentication continuation", () => {
  const invitation = "/agency-care/invitations/eyJpZCI6Imludml0ZSJ9.signature_123-abc?agencyKey=internal%3Addd-agency";

  it("preserves a signed invitation and its intended agency through authentication", () => {
    expect(agencyCareReturnTo(invitation)).toBe(invitation);
    for (const route of ["/auth/login", "/auth/mfa"]) {
      const destination = new URL(authRouteWithReturnTo(route, invitation), "https://app.example");
      expect(destination.pathname).toBe(route);
      expect(destination.searchParams.get("returnTo")).toBe(invitation);
    }
  });

  it("preserves existing canonical care destinations", () => {
    for (const value of ["/agency-care", "/agency-care/clients", "/agency-care/networks/network-1/overview?agencyKey=internal%3Addd-agency"]) {
      expect(agencyCareReturnTo(value)).toBe(value);
    }
  });

  it.each([
    "https://untrusted.example/agency-care",
    "//untrusted.example/agency-care",
    "/agency-care/../auth/login",
    "/agency-care/invitations/..",
    "/agency-care/invitations/payload.signature/../../auth/login",
    "/agency-care/invitations/payload..signature",
    "/agency-care/invitations/%2e%2e",
    "/agency-care/invitations/payload.signature\\auth",
    "/agency-care/invitations/payload.signature\n",
  ])("rejects unsafe continuation %j", (value) => {
    expect(agencyCareReturnTo(value)).toBeNull();
    expect(authRouteWithReturnTo("/auth/login", value)).toBe("/auth/login");
  });
});

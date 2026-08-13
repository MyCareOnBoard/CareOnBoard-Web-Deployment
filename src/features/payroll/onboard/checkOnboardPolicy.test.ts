import { describe, expect, it } from "vitest";
import { CHECK_ONBOARD_ORIGIN, CHECK_ONBOARD_SCRIPT_URL, isTrustedCheckOnboardUrl } from "./checkOnboardPolicy";

describe("Check Onboard policy", () => {
  it("pins the exact Check CDN and rejects other origins", () => {
    expect(CHECK_ONBOARD_SCRIPT_URL).toBe("https://cdn.checkhq.com/onboard-initialize.js");
    expect(CHECK_ONBOARD_ORIGIN).toBe("https://cdn.checkhq.com");
    expect(isTrustedCheckOnboardUrl("https://cdn.checkhq.com/onboard-initialize.js")).toBe(true);
    expect(isTrustedCheckOnboardUrl("https://evil.example/onboard-initialize.js")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { finalizeAgencyCreation } from "./agencyCreationAccessRefresh";

describe("finalizeAgencyCreation", () => {
  it("preserves committed success and navigation when restricted scope refresh fails", async () => {
    const events: string[] = [];
    const refreshFailure = new Error("refresh failed");
    const onRefreshFailure = vi.fn(() => events.push("warning"));

    await expect(finalizeAgencyCreation({
      isRestricted: true,
      showSuccess: () => events.push("success"),
      navigate: () => events.push("navigate"),
      refreshProfile: vi.fn(async () => {
        events.push("refresh");
        throw refreshFailure;
      }),
      onRefreshFailure,
    })).resolves.toBeUndefined();

    expect(events).toEqual(["success", "navigate", "refresh", "warning"]);
    expect(onRefreshFailure).toHaveBeenCalledWith(refreshFailure);
  });

  it("does not refresh global administrators after committed creation", async () => {
    const refreshProfile = vi.fn();
    await finalizeAgencyCreation({
      isRestricted: false,
      showSuccess: vi.fn(),
      navigate: vi.fn(),
      refreshProfile,
      onRefreshFailure: vi.fn(),
    });
    expect(refreshProfile).not.toHaveBeenCalled();
  });
});

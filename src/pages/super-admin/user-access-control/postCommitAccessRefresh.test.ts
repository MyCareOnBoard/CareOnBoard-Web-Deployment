import { describe, expect, it, vi } from "vitest";
import { refreshCommittedAccess } from "./postCommitAccessRefresh";

describe("refreshCommittedAccess", () => {
  it("waits for profile refresh before evicting scoped caches", async () => {
    let resolve!: () => void;
    const refreshProfile = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const resetCaches = vi.fn();
    const completion = refreshCommittedAccess({ refreshProfile, resetCaches });
    expect(resetCaches).not.toHaveBeenCalled();
    resolve();
    await expect(completion).resolves.toBe(true);
    expect(resetCaches).toHaveBeenCalledOnce();
  });

  it("reports refresh failure without rejecting the committed operation", async () => {
    const failure = new Error("refresh unavailable");
    const onFailure = vi.fn();
    const resetCaches = vi.fn();
    await expect(refreshCommittedAccess({
      refreshProfile: vi.fn().mockRejectedValue(failure),
      resetCaches,
      onFailure,
    })).resolves.toBe(false);
    expect(onFailure).toHaveBeenCalledWith(failure);
    expect(resetCaches).not.toHaveBeenCalled();
  });
});

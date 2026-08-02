import { describe, expect, it, vi } from "vitest";
import { refreshCommittedAccessProfile } from "./postCommitAccessRefresh";

describe("refreshCommittedAccess", () => {
  it("evicts scoped caches before waiting for profile refresh", async () => {
    let resolve!: (profile: { uid: string }) => void;
    const refreshProfile = vi.fn(
      () => new Promise<{ uid: string }>((done) => { resolve = done; }),
    );
    const resetCaches = vi.fn();
    const completion = refreshCommittedAccessProfile({ refreshProfile, resetCaches });
    expect(resetCaches).toHaveBeenCalledOnce();
    resolve({ uid: "u1" });
    await expect(completion).resolves.toEqual({ uid: "u1" });
    expect(resetCaches).toHaveBeenCalledOnce();
  });

  it("resets scoped caches before refreshProfile can publish changed authorization", async () => {
    const events: string[] = [];
    const completion = refreshCommittedAccessProfile({
      refreshProfile: vi.fn(() => {
        events.push("auth-published");
        return Promise.resolve({ uid: "u1" });
      }),
      resetCaches: () => { events.push("reset"); },
    }).then((profile) => {
      events.push("resolved");
      return profile;
    });

    await expect(completion).resolves.toEqual({ uid: "u1" });
    expect(events).toEqual(["reset", "auth-published", "resolved"]);
  });

  it("reports refresh failure without rejecting after pre-refresh cache eviction", async () => {
    const failure = new Error("refresh unavailable");
    const onFailure = vi.fn();
    const resetCaches = vi.fn();
    await expect(refreshCommittedAccessProfile({
      refreshProfile: vi.fn().mockRejectedValue(failure),
      resetCaches,
      onFailure,
    })).resolves.toBeNull();
    expect(onFailure).toHaveBeenCalledWith(failure);
    expect(resetCaches).toHaveBeenCalledOnce();
  });

  it("treats a resolved null profile as a failed refresh after cache eviction", async () => {
    const onFailure = vi.fn();
    const resetCaches = vi.fn();

    await expect(refreshCommittedAccessProfile({
      refreshProfile: vi.fn().mockResolvedValue(null),
      resetCaches,
      onFailure,
    })).resolves.toBeNull();

    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(resetCaches).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import { refreshCommittedAccessProfile } from "./postCommitAccessRefresh";

describe("refreshCommittedAccess", () => {
  it("waits for profile refresh before evicting scoped caches", async () => {
    let resolve!: (profile: { uid: string }) => void;
    const refreshProfile = vi.fn(
      () => new Promise<{ uid: string }>((done) => { resolve = done; }),
    );
    const resetCaches = vi.fn();
    const completion = refreshCommittedAccessProfile({ refreshProfile, resetCaches });
    expect(resetCaches).not.toHaveBeenCalled();
    resolve({ uid: "u1" });
    await expect(completion).resolves.toEqual({ uid: "u1" });
    expect(resetCaches).toHaveBeenCalledOnce();
  });

  it("resets scoped caches before resolving access refresh to the route caller", async () => {
    const events: string[] = [];
    const completion = refreshCommittedAccessProfile({
      refreshProfile: vi.fn().mockResolvedValue({ uid: "u1" }),
      resetCaches: () => { events.push("reset"); },
    }).then((profile) => {
      events.push("resolved");
      return profile;
    });

    await expect(completion).resolves.toEqual({ uid: "u1" });
    expect(events).toEqual(["reset", "resolved"]);
  });

  it("reports refresh failure without rejecting the committed operation", async () => {
    const failure = new Error("refresh unavailable");
    const onFailure = vi.fn();
    const resetCaches = vi.fn();
    await expect(refreshCommittedAccessProfile({
      refreshProfile: vi.fn().mockRejectedValue(failure),
      resetCaches,
      onFailure,
    })).resolves.toBeNull();
    expect(onFailure).toHaveBeenCalledWith(failure);
    expect(resetCaches).not.toHaveBeenCalled();
  });

  it("treats a resolved null profile as a failed refresh and preserves caches", async () => {
    const onFailure = vi.fn();
    const resetCaches = vi.fn();

    await expect(refreshCommittedAccessProfile({
      refreshProfile: vi.fn().mockResolvedValue(null),
      resetCaches,
      onFailure,
    })).resolves.toBeNull();

    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(resetCaches).not.toHaveBeenCalled();
  });
});

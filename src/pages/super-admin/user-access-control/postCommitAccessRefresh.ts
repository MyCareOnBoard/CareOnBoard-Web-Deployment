type RefreshCommittedAccessOptions<T> = {
  refreshProfile: () => Promise<T | null>;
  resetCaches?: () => void;
  onFailure?: (error: unknown) => void;
};

export async function refreshCommittedAccessProfile<T>({
  refreshProfile,
  resetCaches,
  onFailure,
}: RefreshCommittedAccessOptions<T>): Promise<T | null> {
  try {
    const profile = await refreshProfile();
    if (profile == null) {
      throw new Error("Profile refresh returned no active profile.");
    }
    resetCaches?.();
    return profile;
  } catch (error) {
    onFailure?.(error);
    return null;
  }
}

export async function refreshCommittedAccess(
  options: RefreshCommittedAccessOptions<unknown>,
): Promise<boolean> {
  return (await refreshCommittedAccessProfile(options)) !== null;
}

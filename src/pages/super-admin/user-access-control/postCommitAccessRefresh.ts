type RefreshCommittedAccessOptions = {
  refreshProfile: () => Promise<unknown>;
  resetCaches?: () => void;
  onFailure?: (error: unknown) => void;
};

export async function refreshCommittedAccess({
  refreshProfile,
  resetCaches,
  onFailure,
}: RefreshCommittedAccessOptions): Promise<boolean> {
  try {
    const profile = await refreshProfile();
    if (profile == null) {
      throw new Error("Profile refresh returned no active profile.");
    }
    resetCaches?.();
    return true;
  } catch (error) {
    onFailure?.(error);
    return false;
  }
}

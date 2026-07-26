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
    await refreshProfile();
    resetCaches?.();
    return true;
  } catch (error) {
    onFailure?.(error);
    return false;
  }
}

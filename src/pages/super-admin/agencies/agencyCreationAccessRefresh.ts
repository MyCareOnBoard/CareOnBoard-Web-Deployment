import { refreshCommittedAccess } from "../user-access-control/postCommitAccessRefresh";

type FinalizeAgencyCreationOptions = {
  isRestricted: boolean;
  showSuccess: () => void;
  navigate: () => void;
  refreshProfile: () => Promise<unknown>;
  onRefreshFailure: (error: unknown) => void;
  onRefreshSuccess?: () => void;
};

export async function finalizeAgencyCreation({
  isRestricted,
  showSuccess,
  navigate,
  refreshProfile,
  onRefreshFailure,
  onRefreshSuccess,
}: FinalizeAgencyCreationOptions): Promise<void> {
  showSuccess();
  navigate();

  if (!isRestricted) return;

  const refreshed = await refreshCommittedAccess({
    refreshProfile,
    onFailure: onRefreshFailure,
  });
  if (refreshed) onRefreshSuccess?.();
}

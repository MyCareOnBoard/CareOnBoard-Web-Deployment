import { refreshCommittedAccess } from "../user-access-control/postCommitAccessRefresh";

type FinalizeAgencyCreationOptions = {
  isRestricted: boolean;
  showSuccess: () => void;
  navigate: () => void;
  refreshProfile: () => Promise<unknown>;
  onRefreshFailure: (error: unknown) => void;
};

export async function finalizeAgencyCreation({
  isRestricted,
  showSuccess,
  navigate,
  refreshProfile,
  onRefreshFailure,
}: FinalizeAgencyCreationOptions): Promise<void> {
  showSuccess();
  navigate();

  if (!isRestricted) return;

  await refreshCommittedAccess({
    refreshProfile,
    onFailure: onRefreshFailure,
  });
}

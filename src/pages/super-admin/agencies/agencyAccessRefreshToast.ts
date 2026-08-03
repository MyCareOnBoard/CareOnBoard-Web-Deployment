import {toast} from "sonner";
import {refreshCommittedAccess} from "../user-access-control/postCommitAccessRefresh";

export const AGENCY_ACCESS_REFRESH_TOAST_ID = "agency-access-refresh";

export function dismissAgencyAccessRefreshWarning(): void {
  toast.dismiss(AGENCY_ACCESS_REFRESH_TOAST_ID);
}

export function showAgencyAccessRefreshWarning(
  refreshProfile: () => Promise<unknown>,
  resetCaches: () => void,
): void {
  toast.warning("Agency created, but access refresh failed", {
    id: AGENCY_ACCESS_REFRESH_TOAST_ID,
    description: "The agency was saved. Retry to update which agencies you can access.",
    duration: Infinity,
    action: {
      label: "Retry",
      onClick: () => retryAgencyAccessRefresh(refreshProfile, resetCaches),
    },
  });
}

async function retryAgencyAccessRefresh(
  refreshProfile: () => Promise<unknown>,
  resetCaches: () => void,
): Promise<boolean> {
  const refreshed = await refreshCommittedAccess({refreshProfile, resetCaches});

  if (refreshed) {
    dismissAgencyAccessRefreshWarning();
  } else {
    showAgencyAccessRefreshWarning(refreshProfile, resetCaches);
  }

  return refreshed;
}

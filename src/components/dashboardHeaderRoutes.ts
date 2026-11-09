import { Routes } from "@/routes/constants";
import { UserType } from "@/utils/auth/types/user.types";

export const settingsRouteForUserType = (userType: UserType) =>
  userType === UserType.AGENCY_CARE
    ? '/agency-care/settings'
    : userType === UserType.SUPER_ADMIN
    ? Routes.superAdmin.systemSettings
    : userType === UserType.AGENCY || userType === UserType.AGENCY_STAFF
      ? Routes.agency.agencySettings
      : Routes.common.settings.replace(":userType", userType === UserType.EMPLOYEE ? "user-panel" : "applicant");

const CARE_CONNECT_SEGMENTS: Partial<Record<UserType, string>> = {
  [UserType.EMPLOYEE]: "user",
  [UserType.AGENCY]: "agency",
  [UserType.AGENCY_STAFF]: "agency",
};

export const careConnectDashboardUrl = (userType: UserType) => {
  const segment = CARE_CONNECT_SEGMENTS[userType];
  return segment ? `https://care-connect-three-eosin.vercel.app/${segment}/dashboard` : null;
};

import { Routes } from "@/routes/constants";
import { UserType } from "@/utils/auth/types/user.types";

export const settingsRouteForUserType = (userType: UserType) =>
  userType === UserType.SUPER_ADMIN
    ? Routes.superAdmin.systemSettings
    : userType === UserType.AGENCY || userType === UserType.AGENCY_STAFF
      ? Routes.agency.agencySettings
      : Routes.common.settings.replace(":userType", userType === UserType.EMPLOYEE ? "user-panel" : "applicant");

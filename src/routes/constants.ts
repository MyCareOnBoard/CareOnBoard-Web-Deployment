export const Routes = {
  root: "/",
  splash: "/splash",
  app: "/",
  applicant: {
    dashboard: "/applicant/dashboard",
    application: "/applicant/dashboard/application",
    documents: "/applicant/dashboard/documents",
    helpCenter: "/applicant/dashboard/help-center",
    settings: "/applicant/dashboard/settings",
    profile: "/applicant/dashboard/profile",
  },
  userPanel: {
    dashboard: "/user-panel/dashboard",
    shiftManagement: "/user-panel/shift-management",
    manualShiftManagement: "/user-panel/shift-management/manual",
    clientsAndServices: "/user-panel/clients-and-services",
    planOfCare: "/user-panel/plan-of-care",
    notes: "/user-panel/notes",
    mileage: "/user-panel/mileage",
    expenses: "/user-panel/expenses",
    helpCenter: "/user-panel/dashboard/help-center",
    settings: "/user-panel/dashboard/settings",
    profile: "/user-panel/dashboard/profile",
  },
  auth: {
    login: "/auth/login",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  onboarding: {
    index: "/onboarding",
    email: "/onboarding/email",
    otp: "/onboarding/otp",
    success: "/onboarding/success",
  },
  common: {
    helpCenter: "/:userType/dashboard/help-center",
    settings: "/:userType/dashboard/settings",
    profile: "/:userType/dashboard/profile",
  }
};
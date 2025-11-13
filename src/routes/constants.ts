export const Routes = {
  root: "/",
  splash: "/splash",
  app: "/",
  applicant: {
    dashboard: "/applicant/dashboard",
    application: "/applicant/dashboard/application",
    documents: "/applicant/dashboard/documents",
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
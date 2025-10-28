import { createBrowserRouter, RouteObject } from "react-router";
import SplashScreen from "@/features/splash";
import LoginPage from "@/layouts/login/page";
import SignUpPage from "@/layouts/signup/page";
import ForgotPasswordPage from "@/layouts/forgot-password/page";
import DashboardPage from "@/layouts/dashboard/page";
import {Routes} from "@/routes/constants";

const routerRoutes: RouteObject[] = [
  {
    path: Routes.splash,
    Component: SplashScreen
  },
  {
    path: "/login",
    Component: LoginPage
  },
  {
    path: "/signup",
    Component: SignUpPage
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage
  },
  {
    path: "/dashboard",
    Component: DashboardPage
  },
]

export const router = createBrowserRouter(routerRoutes);

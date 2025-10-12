import { createBrowserRouter, RouteObject } from "react-router";
import SplashScreen from "@/features/splash";
import ApplicationDashboard from "@/features/application";
import { Routes } from "@/routes/constants";

const routerRoutes: RouteObject[] = [
  {
    path: Routes.splash,
    Component: SplashScreen
  },
  {
    path: Routes.application,
    Component: ApplicationDashboard
  }
]

export const router = createBrowserRouter(routerRoutes);

import { createBrowserRouter, RouteObject } from "react-router";
import SplashScreen from "@/features/splash";
import {Routes} from "@/routes/constants";

const routerRoutes: RouteObject[] = [
  {
    path: Routes.splash,
    Component: SplashScreen
  },
]

export const router = createBrowserRouter(routerRoutes);

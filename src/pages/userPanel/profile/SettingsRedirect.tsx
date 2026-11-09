import { Navigate, useLocation } from "react-router";
import { Routes } from "@/routes/constants";

/** Settings now live on the profile page; old links (and their ?tab=) still land there. */
export default function UserPanelSettingsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${Routes.userPanel.profile}${search}`} replace />;
}

import { Navigate, useLocation } from "react-router";
import { Routes } from "@/routes/constants";

export default function LegacyShiftSectionRedirect() {
  const location = useLocation();
  return <Navigate replace to={`${Routes.superAdmin.shifts.index}${location.search}`} />;
}

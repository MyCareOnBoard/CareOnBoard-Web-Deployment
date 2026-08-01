import { Navigate, useLocation } from "react-router";
import { Routes } from "@/routes/constants";

export default function SuperAdminShiftMaintenance() {
  const location = useLocation();
  return <Navigate replace to={`${Routes.superAdmin.shifts.maintenance}${location.search}`} />;
}

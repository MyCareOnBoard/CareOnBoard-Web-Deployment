import { Navigate } from "react-router";
import { Routes } from "@/routes/constants";

export default function BillingIndexRedirect() {
  return <Navigate to={Routes.agency.billing.financialOverview} replace />;
}

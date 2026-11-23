import { Navigate, useSearchParams } from "react-router";
import { Routes } from "@/routes/constants";
import { careSearch } from "@/components/ci/carePanel";

/** Old link: day program now opens as a Care & support panel over Shift management. */
export default function UserDayProgramPage() {
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || undefined;
  return <Navigate replace to={{ pathname: Routes.userPanel.shiftManagement, search: careSearch("day", { date }) }} />;
}

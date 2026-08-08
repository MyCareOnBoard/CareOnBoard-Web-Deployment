import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStaffDetailQuery } from "@/lib/api/staff-directory";
import { Routes } from "@/routes/constants";
import { StaffDocumentsTab } from "./StaffDocumentsTab";
import { StaffProfileTab } from "./StaffProfileTab";
import { StaffShiftsTab } from "./StaffShiftsTab";

const ACCOUNT_TYPE_LABELS = {
  employee: "Employee",
  internal_user: "Agency Staff",
  agency_admin: "Agency Administrator",
} as const;

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

export default function SuperAdminStaffDetails() {
  const { staffId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const detail = useGetStaffDetailQuery(staffId, { skip: !staffId });
  const staff = detail.data?.staff;
  const employee = staff?.accountType === "employee";
  const allowedTabs = employee ? ["profile", "shifts", "documents"] : ["profile"];
  const requestedTab = searchParams.get("tab") || "profile";
  const tab = allowedTabs.includes(requestedTab) ? requestedTab : "profile";
  const accountTypeLabel = staff ? ACCOUNT_TYPE_LABELS[staff.accountType] : "";
  const distinctRole = !employee && staff?.role?.trim() && staff.role.trim().toLowerCase() !== accountTypeLabel.toLowerCase()
    ? staff.role
    : null;

  useEffect(() => {
    if (staff && requestedTab !== tab) setSearchParams({ tab }, { replace: true });
  }, [requestedTab, setSearchParams, staff, tab]);

  if (detail.isError || (!detail.isLoading && !staff)) return <div className="py-16 text-center"><p className="text-sm text-[#808081]">Staff member not found.</p><Button className="mt-4" variant="outline" onClick={() => navigate(Routes.superAdmin.staffDirectory)}>Back to staff directory</Button></div>;

  return <div className="min-h-[calc(100vh-200px)]">
    <div className="mb-6 flex items-center gap-4"><button type="button" aria-label="Back to staff directory" onClick={() => navigate(Routes.superAdmin.staffDirectory)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-[rgba(255,255,255,0.7)]"><ArrowLeft className="h-5 w-5 text-[#10141a]" /></button><h1 className="text-3xl font-semibold text-[#10141a] sm:text-[40px]">Staff Details</h1></div>
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      {detail.isLoading || !staff ? <div aria-label="Loading staff header" aria-busy="true" className="flex gap-4 sm:gap-6"><Skeleton className="h-28 w-24 rounded-xl sm:h-[145px] sm:w-[127px]" /><div className="space-y-3 pt-2"><Skeleton className="h-7 w-48 sm:w-56" /><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-44" /></div></div> : <div className="flex items-start gap-4 sm:gap-6"><Avatar className="h-28 w-24 rounded-[12px] sm:h-[145px] sm:w-[127px]">{staff.avatarUrl ? <AvatarImage src={staff.avatarUrl} alt={staff.name} className="h-full w-full rounded-[12px] object-cover" /> : null}<AvatarFallback className="h-full w-full rounded-[12px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-xl font-semibold text-white">{initials(staff.name)}</AvatarFallback></Avatar><div className="min-w-0 pt-1"><h2 className="truncate text-[24px] font-semibold leading-normal text-[#10141a]">{staff.name}</h2><div className="mt-1 flex flex-col gap-1 text-[12px] font-medium text-[#808081]">{distinctRole ? <span>{distinctRole}</span> : null}<span>{accountTypeLabel}</span></div>{staff.clientTypes.length ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Client types">{staff.clientTypes.map((type) => <span key={type} className="rounded-full border border-[#00b4b8]/30 bg-[#00b4b8]/10 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-[#008f93]">{type}</span>)}</div> : null}</div></div>}
      {staff ? <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Staff details sections">{allowedTabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setSearchParams({ tab: item })} className={`h-[36px] cursor-pointer rounded-[200px] border px-[16px] py-[8px] text-[12px] font-medium leading-[1.4] capitalize backdrop-blur-[22px] ${item === "documents" ? "w-[100px]" : "w-[80px]"} ${tab === item ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#b2b2b3] text-[#b2b2b3]"}`}>{item}</button>)}</div> : null}
    </div>
    {staff && tab === "profile" ? <StaffProfileTab staff={staff} /> : null}
    {staff && employee && tab === "shifts" ? <StaffShiftsTab staffId={staffId} employeeId={staff.id.slice("employee:".length)} agencyId={staff.agencyId} /> : null}
    {staff && employee && tab === "documents" ? <StaffDocumentsTab staffId={staffId} /> : null}
  </div>;
}

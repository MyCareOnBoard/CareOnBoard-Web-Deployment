import {Link} from "react-router";
import {ArrowLeft} from "lucide-react";
import {Routes} from "@/routes/constants";
import {useAuth} from "@/utils/auth";
import ManualTimesheetForm, {useTimesheetState} from "./ManualTimesheetForm";

/**
 * Full-page manual timesheet. Support coordinators land here from "Timesheets";
 * other staff usually open the same form as a dialog from Shift Management.
 */
export default function ManualShiftManagementPage() {
  const {user} = useAuth();
  const timesheet = useTimesheetState({enabled: true});
  const isSupportCoordinator = user?.applicantType === "support_coordinator" || user?.role === "support_coordinator";

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#10141a] sm:text-[32px] dark:text-[#f4f6f7]">Shift Management</h1>
          <p className="mt-1 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">Manual Time Sheet (Bi-weekly Employee Work Record)</p>
        </div>
        {!isSupportCoordinator && (
          <Link
            to={Routes.userPanel.shiftManagement}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#007679] px-5 text-sm font-semibold text-[#005759] hover:bg-[#007679]/10 dark:border-[#7fe0e2] dark:text-[#7fe0e2]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to schedule
          </Link>
        )}
      </div>
      <div className="rounded-[24px] border border-[#e6ecee] bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-[#11191c]">
        <ManualTimesheetForm state={timesheet} />
      </div>
    </div>
  );
}

import { useLocation, useNavigate } from "react-router";
import NotesReviewWorkspace from "@/pages/shared/notes/NotesReviewWorkspace";
import ShiftManagementHeader from "@/pages/super-admin/shift-management/ShiftManagementHeader";
import {
  resolveNotesWorkspace,
  updateNotesAgency,
  updateNotesDateRange,
} from "./notesWorkspaceState";

export default function SuperAdminNotesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = resolveNotesWorkspace(location.search);

  const changeAgency = (ids: string[]) => {
    const transition = updateNotesAgency(location.search, ids);
    navigate({ pathname: location.pathname, search: transition.search });
  };

  const changeDateRange = (range: { startDate: string; endDate: string }) => {
    const transition = updateNotesDateRange(location.search, range);
    navigate({ pathname: location.pathname, search: transition.search });
  };

  return (
    <div className="space-y-5 pb-6">
      <ShiftManagementHeader
        title="Notes"
        feature="notes"
        dateRange={workspace}
        selectedAgencyIds={workspace.agencyId ? [workspace.agencyId] : []}
        onAgencySelectionChange={changeAgency}
        onDateRangeChange={changeDateRange}
        dateRangeControlLabel="Change notes date range"
        dateRangeDialogTitle="Select notes date range"
        dateRangeDescription="Choose the dates to show in Notes"
      />
      <NotesReviewWorkspace
        agencyId={workspace.agencyId}
        startDate={workspace.startDate}
        endDate={workspace.endDate}
        readOnly
        showAgencyColumn={!workspace.agencyId}
      />
    </div>
  );
}

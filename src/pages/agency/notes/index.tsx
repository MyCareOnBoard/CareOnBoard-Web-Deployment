import { useSelector } from "react-redux";
import NotesReviewWorkspace from "@/pages/shared/notes/NotesReviewWorkspace";
import type { RootState } from "@/store/redux/store";
import { useAuth } from "@/utils/auth";

export default function AgencyNotesPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);

  return (
    <NotesReviewWorkspace
      agencyId={agencyId || undefined}
      clientType={selectedMode}
      readOnly={false}
      showPageHeading
    />
  );
}

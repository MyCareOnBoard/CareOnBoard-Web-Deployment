import {useSearchParams} from 'react-router';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {validComplianceId} from '@/pages/agency/compliance-alerts/workspaceScope';
import {lazy, Suspense, useEffect, useState} from "react";
import {ChevronRight, GraduationCap, Plus} from "lucide-react";
import AgencyAssignTrainingModal, {SaveTrainingData} from "@/pages/agency/trainings/assignTraining";
const ReviewTrainingsModal = lazy(() => import('./reviewTrainingsModal'));
import {useGetTrainingsQuery, useSaveTrainingMutation, TrainingStaff} from "@/pages/agency/trainings/trainingApi";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import {useStaffLabels} from "@/hooks/useStaffLabels";
import {useEffectiveAgencyMode} from '@/hooks/useEffectiveAgencyMode';
import {AgencyPageHeader} from '@/components/agency/AgencyShell';
import {
  AgencyListCard, AgencyPerson, AgencyPill, AgencySearchField, agencyOutlineButton, agencyRowLink,
  agencyTd, agencyTh, agencyTheadRow, agencyTr,
} from '@/components/agency/AgencyListKit';
import {cn} from '@/lib/utils';

const PAGE_SIZE = 8;

const pageButton = "inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#dcdfe2] bg-white px-3 text-[13px] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

/** "not assigned" → "Not assigned"; other statuses keep their words. */
const statusLabel = (status?: string) => {
  const text = (status || "Not Assigned").trim();
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
const isUnassigned = (status?: string) => (status || "Not Assigned").toLowerCase() === "not assigned";

export default function AgencyTrainings() {
  const scopeKey = JSON.stringify([useAssignmentReviewScope(), useEffectiveAgencyMode()]);
  return <AgencyTrainingsView key={scopeKey} scopeKey={scopeKey}/>;
}

function AgencyTrainingsView({scopeKey}: {scopeKey: string}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId');
  const validSelection = employeeId !== null && validComplianceId(employeeId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<TrainingStaff | null>(null);

  const {labels} = useStaffLabels();
  const staffLabel = labels.noun;
  const {user} = useAuth();
  const mode = useEffectiveAgencyMode();
  const [saveTraining, {isLoading}] = useSaveTrainingMutation();
  const {currentData: trainings, isFetching: trainingsLoading, isError: trainingsError} = useGetTrainingsQuery({scopeKey, agencyId: user?.agencyId!, search: searchQuery || undefined, limit: PAGE_SIZE, cursor, mode: mode ?? undefined}, {
    skip: !user?.agencyId,
    refetchOnMountOrArgChange: true
  });
  useEffect(() => { setCursor(undefined); setCursorHistory([]); }, [user?.agencyId, mode]);

  useEffect(() => {
    if (validSelection) {setSelectedEmployee({id: employeeId!, fullName: 'Selected staff member', profilePictureUrl: '', status: '', assignedCount: 0}); setIsReviewModalOpen(true);}
    else {setSelectedEmployee(null); setIsReviewModalOpen(false);}
  }, [employeeId, validSelection]);
  const closeReview = (open: boolean) => {
    setIsReviewModalOpen(open);
    if (!open && employeeId !== null) {const next = new URLSearchParams(searchParams); next.delete('employeeId'); setSearchParams(next);}
  };

  const handleSave = async (data: SaveTrainingData) => {
    if (!user?.agencyId) return;
    try {
      await saveTraining({
        agencyId: user?.agencyId!,
        trainingData: {
          name: data.trainingName,
          timeFrame: data.timeFrame,
          assignedDsp: data.dspId,
          trainingType: data.trainingType,
        }
      }).unwrap();
      setIsTrainingModalOpen(false);
      toast.success(`Training assigned to ${selectedEmployee?.fullName || "the staff member"}.`);
    } catch (error) {
      console.error(error);
      toast.error("The training could not be assigned. Try again.");
    }
  };

  const openAssign = (employee: TrainingStaff) => { setSelectedEmployee(employee); setIsTrainingModalOpen(true); };
  const openReview = (employee: TrainingStaff) => { setSelectedEmployee(employee); setIsReviewModalOpen(true); };

  const items = trainings?.items ?? [];
  const hasPaging = cursorHistory.length > 0 || !!trainings?.nextCursor;
  const pageNumber = cursorHistory.length + 1;

  return (
    <div className="pb-6">
      {employeeId !== null && !validSelection && (
        <p role="alert" className="mb-4 rounded-[12px] border border-[#f5c2bd] bg-[#fdf3f2] px-4 py-3 text-[14px] text-[#b42318]">
          Invalid staff selection. Open a staff member from the list.
        </p>
      )}

      <AgencyPageHeader
        icon={GraduationCap}
        title="Trainings"
        description={`Required courses for each ${staffLabel}. Assign courses and review completions.`}
      />

      <AgencyListCard label="Training log" className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">Each {staffLabel}'s assigned and automatic courses.</p>
          <AgencySearchField
            label={`Search ${labels.nounPlural}`}
            placeholder={`Search ${staffLabel}`}
            value={searchQuery}
            onChange={(value) => { setCursor(undefined); setCursorHistory([]); setSearchQuery(value); }}
            className="w-full sm:w-[260px]"
          />
        </div>

        {trainingsLoading ? (
          <div role="status" aria-label="Loading trainings" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            <span className="sr-only">Loading trainings...</span>
            {Array.from({length: 5}, (_, index) => <div key={index} aria-hidden="true" className="h-[62px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
          </div>
        ) : trainingsError ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Unable to load trainings</p>
            <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">Refresh the page to try again.</p>
          </div>
        ) : items.length === 0 ? (
          trainings?.nextCursor ? null : (
            <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
              <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{searchQuery ? `No ${staffLabel} matches` : `No ${labels.nounPlural} yet`}</p>
              <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{searchQuery ? "Try another name." : `Add a ${staffLabel} to assign their trainings.`}</p>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>{staffLabel}</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}>Trainings</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={agencyTr}>
                    <td className={agencyTd}><AgencyPerson name={item.fullName} imageUrl={item.profilePictureUrl || null} /></td>
                    <td className={agencyTd}>
                      <AgencyPill tone={isUnassigned(item.status) ? "grey" : "green"}>{statusLabel(item.status)}</AgencyPill>
                    </td>
                    <td className={agencyTd}>
                      <span className="block">{item.assignedCount} assigned</span>
                      {(item.requiredCount ?? 0) > 0 && <span className="mt-0.5 block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{item.requiredCount} automatic requirements</span>}
                    </td>
                    <td className={cn(agencyTd, "whitespace-nowrap text-right")}>
                      <div className="flex items-center justify-end gap-4">
                        <button type="button" onClick={() => openReview(item)} className={agencyRowLink}>
                          Review trainings<ChevronRight aria-hidden="true" className="h-4 w-4 no-underline" />
                        </button>
                        <button type="button" onClick={() => openAssign(item)} className={cn(agencyOutlineButton, "h-9 px-3")}>
                          <Plus aria-hidden="true" className="h-4 w-4" />Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!trainingsLoading && !trainingsError && (items.length > 0 || hasPaging) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceef0] px-4 py-3 text-[13px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">
            <span>{items.length ? `Showing ${items.length} ${items.length === 1 ? staffLabel : labels.nounPlural}${hasPaging ? ` · page ${pageNumber}` : ""}` : "No more results on this page"}</span>
            {hasPaging && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous results"
                  className={pageButton}
                  onClick={() => { const previous = cursorHistory.at(-1); setCursorHistory(list => list.slice(0, -1)); setCursor(previous); }}
                  disabled={cursorHistory.length === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  aria-label={items.length ? 'Next results' : 'Load more results'}
                  className={pageButton}
                  onClick={() => { setCursorHistory(list => [...list, cursor]); setCursor(trainings?.nextCursor ?? undefined); }}
                  disabled={!trainings?.nextCursor}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </AgencyListCard>

      <AgencyAssignTrainingModal
        open={isTrainingModalOpen}
        onOpenChange={setIsTrainingModalOpen}
        mode={"create"}
        initialData={{
          dsp: selectedEmployee?.fullName || "",
          trainingType: "",
          trainingName: "",
          timeFrame: "",
          dspId: selectedEmployee?.id || "",
        }}
        onSave={handleSave}
        isLoading={isLoading}
      />
      {isReviewModalOpen && <Suspense fallback={<p role="status">Loading training review…</p>}><ReviewTrainingsModal
        open={isReviewModalOpen}
        onOpenChange={closeReview}
        scopeKey={scopeKey}
        employee={selectedEmployee ? {
          id: selectedEmployee.id,
          fullName: selectedEmployee.fullName,
          role: validSelection ? 'Staff' : staffLabel,
          profilePictureUrl: selectedEmployee.profilePictureUrl
        } : null}
        mode={validSelection ? undefined : mode ?? undefined}
        onApprovalChange={(trainingId, approved) => {
          console.log(`Training ${trainingId} approval changed to ${approved}`);
        }}
      />
      </Suspense>}
    </div>
  );
}

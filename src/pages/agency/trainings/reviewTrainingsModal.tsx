import {sourceError} from '@/pages/agency/compliance-alerts/SourceControls';
import React, {useEffect, useRef, useState} from "react";
import {ChevronDown, X} from "lucide-react";
import {format, isValid, parseISO} from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {TrainingData, useApproveTrainingMutation, useLazyGetEmployeeTrainingsQuery} from "./trainingApi";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import TrainingCertificate from './TrainingCertificate';
import PolicyEvidenceReview from './PolicyEvidenceReview';
import {trainingPolicyLabel} from './TrainingPolicyFields';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';


interface ReviewTrainingsModalProps {
    scopeKey?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: {
        id: string;
        fullName: string;
        role: string;
        profilePictureUrl?: string;
    } | null;
    mode?: string;
    agencyId?: string;
    readOnly?: boolean;
    onApprovalChange?: (trainingId: string, approved: boolean) => void;
    onSelectCertificate?: (certificate: {trainingId: string; certificateId: string}) => void;
}

export default function ReviewTrainingsModal(
    {
        scopeKey,
        open,
        onOpenChange,
        employee,
        onApprovalChange,
        onSelectCertificate,
        mode,
        agencyId: explicitAgencyId,
        readOnly = false
    }: ReviewTrainingsModalProps
) {
    const {user} = useAuth();
    const agencyId = explicitAgencyId ?? user?.agencyId;
    const [courses, setCourses] = useState<TrainingData[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [pendingApproval, setPendingApproval] = useState<string | null>(null);
    const [approveTraining] = useApproveTrainingMutation();
    const [loadTrainings, {isFetching}] = useLazyGetEmployeeTrainingsQuery();
    const requestGeneration = useRef(0);

    useEffect(() => {
        if (!open || !employee) return;
        setCourses([]);
        setNextCursor(null);
        setPendingAssignments(0);
        setLoadError(false);
        let active = true;
        const generation = ++requestGeneration.current;
        const request = loadTrainings({...(scopeKey ? {scopeKey} : {}), employeeId: employee.id, agencyId: agencyId, limit: 25, mode});
        request.unwrap()
            .then(page => { if (active && generation === requestGeneration.current) { setCourses(page.items); setNextCursor(page.nextCursor); setPendingAssignments(page.summary?.policyPendingAssignmentCount ?? 0); } })
            .catch(() => { if (active && generation === requestGeneration.current) { setLoadError(true); toast.error('Failed to load trainings'); } });
        // Release this subscription without canceling a request reused by StrictMode or another view.
        return () => { active = false; requestGeneration.current++; request.unsubscribe?.(); };
    }, [open, employee?.id, agencyId, mode, scopeKey, loadTrainings]);

    const handleToggle = async (trainingId: string, approved?: boolean) => {
        if (readOnly || !employee || pendingApproval) return;
        const training = courses.find(t => t.id === trainingId);
        if (!training || (training.requiresCertificate && !training.certificateId)) return;
        const newState = approved ?? !training.approved;
        const generation = requestGeneration.current;
        setPendingApproval(trainingId);
        try {
            await approveTraining({
                agencyId: agencyId || "",
                employeeId: employee.id,
                trainingId,
                approved: newState,
                ...(training.requiresCertificate ? {certificateId: training.certificateId!} : {})
            }).unwrap();
            if (generation !== requestGeneration.current) return;
            setCourses(current => current.map(item => item.id === trainingId ? {...item, approved: newState,
                ...(item.requiresCertificate ? {status: newState ? 'Completed' : 'Changes Requested'} : {})} : item));
            onApprovalChange?.(trainingId, newState);
            toast.success(newState ? 'Training approved' : training.requiresCertificate ? 'Certificate changes requested' : 'Training approval removed');
        } catch (error) {
            if (generation === requestGeneration.current) {if (sourceError(error) === 'restricted' || sourceError(error) === 'missing') {setCourses([]); setNextCursor(null); setPendingAssignments(0); setLoadError(true);} toast.error('Unable to save review. Reopen the training to check the latest certificate, then try again.');}
        } finally {
            setPendingApproval(null);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} showCloseButton={false}
                className="w-[min(660px,95vw)] max-h-[95vh] overflow-hidden rounded-[28px] border border-[#e2eaea] bg-white p-0 flex flex-col gap-0">
                <div className="shrink-0 border-b border-[#e2eaea] px-5 py-6 sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#008c90]">Staff development</p>
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-[#162a2c]">Review trainings</DialogTitle>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close training review" onClick={handleClose} className="rounded-full bg-[#f5f9f9] text-[#627476]"><X className="size-4"/></Button>
                    </div>
                    {onSelectCertificate && <p className="mt-2 text-sm text-[#627476]">Select an accepted completion certificate for this client review.</p>}
                    <div className="mt-5 flex items-center gap-3">
                        <div className="h-11 w-10 shrink-0 overflow-hidden rounded-[10px] bg-[#00b4b8]">
                            {employee.profilePictureUrl ? <img src={employee.profilePictureUrl} alt={employee.fullName} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xl font-semibold text-white">{employee.fullName?.charAt(0).toUpperCase()}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-[#162a2c]">{employee.fullName}</p>
                            <p className="text-xs text-[#627476]">{employee.role}{mode ? ' · ' + mode.toUpperCase() : ''}</p>
                        </div>
                        {courses.length > 0 && <p className="shrink-0 text-right text-xs text-[#627476]"><span className="block text-sm font-medium text-[#162a2c]">{courses.length} trainings</span>{nextCursor ? 'More available below' : 'Assigned to staff'}</p>}
                    </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-7">
                    {courses.map((training, index) => {
                        const currentPolicy = training.source === 'policy' && training.policyContextState === 'current';
                        const urgent = currentPolicy && ['overdue', 'expired'].includes(training.deadlineState || '');
                        const beforeWork = currentPolicy && training.deadlineState === 'before_work';
                        const accepted = training.source === 'policy' ? currentPolicy && training.deadlineState === 'satisfied' : training.approved;
                        const dueDate = currentPolicy && training.dueDateKey && !['satisfied', 'not_required', 'details_needed', 'expired', 'before_work'].includes(training.deadlineState || '') ? parseISO(training.dueDateKey) : null;
                        return <details key={employee.id + '-' + training.id} open={index === 0}
                            className="group/training relative ml-[5px] border-l border-[#e2eaea] py-6 pl-6 last-of-type:border-transparent">
                            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008c90] [&::-webkit-details-marker]:hidden">
                            <span aria-hidden="true" className={`absolute -left-[5px] top-[31px] size-[9px] rounded-full border-2 bg-white ring-[5px] ring-white ${urgent ? 'border-[#b14d35]' : 'border-[#008c90]'}`}/>
                                <span className="min-w-0 flex-1">
                                    <span className="block break-words text-[15px] font-semibold leading-[1.45] tracking-[-0.2px] text-[#162a2c]">{training.name}</span>
                                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#627476]">
                                        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${urgent ? 'bg-[#fff1eb] text-[#b14d35]' : beforeWork ? 'bg-[#faf3e4] text-[#88601d]' : accepted ? 'bg-[#e5f7f7] text-[#008c90]' : 'bg-[#f5f9f9] text-[#627476]'}`}>
                                            {training.source === 'policy' ? trainingPolicyLabel(training) : training.status || 'Not Completed'}
                                        </span>
                                        {dueDate && isValid(dueDate) && <span>Due {format(dueDate, 'MMM d, yyyy')}</span>}
                                    </span>
                                </span>
                                <ChevronDown aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#627476] transition-transform group-open/training:rotate-180 motion-reduce:transition-none"/>
                            </summary>
                            <div className="space-y-4 pt-5 text-sm text-[#162a2c]">
                                {training.completedAt && <p className="text-xs text-[#627476]">Completed in {typeof training.completedAt === 'string' ? training.completedAt : new Date((training.completedAt as any)?._seconds * 1000).toLocaleDateString()}</p>}
                                {training.requiresCertificate && <>
                                    <TrainingCertificate key={employee.id + '-' + training.id + '-' + open} training={training} showPolicySummary={false} canEditHireDate={user?.userType==='agency' || user?.userType==='agency_staff' && user.profile?.accessList?.includes('DSP Management')===true}/>
                                    {onSelectCertificate && training.source !== 'policy' && training.approved === true && training.status === 'Completed' && training.id && /^[a-f0-9]{64}$/.test(training.certificateId || '') &&
                                        <Button type="button" size="sm" variant="outline" className="rounded-full" aria-label={`Select certificate for ${training.name}`} onClick={() => onSelectCertificate({trainingId: training.id!, certificateId: training.certificateId!})}>Select certificate</Button>}
                                    {training.source === 'policy' && <PolicyEvidenceReview training={training} readOnly={readOnly || training.policyContextState !== 'current'} onChanged={() => {
                                        const generation = requestGeneration.current;
                                        void loadTrainings({employeeId: employee.id, agencyId, limit: 25, mode, scopeKey}).unwrap().then(page=>{if(generation===requestGeneration.current){setCourses(page.items);setNextCursor(page.nextCursor);setPendingAssignments(page.summary?.policyPendingAssignmentCount ?? 0);}}).catch(()=>toast.error('Unable to reload trainings'));
                                    }}/>}
                                    {training.source !== 'policy' && !readOnly && training.certificateId && <div className="flex flex-wrap gap-2">
                                        <Button type="button" size="sm" disabled={pendingApproval !== null || training.approved} onClick={() => handleToggle(training.id!, true)} aria-label={`Approve ${training.name}`}>Approve</Button>
                                        <Button type="button" size="sm" variant="outline" disabled={pendingApproval !== null || training.status === 'Changes Requested'} onClick={() => handleToggle(training.id!, false)} aria-label={`Request changes for ${training.name}`}>Request changes</Button>
                                    </div>}
                                    {training.source !== 'policy' && !training.certificateId && <p className="text-xs text-[#627476]">Waiting for a completion certificate.</p>}
                                </>}
                                {!readOnly && !training.requiresCertificate && training.source !== 'policy' && <div className="flex items-center gap-3">
                                    <p className="text-sm">Approve</p>
                                    <button onClick={() => handleToggle(training?.id || '')} aria-label={`${training.approved ? 'Disapprove' : 'Approve'} ${training.name}`} aria-pressed={training.approved} disabled={pendingApproval !== null}
                                        className={`relative h-[26px] w-[42px] rounded-full transition-colors ${training.approved ? 'bg-[#0EAF52]' : 'bg-[#E0E0E0]'}`}>
                                        <span className={`absolute left-0 top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform ${training.approved ? 'translate-x-[19px]' : 'translate-x-[3px]'}`}/>
                                    </button>
                                </div>}
                            </div>
                        </details>;
                    })}
                    {isFetching && <div role="status" aria-label="Loading trainings" className="space-y-6 py-6">
                        <span className="sr-only">Loading trainings...</span>
                        {Array.from({length: 3}, (_, index) => <div key={index} aria-hidden="true" className="relative ml-[5px] space-y-3 border-l border-[#e2eaea] pl-6">
                            <Skeleton className="absolute -left-[5px] top-1 size-2.5 rounded-full"/>
                            <Skeleton className="h-4 w-52 max-w-full"/>
                            <Skeleton className="h-6 w-28 rounded-md"/>
                        </div>)}
                    </div>}
                    {loadError && !isFetching && <p className="py-4 text-sm text-[#627476]">Unable to load trainings</p>}
                    {!loadError && !isFetching && pendingAssignments > 0 && <p className="py-4 text-sm text-[#627476]">{pendingAssignments} automatic training {pendingAssignments === 1 ? 'assignment is' : 'assignments are'} pending.</p>}
                    {!loadError && !isFetching && pendingAssignments === 0 && courses.length === 0 && <p className="py-4 text-sm text-[#627476]">No trainings available</p>}
                    {nextCursor && <Button type="button" variant="ghost" disabled={isFetching} className="mx-auto flex text-[#008c90]" onClick={() => {
                        const generation = requestGeneration.current;
                        const employeeId = employee.id;
                        loadTrainings({...(scopeKey ? {scopeKey} : {}), employeeId, agencyId: agencyId, limit: 25, cursor: nextCursor, mode}).unwrap()
                            .then(page => { if (generation === requestGeneration.current) { setCourses(current => [...current, ...page.items]); setNextCursor(page.nextCursor); } })
                            .catch(error => { if (generation === requestGeneration.current) {if (sourceError(error) !== 'retry') {setCourses([]); setNextCursor(null); setPendingAssignments(0);} setLoadError(true); toast.error('Failed to load trainings');} });
                    }}>Load more trainings</Button>}
                </div>
            </DialogContent>
        </Dialog>
    );
}

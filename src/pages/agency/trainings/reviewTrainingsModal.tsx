import {sourceError} from '@/pages/agency/compliance-alerts/SourceControls';
import React, {useEffect, useRef, useState} from "react";
import {X} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {TrainingData, useApproveTrainingMutation, useLazyGetEmployeeTrainingsQuery} from "./trainingApi";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import TrainingCertificate from './TrainingCertificate';
import {Button} from '@/components/ui/button';


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
        setLoadError(false);
        let active = true;
        const generation = ++requestGeneration.current;
        const request = loadTrainings({...(scopeKey ? {scopeKey} : {}), employeeId: employee.id, agencyId: agencyId, limit: 25, mode});
        request.unwrap()
            .then(page => { if (active && generation === requestGeneration.current) { setCourses(page.items); setNextCursor(page.nextCursor); } })
            .catch(() => { if (active && generation === requestGeneration.current) { setLoadError(true); toast.error('Failed to load trainings'); } });
        return () => { active = false; requestGeneration.current++; request.abort?.(); };
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
            if (generation === requestGeneration.current) {if (sourceError(error) === 'restricted' || sourceError(error) === 'missing') {setCourses([]); setNextCursor(null); setLoadError(true);} toast.error('Unable to save review. Reopen the training to check the latest certificate, then try again.');}
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
            <DialogContent
                aria-describedby={undefined}
                className="w-[min(590px,95vw)] max-h-[95vh] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px]"
                showCloseButton={false}
            >
                {/* Header */}
                <div className="flex items-start justify-between w-full shrink-0">
                    <div className="flex flex-col gap-[4px]">
                        <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                            Training
                        </DialogTitle>
                        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                            {onSelectCertificate ? 'Select an accepted completion certificate for this client review.' : 'These are the trainings of this associated user'}
                        </p>
                    </div>
                    <button
                        aria-label="Close training review"
                        onClick={handleClose}
                        className="cursor-pointer flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors"
                    >
                        <X className="w-4 h-4 text-[#10141a]"/>
                    </button>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-[16px] w-full">
                    <div className="w-[52.5px] h-[60px] rounded-[8px] overflow-hidden flex-shrink-0">
                        {employee.profilePictureUrl ? (
                            <img
                                src={employee.profilePictureUrl}
                                alt={employee.fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#00b4b8] text-white text-[20px] font-semibold">
                                {employee.fullName?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-[6px]">
                        <p className="text-[16px] font-semibold leading-[1.6] text-black">
                            {employee.fullName}
                        </p>
                        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                            {employee.role}
                        </p>
                    </div>
                </div>

                {/* Trainings List */}
                <div className="flex flex-col gap-[8px] w-full flex-1 min-h-0 overflow-y-auto">
                    {courses.map((training, index) => (
                        <div key={training.id} className="flex gap-[8px] items-start w-full">
                            {/* Timeline */}
                            <div className={"border border-[#808081] rounded-full p-2 text-xs text-[#808081]"}>
                                {training?.status || "Not Completed"}
                            </div>
                            <div className="flex flex-col items-center pt-0 pb-px px-0 self-stretch shrink-0 w-[12px]">
                                <div className="bg-[#2b82ff] h-[7px] mb-[-1px] shrink-0 w-[2px]"/>
                                <div className="relative shrink-0 size-[10px] mb-[-1px]">
                                    <div className="absolute inset-0 bg-[#2b82ff] rounded-full"/>
                                    <div className="absolute inset-[2px] bg-[#2b82ff] rounded-full"/>
                                </div>
                                {index < courses.length - 1 && (
                                    <div className="bg-[#2b82ff] flex-[1_0_0] mb-[-1px] min-h-px w-[2px]"/>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex flex-[1_0_0] flex-col items-start min-h-px min-w-px pb-[16px] pt-0 px-0">
                                <div className="flex flex-col gap-[6px] items-start w-full">
                                    <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                                        {training.name}
                                    </p>
                                    {training.completedAt && <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                                        Completed in {typeof training.completedAt === 'string' 
                                            ? training.completedAt 
                                            : new Date((training.completedAt as any)?._seconds * 1000).toLocaleDateString()}
                                    </p>}
                                    {!training.completedAt && !training.requiresCertificate && <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                                        Not Completed
                                    </p>}
                                    {training.requiresCertificate && <>
                                        <TrainingCertificate key={`${employee.id}-${training.id}-${open}`} training={training}/>
                                        {onSelectCertificate && training.source !== 'policy' && training.requiresCertificate === true && training.approved === true && training.status === 'Completed' && training.id && /^[a-f0-9]{64}$/.test(training.certificateId || '') &&
                                            <Button type="button" size="sm" variant="outline" className="rounded-full" aria-label={`Select certificate for ${training.name}`}
                                                onClick={() => onSelectCertificate({trainingId: training.id!, certificateId: training.certificateId!})}>Select certificate</Button>}
                                        {!readOnly && training.certificateId ? <div className="flex flex-wrap gap-2">
                                            <Button type="button" size="sm" disabled={pendingApproval !== null || training.approved}
                                                className="rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]"
                                                onClick={() => handleToggle(training.id!, true)} aria-label={`Approve ${training.name}`}>Approve</Button>
                                            <Button type="button" size="sm" variant="outline" className="rounded-full"
                                                disabled={pendingApproval !== null || training.status === 'Changes Requested'}
                                                onClick={() => handleToggle(training.id!, false)} aria-label={`Request changes for ${training.name}`}>Request changes</Button>
                                        </div> : !training.certificateId ? <p className="text-xs text-[#808081]">Waiting for a completion certificate.</p> : null}
                                    </>}
                                </div>
                            </div>

                            {/* Approve Toggle */}
                            {!readOnly && !training.requiresCertificate && training.source !== 'policy' && <div className="flex items-center gap-[12px] shrink-0">
                                <p className="text-[14px] font-normal leading-[normal] text-[#10141a]">
                                    Approve
                                </p>
                                <button
                                    onClick={() => handleToggle(training?.id || "")}
                                    aria-label={`${training.approved ? 'Disapprove' : 'Approve'} ${training.name}`}
                                    aria-pressed={training.approved}
                                    disabled={pendingApproval !== null}
                                    className={`relative w-[42px] h-[26px] rounded-full transition-colors ${
                                        training.approved ? 'bg-[#0EAF52]' : 'bg-[#E0E0E0]'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${
                                            training.approved ? 'translate-x-[19px]' : 'translate-x-[3px]'
                                        }`}
                                    />
                                </button>
                            </div>}
                        </div>
                    ))}
                    {isFetching && <p className="text-[14px] text-[#808081]">Loading...</p>}
                    {loadError && !isFetching && <p className="text-[14px] text-[#808081]">Unable to load trainings</p>}
                    {!loadError && !isFetching && courses.length === 0 && <p className="text-[14px] text-[#808081]">No trainings available</p>}
                    {nextCursor && <button disabled={isFetching} className="self-center text-[14px] font-semibold text-[#00b4b8] disabled:opacity-50" onClick={() => {
                        const generation = requestGeneration.current;
                        const employeeId = employee.id;
                        loadTrainings({...(scopeKey ? {scopeKey} : {}), employeeId, agencyId: agencyId, limit: 25, cursor: nextCursor, mode}).unwrap()
                            .then(page => { if (generation === requestGeneration.current) { setCourses(current => [...current, ...page.items]); setNextCursor(page.nextCursor); } })
                            .catch(error => { if (generation === requestGeneration.current) {if (sourceError(error) !== 'retry') {setCourses([]); setNextCursor(null);} setLoadError(true); toast.error('Failed to load trainings');} });
                    }}>Load more trainings</button>}
                </div>
            </DialogContent>
        </Dialog>
    );
}

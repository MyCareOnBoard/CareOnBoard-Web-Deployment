import React, {useState} from "react";
import {X} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {useApproveTrainingMutation} from "./trainingApi";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";

interface Training {
    id: string;
    name: string;
    completedDate: string;
    approved: boolean;
    status: string;
}

interface ReviewTrainingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: {
        id: string;
        fullName: string;
        role: string;
        profilePictureUrl?: string;
    } | null;
    trainings: Training[];
    onApprovalChange?: (trainingId: string, approved: boolean) => void;
}

export default function ReviewTrainingsModal(
    {
        open,
        onOpenChange,
        employee,
        trainings,
        onApprovalChange
    }: ReviewTrainingsModalProps
) {
    const {user} = useAuth();
    const [approvalStates, setApprovalStates] = useState<Record<string, boolean>>(
        trainings.reduce((acc, training) => ({...acc, [training.id]: training.approved}), {})
    );
    const [approveTraining] = useApproveTrainingMutation();

    const handleToggle = async (trainingId: string) => {
        const newState = !approvalStates[trainingId];
        setApprovalStates(prev => ({...prev, [trainingId]: newState}));
        onApprovalChange?.(trainingId, newState);
        try {
            const training = trainings.find(t => t.id === trainingId);
            await approveTraining({
                agencyId: user?.agencyId || "",
                trainingId,
                approved: newState
            }).unwrap();
            toast.success(`Training ${training?.name} ${newState ? "approved" : "disapproved"} successfully`);
        } catch (error) {
            console.error(error);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
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
                            These are the trainings of this associated user
                        </p>
                    </div>
                    <button
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
                    {trainings.map((training, index) => (
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
                                {index < trainings.length - 1 && (
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
                                        Completed in {training.completedAt}
                                    </p>}
                                    {!training.completedAt && <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                                        Not Completed
                                    </p>}
                                </div>
                            </div>

                            {/* Approve Toggle */}
                            <div className="flex items-center gap-[12px] shrink-0">
                                <p className="text-[14px] font-normal leading-[normal] text-[#10141a]">
                                    Approve
                                </p>
                                <button
                                    onClick={() => handleToggle(training.id)}
                                    className={`relative w-[42px] h-[26px] rounded-full transition-colors ${
                                        approvalStates[training.id] ? 'bg-[#0EAF52]' : 'bg-[#E0E0E0]'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${
                                            approvalStates[training.id] ? 'translate-x-[19px]' : 'translate-x-[3px]'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import React, {useEffect, useState} from "react";
import {X} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

export interface SaveTrainingData {
    dsp: string;
    trainingType: string;
    trainingName: string;
    timeFrame: string;
    dspId: string;
}

interface AssignTrainingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "edit";
    initialData?: SaveTrainingData;
    onSave: (formData: SaveTrainingData) => Promise<void>;
    isLoading: boolean;
}

export default function AgencyAssignTrainingModal(
    {
        open,
        onOpenChange,
        isLoading,
        onSave,
        initialData
    }: AssignTrainingModalProps
) {
    const [formData, setFormData] = useState<SaveTrainingData>({
        dsp: "",
        trainingType: "",
        trainingName: "",
        timeFrame: "",
        dspId: ""
    })

    const handleSave = async () => {
        await onSave(formData);
    };


    const handleClose = () => {
        onOpenChange(false);
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[min(490px,95vw)] h-[min(993px,95vh)] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px] !left-1/2 !-translate-x-1/2 md:!left-auto md:!right-[26px] md:!translate-x-0"
                showCloseButton={false}
            >
                {/* Header */}
                <div className="flex items-center justify-between w-full h-[44px] shrink-0">
                    <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                        Assign Training
                    </DialogTitle>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="cursor-pointer flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-4 h-4 text-[#10141a]"/>
                    </button>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-[20px] w-full flex-1 min-h-0 overflow-y-auto">
                    {/* Name Field */}
                    <div className="flex flex-col gap-[4px] w-full">
                        <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                            DSP
                        </Label>
                        <Input
                            type={"text"}
                            value={formData.dsp}
                            onChange={(e) => setFormData((prev) => ({...prev, dsp: e.target.value}))}
                            placeholder={"Write here..."}
                            disabled={true}
                            className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white pl-[16px] pr-[44px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Email Field */}
                    <div className="flex flex-col gap-[4px] w-full">
                        <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                            Training Type
                        </Label>
                        <Select
                            value={formData.trainingType}
                            onValueChange={(v: string) => setFormData((prev) => ({...prev, trainingType: v}))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a training type"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cds">CDS</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-[4px] w-full">
                        <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                            Training Name
                        </Label>
                        <Input
                            type={"text"}
                            value={formData.trainingName}
                            onChange={(e) => setFormData((prev) => ({...prev, trainingName: e.target.value}))}
                            placeholder={"Write here..."}
                            disabled={isLoading}
                            className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white pl-[16px] pr-[44px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="flex flex-col gap-[4px] w-full">
                        <Label className="text-[12px] font-normal leading-[normal] text-[#10141a]">
                            Time Frame
                        </Label>
                        <Input
                            type={"text"}
                            value={formData.timeFrame}
                            onChange={(e) => setFormData((prev) => ({...prev, timeFrame: e.target.value}))}
                            placeholder={"Write here..."}
                            disabled={isLoading}
                            className="h-[44px] rounded-[12px] border border-[#cccccd] bg-white pl-[16px] pr-[44px] text-[14px] font-normal text-black placeholder:text-[#525253] focus-visible:ring-1 focus-visible:ring-[#00b4b8] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
                {/* Footer Buttons */}
                <DialogFooter
                    className="flex flex-row gap-[12px] items-center justify-center pt-[40px] pb-0 w-full shrink-0 mt-auto">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center px-[16px] py-[12px] rounded-[60px] backdrop-blur-[22px] border border-[#525253] hover:bg-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-[14px] font-semibold leading-[1.4] text-[#525253]">
                          Cancel
                        </span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-[16px] py-[12px] rounded-[60px] bg-[#00B4B8] backdrop-blur-[22px] hover:bg-[#00B4B8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                        {isLoading ? "Assigning..." : "Assign Training"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import React, {useState} from "react";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft} from "lucide-react";
import {Input} from "@/components/ui/input";
import ContentEditableCell from "@/components/ContentEditableCell";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";

interface Outcome {
    outcomeNumber: string;
    outcomeDescription: string;
}

export default function IndividualizedGoalsTemplate(
    {pageTitle}: {pageTitle: string}
) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        ispDate: "",
        outcomes: [
            {outcomeNumber: "", outcomeDescription: ""},
            {outcomeNumber: "", outcomeDescription: ""},
            {outcomeNumber: "", outcomeDescription: ""},
            {outcomeNumber: "", outcomeDescription: ""},
        ] as Outcome[],
        involvedPersons: ["", "", "", "", "", ""],
        completedBy: "",
        completionDate: "",
    });

    const [individuals, setIndividuals] = useState<string[]>([
        "", "", "", "", "", ""
    ])

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({...prev, [field]: value}));
    };

    const handleOutcomeChange = (index: number, field: keyof Outcome, value: string) => {
        const updated = [...formData.outcomes];
        updated[index] = {...updated[index], [field]: value};
        setFormData((prev) => ({...prev, outcomes: updated}));
    };

    const handleInvolvedPersonChange = (index: number, value: string) => {
        const updated = [...formData.involvedPersons];
        updated[index] = value;
        setFormData((prev) => ({...prev, involvedPersons: updated}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Form submitted:", formData);
    };

    const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"});

    return (
        <VoiceRecordingProvider pageTitle={pageTitle}>
            <div className="min-h-[calc(100vh-200px)]">
                {/* Header with Back Button */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(Routes.agency.goalsAndDocuments.index)}
                        className="cursor-pointer flex items-center gap-2 text-[14px] font-medium text-[#808081] hover:text-[#2B82FF] transition-colors mb-4"
                    >
                        <ChevronLeft size={20}/>
                        Back to Goals & Documents
                    </button>
                </div>

                {/* Form Container */}
                <div className="px-8">
                    {/* Header Section */}
                    <div className="text-center mb-6 space-y-2">
                        <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                            New Jersey Department of Human Services
                        </p>
                        <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                            Division of Developmental Disabilities
                        </p>
                        <a
                            href="https://www.nj.gov/humanservice/add"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] font-normal leading-[1.4] text-[#2b82ff] hover:underline font-['Urbanist',sans-serif]"
                        >
                            www.nj.gov/humanservice/add
                        </a>
                    </div>


                    <h3 className="text-[24px] font-bold text-[#10141a] mb-6 text-center">
                        {pageTitle}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="flex gap-6 mb-6">
                            <div className="flex-1">
                                <label
                                    className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
                                    Name
                                </label>
                                <Input
                                    type="text"
                                    value={""}
                                    placeholder=""
                                    className="w-full"
                                />
                            </div>
                            <div className="flex-1">
                                <label
                                    className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
                                    ISP Date
                                </label>
                                <Input
                                    type="text"
                                    value={""}
                                    placeholder=""
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto mb-6">
                            <div className="w-full min-w-[1163px]">
                                {/* Table Header */}
                                <div className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
                                    <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[60px]">
                                        <div className="grid grid-cols-2 gap-0 h-[60px]">
                                            <div
                                                className="relative px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center"
                                            >
                                                <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                                                    Outcome #
                                                </p>
                                            </div>
                                            <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
                                                <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                                                    Community Inclusion Services Outcome(s) from ISP
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Body */}
                                <div className="border border-[#b2b2b3] rounded-bl-[2px] rounded-br-[2px] border-t-0">
                                    <div className="bg-[#eef4f5]">
                                        {formData.outcomes.map((outcome, index) => (
                                            <div
                                                key={`intervention-${index}`}
                                                className={`grid grid-cols-2 gap-0 min-h-[60px] transition-colors ${
                                                    index < formData.outcomes.length - 1 ? 'border-b border-[#b2b2b3]' : ''
                                                } hover:bg-white`}
                                            >
                                                {/* Standard Required */}
                                                <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                                                    <Input
                                                        type="text"
                                                        value={outcome.outcomeNumber}
                                                        onChange={(e) => console.log(e)}
                                                        className="h-auto p-0 border-0 bg-transparent text-center focus-visible:ring-0 text-[14px] w-full"
                                                    />
                                                </div>
                                                {/* Employee Performance */}
                                                <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                                                    <ContentEditableCell
                                                        value={outcome.outcomeDescription}
                                                        onChange={(value) => console.log(value)}
                                                        fieldName="How does the employee currently perform the tasks, actions, areas related to these standards?"
                                                        pageTitle={pageTitle}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={"my-6"}>
                            <h3 className="text-[18px] font-bold text-[#10141a] text-left">
                                Who was involved in developing these strategies?
                            </h3>
                            <p>(Please note that the individual must always be involved in this process.)</p>
                        </div>
                        <div className={"grid grid-cols-3 gap-6"}>
                            {individuals.map((individual) => <Input
                                type="text"
                                value={""}
                                placeholder=""
                                className="w-full"
                            />)}
                        </div>

                        {/* Completion Information */}
                        {/* Submitted By Section */}
                        <div className="mt-8">
                            <label
                                className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
                                Submitted by
                            </label>
                            <Input
                                type="text"
                                value={formData.completedBy}
                                placeholder=""
                                className="max-w-md"
                            />
                            <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
                                {currentDate}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className={"flex justify-end"}>
                            <Button
                                type={"button"}
                                onClick={handleSubmit}
                                disabled={false}
                                className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
                            >
                                Submit
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </VoiceRecordingProvider>
    );
}

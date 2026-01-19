import React, {useState, useEffect} from "react";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft} from "lucide-react";
import {Input} from "@/components/ui/input";
import ContentEditableCell from "@/components/ContentEditableCell";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import {useDebounce} from "@/hooks/useDebounce";
import {
    useGetSingleGoalDocumentQuery,
    useUpsertGoalDocumentByTypeMutation,
    useSubmitGoalDocumentMutation
} from "../api";
import {DocumentType, IndividualizedGoalsDocument} from "@/lib/api/goals-and-documents";

interface Outcome {
    outcomeNumber: string;
    outcomeDescription: string;
}

export default function IndividualizedGoalsTemplate(
    {pageTitle, documentType}: {pageTitle: string, documentType: DocumentType}
) {
    const navigate = useNavigate();
    const location = useLocation();
    const {user} = useAuth();
    const documentId = new URLSearchParams(location.search).get("id");
    
    const {data: document, isLoading} = useGetSingleGoalDocumentQuery(documentType, {
        skip: !documentType,
        refetchOnMountOrArgChange: true
    });
    const [upsertDocument] = useUpsertGoalDocumentByTypeMutation();
    const [submitDocument, {isLoading: isSubmitting}] = useSubmitGoalDocumentMutation();
    
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
    ]);
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (document && document.metadata) {
            const metadata = document.metadata as IndividualizedGoalsDocument;
            setFormData({
                name: metadata.name || "",
                ispDate: metadata.ispDate || "",
                outcomes: metadata.outcomes || [
                    {outcomeNumber: "", outcomeDescription: ""},
                    {outcomeNumber: "", outcomeDescription: ""},
                    {outcomeNumber: "", outcomeDescription: ""},
                    {outcomeNumber: "", outcomeDescription: ""},
                ],
                involvedPersons: metadata.involvedPersons || ["", "", "", "", "", ""],
                completedBy: metadata.completedBy || "",
                completionDate: metadata.completionDate || "",
            });
            setIndividuals(metadata.involvedPersons || ["", "", "", "", "", ""]);
        }
    }, [document]);
    
    const debouncedSave = useDebounce(
        async (data: any) => {
            try {
                setIsSaving(true);
                const result = await upsertDocument({
                    documentType,
                    data: { metadata: data, agencyId: user?.agencyId }
                }).unwrap();
                
                if (result.id && !documentId) {
                    const newUrl = `${location.pathname}?id=${result.id}`;
                    window.history.replaceState({}, '', newUrl);
                }
            } catch (error) {
                console.error('Failed to save document:', error);
            } finally {
                setIsSaving(false);
            }
        },
        1000
    );
    
    const handleInputChange = (field: string, value: string) => {
        const updatedData = {...formData, [field]: value};
        setFormData(updatedData);
        debouncedSave(updatedData);
    };

    const handleOutcomeChange = (index: number, field: keyof Outcome, value: string) => {
        const updated = [...formData.outcomes];
        updated[index] = {...updated[index], [field]: value};
        const updatedData = {...formData, outcomes: updated};
        setFormData(updatedData);
        debouncedSave(updatedData);
    };

    const handleInvolvedPersonChange = (index: number, value: string) => {
        const updated = [...formData.involvedPersons];
        updated[index] = value;
        const updatedIndividuals = [...individuals];
        updatedIndividuals[index] = value;
        setIndividuals(updatedIndividuals);
        const updatedData = {...formData, involvedPersons: updated};
        setFormData(updatedData);
        debouncedSave(updatedData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!document?.id) {
            toast.error('Please save the document first before submitting');
            return;
        }
        
        if (!formData.name || !formData.ispDate) {
            toast.error('Please fill in Name and ISP Date');
            return;
        }
        
        try {
            await submitDocument(document?.id ?? "").unwrap();
            toast.success('Document submitted successfully!');
            navigate(Routes.agency.goalsAndDocuments.index);
        } catch (error: any) {
            console.error('Error submitting document:', error);
            toast.error(error?.data?.message || 'Failed to submit document.');
        }
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
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
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
                                    type="date"
                                    value={formData.ispDate}
                                    onChange={(e) => handleInputChange("ispDate", e.target.value)}
                                    placeholder=""
                                    className="w-full min-w-full block"
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
                                                        onChange={(e) => handleOutcomeChange(index, "outcomeNumber", e.target.value)}
                                                        className="h-auto p-0 border-0 bg-transparent text-center focus-visible:ring-0 text-[14px] w-full"
                                                    />
                                                </div>
                                                {/* Employee Performance */}
                                                <div className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                                                    <ContentEditableCell
                                                        value={outcome.outcomeDescription}
                                                        onChange={(value) => handleOutcomeChange(index, "outcomeDescription", value)}
                                                        fieldName="Community Inclusion Services Outcome(s) from ISP"
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
                            {individuals.map((individual, index) => <Input
                                key={index}
                                type="text"
                                value={individual}
                                onChange={(e) => handleInvolvedPersonChange(index, e.target.value)}
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
                                onChange={(e) => handleInputChange("completedBy", e.target.value)}
                                placeholder=""
                                className="max-w-md"
                            />
                            <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
                                {currentDate}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className={"flex justify-between items-center"}>
                            <div className="text-sm text-gray-500">
                                {isSaving && "Saving draft..."}
                                {!isSaving && documentId && "Draft saved"}
                            </div>
                            <Button
                                type={"button"}
                                onClick={handleSubmit}
                                disabled={isSubmitting || !documentId}
                                className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm disabled:opacity-50"
                            >
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </VoiceRecordingProvider>
    );
}

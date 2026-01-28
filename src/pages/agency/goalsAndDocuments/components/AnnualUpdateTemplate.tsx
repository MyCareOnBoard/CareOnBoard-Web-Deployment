import React, {useState, useEffect} from "react";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import {useDebouncedCallback} from "@/hooks/useDebouncedCallback";
import {
    useGetSingleGoalDocumentQuery,
    useUpsertGoalDocumentByTypeMutation,
    useSubmitGoalDocumentMutation
} from "../api";
import {DocumentType, AnnualUpdateDocument} from "@/lib/api/goals-and-documents";

export default function AnnualUpdateTemplate(
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
        ispStartDate: "",
        ispEndDate: "",
        activitiesDescription: "",
        changesNeeded: "",
        outstandingIssues: "",
        planningExamples: "",
        connectionsExamples: "",
        employmentOpportunities: "",
        employmentPursuits: "",
        healthSafetyChanges: "",
        completedBy: "",
        completionDate: "",
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (document && document.metadata) {
            const metadata = document.metadata as AnnualUpdateDocument;
            setFormData({
                name: metadata.name || "",
                ispStartDate: metadata.ispStartDate || "",
                ispEndDate: metadata.ispEndDate || "",
                activitiesDescription: metadata.activitiesDescription || "",
                changesNeeded: metadata.changesNeeded || "",
                outstandingIssues: metadata.outstandingIssues || "",
                planningExamples: metadata.planningExamples || "",
                connectionsExamples: metadata.connectionsExamples || "",
                employmentOpportunities: metadata.employmentOpportunities || "",
                employmentPursuits: metadata.employmentPursuits || "",
                healthSafetyChanges: metadata.healthSafetyChanges || "",
                completedBy: metadata.completedBy || "",
                completionDate: metadata.completionDate || "",
            });
        }
    }, [document]);

    const debouncedSave = useDebouncedCallback(
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!document?.id) {
            toast.error('Please save the document first before submitting');
            return;
        }
        
        if (!formData.name || !formData.ispStartDate || !formData.ispEndDate) {
            toast.error('Please fill in Name, ISP Start Date, and ISP End Date');
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
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
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                ISP Start Date
                            </label>
                            <Input
                                type="date"
                                value={formData.ispStartDate}
                                onChange={(e) => handleInputChange("ispStartDate", e.target.value)}
                                placeholder=""
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                ISP End Date
                            </label>
                            <Input
                                type="date"
                                value={formData.ispEndDate}
                                onChange={(e) => handleInputChange("ispEndDate", e.target.value)}
                                placeholder=""
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Activities Description */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Describe how the activities participated in during this year assisted the individual in
                            moving toward his/her ISP outcome(s).
                        </label>
                        <Textarea
                            value={formData.activitiesDescription}
                            onChange={(e) => handleInputChange("activitiesDescription", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Changes Needed */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Do changes need to be made to the strategies/activities based on the above information?
                        </label>
                        <Textarea
                            value={formData.changesNeeded}
                            onChange={(e) => handleInputChange("changesNeeded", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Outstanding Issues */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Are there any outstanding issues/concerns?
                        </label>
                        <Textarea
                            value={formData.outstandingIssues}
                            onChange={(e) => handleInputChange("outstandingIssues", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Planning Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) of how the individual participated in the planning of his/her activities
                            throughout the year.
                        </label>
                        <Textarea
                            value={formData.planningExamples}
                            onChange={(e) => handleInputChange("planningExamples", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Connections Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) from this year that demonstrate how the individual made new connections
                            and/or participated more fully in his/her community.
                        </label>
                        <Textarea
                            value={formData.connectionsExamples}
                            onChange={(e) => handleInputChange("connectionsExamples", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Employment Opportunities */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Have any opportunities for employment of additional community participation been identified
                            during this year?
                        </label>
                        <Textarea
                            value={formData.employmentOpportunities}
                            onChange={(e) => handleInputChange("employmentOpportunities", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Employment Pursuits */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            What has been done to pursue these employment or additional community participation
                            opportunities?
                        </label>
                        <Textarea
                            value={formData.employmentPursuits}
                            onChange={(e) => handleInputChange("employmentPursuits", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

                    {/* Health/Safety Changes */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Has anything changed related to the individual's health/safety during this year? If follow
                            up needed?
                        </label>
                        <Textarea
                            value={formData.healthSafetyChanges}
                            onChange={(e) => handleInputChange("healthSafetyChanges", e.target.value)}
                            placeholder=""
                            className="w-full bg-white border border-[#cccccd]"
                            rows={4}
                        />
                    </div>

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
                            {!isSaving && document?.id && "Draft saved"}
                        </div>
                        <Button
                            type={"button"}
                            onClick={handleSubmit}
                            disabled={isSubmitting || !document?.id}
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

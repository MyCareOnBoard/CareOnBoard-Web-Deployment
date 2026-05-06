import React, {useState, useEffect, useCallback, useRef} from "react";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft, Loader2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {toast} from "sonner";
import {useDebouncedCallback} from "@/hooks/useDebouncedCallback";
import {searchClients, Client} from "@/lib/api/clients";
import {
    useGetSingleGoalDocumentQuery,
    useGetGoalDocumentByFirebaseIdQuery,
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
    const firebaseId = new URLSearchParams(location.search).get("firebaseId");
    const isUserPanel = location.pathname.startsWith("/user-panel/");
    const backRoute = isUserPanel ? Routes.userPanel.planOfCare : Routes.agency.goalsAndDocuments.index;
    const backLabel = isUserPanel ? "Back to Plan of Care" : "Back to Goals & Documents";
    
    const {data: document, isLoading} = useGetSingleGoalDocumentQuery(documentType, {
        skip: !documentType || !!firebaseId,
    });

    const {data: firebaseDocument, isLoading: isLoadingFirebaseDoc} = useGetGoalDocumentByFirebaseIdQuery(firebaseId!, {
        skip: !firebaseId,
    });
    const [upsertDocument] = useUpsertGoalDocumentByTypeMutation();
    const [submitDocument, {isLoading: isSubmitting}] = useSubmitGoalDocumentMutation();
    
    const [formData, setFormData] = useState({
        name: "",
        clientId: "",
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
    const isReadOnly = !!firebaseId;
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const sourceDoc = firebaseDocument || document;
        if (sourceDoc && sourceDoc.metadata) {
            const metadata = sourceDoc.metadata as AnnualUpdateDocument;
            setFormData({
                name: metadata.name || "",
                clientId: (metadata as any).clientId || "",
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
    }, [document, firebaseDocument]);

    useEffect(() => {
        return () => {
            if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);
        };
    }, []);

    const debouncedSave = useDebouncedCallback(
        async (data: any) => {
            try {
                setIsSaving(true);
                const result = await upsertDocument({
                    documentType,
                    data: { 
                        metadata: data, 
                        agencyId: user?.agencyId,
                        clientId: data.clientId || undefined
                    }
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
        if (isReadOnly) return;
        const updatedData = {...formData, [field]: value};
        setFormData(updatedData);
        debouncedSave(updatedData);
    };

    const handleClientSearch = useCallback(async (query: string) => {
        if (clientSearchTimeoutRef.current) {
            clearTimeout(clientSearchTimeoutRef.current);
        }

        if (query.trim().length < 2) {
            setClientSearchResults([]);
            setShowClientDropdown(false);
            return;
        }

        clientSearchTimeoutRef.current = setTimeout(async () => {
            try {
                setIsSearchingClients(true);
                const results = await searchClients(query, user?.agencyId);
                setClientSearchResults(results);
                setShowClientDropdown(results.length > 0);
            } catch (error) {
                console.error("Failed to search clients:", error);
                setClientSearchResults([]);
            } finally {
                setIsSearchingClients(false);
            }
        }, 300);
    }, [user?.agencyId]);

    const handleClientSelect = (client: Client) => {
        const clientName = client.firstName && client.lastName 
            ? `${client.firstName} ${client.lastName}` 
            : client.id;
        const updatedData = {
            ...formData,
            name: clientName,
            clientId: client.id,
        };
        setFormData(updatedData);
        setShowClientDropdown(false);
        setClientSearchResults([]);
        debouncedSave(updatedData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isReadOnly) {
            toast.info('This document is read-only and cannot be submitted');
            return;
        }
        
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
            navigate(backRoute);
        } catch (error: any) {
            console.error('Error submitting document:', error);
            toast.error(error?.data?.message || 'Failed to submit document.');
        }
    };

    const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"});

    return (
        <VoiceRecordingProvider pageTitle={pageTitle}>
            <div className="min-h-[calc(100vh-200px)] pb-20">
                {/* Header with Back Button */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(backRoute)}
                        className="cursor-pointer flex items-center gap-2 text-[14px] font-medium text-[#808081] hover:text-[#2B82FF] transition-colors mb-4"
                    >
                        <ChevronLeft size={20}/>
                        {backLabel}
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
                        <div className="relative">
                            <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                                Name
                            </label>
                            <div className="relative">
                                <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormData(prev => ({ ...prev, name: value, clientId: "" }));
                                            handleClientSearch(value);
                                        }}
                                        placeholder="Search client name..."
                                        className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                                        readOnly={isReadOnly}
                                    />
                                    {isSearchingClients && (
                                        <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
                                    )}
                                </div>
                                {showClientDropdown && clientSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                                        {clientSearchResults.map((client) => (
                                            <button
                                                key={client.id}
                                                onClick={() => handleClientSelect(client)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-[12px] last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                                            >
                                                <p className="text-[14px] font-normal text-black">
                                                    {client.firstName && client.lastName 
                                                        ? `${client.firstName} ${client.lastName}` 
                                                        : client.id}
                                                </p>
                                                {client.primaryAddress?.address && (
                                                    <p className="text-[12px] font-normal text-[#808081]">
                                                        {client.primaryAddress.address}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.activitiesDescription}
                                onChange={(v) => handleInputChange("activitiesDescription", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Activities and ISP outcomes"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.activitiesDescription}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Changes Needed */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Do changes need to be made to the strategies/activities based on the above information?
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.changesNeeded}
                                onChange={(v) => handleInputChange("changesNeeded", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Changes to strategies or activities"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.changesNeeded}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Outstanding Issues */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Are there any outstanding issues/concerns?
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.outstandingIssues}
                                onChange={(v) => handleInputChange("outstandingIssues", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Outstanding issues or concerns"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.outstandingIssues}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Planning Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) of how the individual participated in the planning of his/her activities
                            throughout the year.
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.planningExamples}
                                onChange={(v) => handleInputChange("planningExamples", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Planning participation examples"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.planningExamples}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Connections Examples */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Give example(s) from this year that demonstrate how the individual made new connections
                            and/or participated more fully in his/her community.
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.connectionsExamples}
                                onChange={(v) => handleInputChange("connectionsExamples", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Community connections examples"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.connectionsExamples}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Employment Opportunities */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Have any opportunities for employment of additional community participation been identified
                            during this year?
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.employmentOpportunities}
                                onChange={(v) => handleInputChange("employmentOpportunities", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Employment or community opportunities"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.employmentOpportunities}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Employment Pursuits */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            What has been done to pursue these employment or additional community participation
                            opportunities?
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.employmentPursuits}
                                onChange={(v) => handleInputChange("employmentPursuits", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Pursuit of employment or community opportunities"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.employmentPursuits}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
                    </div>

                    {/* Health/Safety Changes */}
                    <div>
                        <label className="block text-[14px] font-medium text-[#10141a] mb-2">
                            Has anything changed related to the individual's health/safety during this year? If follow
                            up needed?
                        </label>
                        {!isReadOnly ? (
                            <VoiceEnabledTextarea
                                value={formData.healthSafetyChanges}
                                onChange={(v) => handleInputChange("healthSafetyChanges", v)}
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd] min-h-[104px]"
                                fieldName="Health and safety changes"
                                pageTitle={pageTitle}
                            />
                        ) : (
                            <Textarea
                                value={formData.healthSafetyChanges}
                                readOnly
                                disabled
                                placeholder=""
                                className="w-full bg-white border border-[#cccccd]"
                                rows={4}
                            />
                        )}
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
                    {!isReadOnly && (
                        <div className={"flex justify-between items-center"}>
                            <div className="text-sm text-gray-500">
                                {isSaving && "Saving draft..."}
                                {!isSaving && document?.id && "Draft saved"}
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
                    )}
                    {isReadOnly && (
                        <div className="text-sm text-gray-500 text-center py-4">
                            This document has been submitted and is read-only.
                        </div>
                    )}
                </form>
            </div>
            {!isReadOnly && <VoiceInputButton />}
        </div>
        </VoiceRecordingProvider>
    );
}

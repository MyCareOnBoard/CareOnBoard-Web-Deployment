import React, {useState, useEffect, useCallback, useRef} from "react";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ChevronLeft, Loader2} from "lucide-react";
import {Input} from "@/components/ui/input";
import ContentEditableCell from "@/components/ContentEditableCell";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/utils/auth";
import {useEffectiveAgencyMode} from "@/hooks/useEffectiveAgencyMode";
import {toast} from "sonner";
import {useDebouncedCallback} from "@/hooks/useDebouncedCallback";
import {searchClients, Client} from "@/lib/api/clients";
import {
    useGetSingleGoalDocumentQuery,
    useGetGoalDocumentByFirebaseIdQuery,
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
    const agencyMode = useEffectiveAgencyMode();
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
    const isReadOnly = !!firebaseId;
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const sourceDoc = firebaseDocument || document;
        if (sourceDoc && sourceDoc.metadata) {
            const metadata = sourceDoc.metadata as IndividualizedGoalsDocument;
            setFormData({
                name: metadata.name || "",
                clientId: (metadata as any).clientId || "",
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

    const handleOutcomeChange = (index: number, field: keyof Outcome, value: string) => {
        if (isReadOnly) return;
        const updated = [...formData.outcomes];
        updated[index] = {...updated[index], [field]: value};
        const updatedData = {...formData, outcomes: updated};
        setFormData(updatedData);
        debouncedSave(updatedData);
    };

    const handleInvolvedPersonChange = (index: number, value: string) => {
        if (isReadOnly) return;
        const updated = [...formData.involvedPersons];
        updated[index] = value;
        const updatedIndividuals = [...individuals];
        updatedIndividuals[index] = value;
        setIndividuals(updatedIndividuals);
        const updatedData = {...formData, involvedPersons: updated};
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
                const results = await searchClients(query, user?.agencyId, agencyMode ?? undefined);
                setClientSearchResults(results);
                setShowClientDropdown(results.length > 0);
            } catch (error) {
                console.error("Failed to search clients:", error);
                setClientSearchResults([]);
            } finally {
                setIsSearchingClients(false);
            }
        }, 300);
    }, [user?.agencyId, agencyMode]);

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

        if (!formData.name || !formData.ispDate) {
            toast.error('Please fill in Name and ISP Date');
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
            <div className="min-h-[calc(100vh-200px)]">
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
                        <div className="flex gap-6 mb-6">
                            <div className="flex-1 relative">
                                <label
                                    className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
                                    Name
                                </label>
                                <div className="relative">
                                    <div
                                        className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFormData(prev => ({...prev, name: value, clientId: ""}));
                                                handleClientSearch(value);
                                            }}
                                            placeholder="Search client name..."
                                            className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                                            readOnly={isReadOnly}
                                        />
                                        {isSearchingClients && (
                                            <Loader2 className="w-4 h-4 animate-spin text-[#808081]"/>
                                        )}
                                    </div>
                                    {showClientDropdown && clientSearchResults.length > 0 && (
                                        <div
                                            className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
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
                                <div
                                    className="border border-[#b2b2b3] rounded-tl-[2px] rounded-tr-[2px] overflow-hidden">
                                    <div className="border-b border-[#b2b2b3] bg-[#eef4f5] min-h-[60px]">
                                        <div className="grid grid-cols-2 gap-0 h-[60px]">
                                            <div
                                                className="relative px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center"
                                            >
                                                <p className="text-[14px] font-normal leading-[1.4] text-black font-['Urbanist',sans-serif]">
                                                    Outcome #
                                                </p>
                                            </div>
                                            <div
                                                className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center text-center">
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
                                                <div
                                                    className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                                                    <Input
                                                        type="text"
                                                        value={outcome.outcomeNumber}
                                                        onChange={(e) => handleOutcomeChange(index, "outcomeNumber", e.target.value)}
                                                        className="w-full"
                                                    />
                                                </div>
                                                {/* Employee Performance */}
                                                <div
                                                    className="px-4 py-3 border-r border-[#b2b2b3] flex items-center justify-center">
                                                    <ContentEditableCell
                                                        value={outcome.outcomeDescription}
                                                        onChange={(value) => handleOutcomeChange(index, "outcomeDescription", value)}
                                                        fieldName="Community Inclusion Services Outcome(s) from ISP"
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
            </div>
        </VoiceRecordingProvider>
    );
}

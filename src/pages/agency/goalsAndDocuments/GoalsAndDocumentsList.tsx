import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { ChevronLeft, FileText, Calendar, User } from "lucide-react";
import { useAuth } from "@/utils/auth";
import { useGetAllGoalDocumentsQuery } from "./api";
import { GoalDocument, SubmissionStatus, DocumentType } from "@/lib/api/goals-and-documents";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const documentTypeLabels: Record<string, string> = {
    natural_supports_training: "Natural Supports Training",
    community_inclusion_services: "Community Inclusion Services",
    community_inclusion_individualized_goals: "Community Inclusion - Individualized Goals",
    day_habilitation_services: "Day Habilitation Services",
    day_habilitation_individualized_goals: "Day Habilitation - Individualized Goals",
    prevocational_training_services: "Prevocational Training Services",
    prevocational_training_individualized_goals: "Prevocational Training - Individualized Goals",
};

const documentTypeRoutes: Record<string, string> = {
    natural_supports_training: Routes.agency.goalsAndDocuments.naturalSupportsTraining,
    community_inclusion_services: Routes.agency.goalsAndDocuments.communityInclusionServices,
    community_inclusion_individualized_goals: Routes.agency.goalsAndDocuments.communityInclusionIndividualizedGoals,
    day_habilitation_services: Routes.agency.goalsAndDocuments.dayHabilitationServices,
    day_habilitation_individualized_goals: Routes.agency.goalsAndDocuments.dayHabilitationIndividualizedGoals,
    prevocational_training_services: Routes.agency.goalsAndDocuments.prevocationalTrainingServices,
    prevocational_training_individualized_goals: Routes.agency.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
};

export default function GoalsAndDocumentsList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");

    const { data, isLoading, error } = useGetAllGoalDocumentsQuery({
        agencyId: user?.agencyId,
        status: statusFilter === "all" ? undefined : statusFilter as SubmissionStatus,
        documentType: documentTypeFilter === "all" ? undefined : documentTypeFilter as DocumentType,
        limit: 100,
    });

    const handleDocumentClick = (document: GoalDocument) => {
        const route = documentTypeRoutes[document.documentType];
        if (route) {
            navigate(`${route}?firebaseId=${document.id}&fromList=true`);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getClientName = (document: GoalDocument) => {
        if (document.metadata?.name) {
            return document.metadata.name;
        }
        return "No client assigned";
    };

    return (
        <div className="min-h-[calc(100vh-200px)]">
            {/* Header with Back Button */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(Routes.agency.goalsAndDocuments.index)}
                    className="cursor-pointer flex items-center gap-2 text-[14px] font-medium text-[#808081] hover:text-[#2B82FF] transition-colors mb-4"
                >
                    <ChevronLeft size={20} />
                    Back to Goals & Documents
                </button>
                <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                    All Goals & Documents
                </h1>
                <p className="text-[14px] font-medium text-[#808081] mt-2">
                    View and manage all goals and documents for your agency
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Filter by document type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Document Types</SelectItem>
                        {Object.entries(documentTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Documents List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-[#808081]">Loading documents...</div>
                </div>
            ) : error ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-red-500">Error loading documents</div>
                </div>
            ) : !data?.documents || data.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <FileText size={48} className="text-[#808081] mb-4" />
                    <p className="text-[#808081] text-lg">No documents found</p>
                    <p className="text-[#b2b2b3] text-sm mt-2">
                        Create a new document to get started
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {data.documents.map((document) => (
                        <div
                            key={document.id}
                            onClick={() => handleDocumentClick(document)}
                            className="bg-white border border-[#e5e5e5] rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-[18px] font-semibold text-[#10141a]">
                                            {documentTypeLabels[document.documentType] || document.documentType}
                                        </h3>
                                        <span
                                            className={`px-3 py-1 rounded-full text-[12px] font-medium ${
                                                document.status === "submitted"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {document.status === "submitted" ? "Submitted" : "Draft"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-6 text-[14px] text-[#808081]">
                                        <div className="flex items-center gap-2">
                                            <User size={16} />
                                            <span>{getClientName(document)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            <span>
                                                {document.status === "submitted"
                                                    ? `Submitted: ${formatDate(document.submittedAt)}`
                                                    : `Updated: ${formatDate(document.updatedAt)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[#2B82FF] hover:text-[#1a5fbf] hover:bg-[#f0f7ff]"
                                >
                                    View/Edit
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {data?.documents && data.documents.length > 0 && (
                <div className="mt-6 text-[14px] text-[#808081]">
                    Showing {data.documents.length} document{data.documents.length !== 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
}

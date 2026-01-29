/**
 * Goals & Documents API Service
 * Handles all API calls related to goals and documents management
 */

import axiosClient from '../axios';

// API endpoint constants
const GOALS_DOCS_BASE = '/goalsAndDocuments';

// ==================== Type Definitions ====================

/**
 * Document Type Enum
 */
export enum DocumentType {
    NATURAL_SUPPORTS_TRAINING = "natural_supports_training",
    COMMUNITY_INCLUSION_SERVICES = "community_inclusion_services",
    COMMUNITY_INCLUSION_INDIVIDUALIZED_GOALS = "community_inclusion_individualized_goals",
    DAY_HABILITATION_SERVICES = "day_habilitation_services",
    DAY_HABILITATION_INDIVIDUALIZED_GOALS = "day_habilitation_individualized_goals",
    PREVOCATIONAL_TRAINING_SERVICES = "prevocational_training_services",
    PREVOCATIONAL_TRAINING_INDIVIDUALIZED_GOALS = "prevocational_training_individualized_goals",
}

/**
 * Submission Status Enum
 */
export enum SubmissionStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
}

/**
 * Training Participant Interface
 */
export interface TrainingParticipant {
    name: string;
    signature: string;
}

/**
 * Training Session Interface
 */
export interface TrainingSession {
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
}

/**
 * Natural Supports Training Document
 */
export interface NaturalSupportsTrainingDocument {
    name: string;
    birthDate: string;
    ispOutcome: string;
    nameOfTrainer: string;
    trainingParticipants: TrainingParticipant[];
    trainings: TrainingSession[];
    completedBy: string;
    completionDate: string;
}

/**
 * Annual Update Document (for Community Inclusion, Day Habilitation, Prevocational Training)
 */
export interface AnnualUpdateDocument {
    name: string;
    ispStartDate: string;
    ispEndDate: string;
    activitiesDescription: string;
    changesNeeded: string;
    outstandingIssues: string;
    planningExamples: string;
    connectionsExamples: string;
    employmentOpportunities: string;
    employmentPursuits: string;
    healthSafetyChanges: string;
    completedBy: string;
    completionDate: string;
}

/**
 * Outcome Interface for Individualized Goals
 */
export interface Outcome {
    outcomeNumber: string;
    outcomeDescription: string;
}

/**
 * Individualized Goals Document
 */
export interface IndividualizedGoalsDocument {
    name: string;
    ispDate: string;
    outcomes: Outcome[];
    involvedPersons: string[];
    completedBy: string;
    completionDate: string;
}

/**
 * Base Goal Document Interface
 */
export interface GoalDocument {
    id: string;
    agencyId: string;
    clientId?: string;
    documentType: DocumentType;
    status: SubmissionStatus;
    metadata: NaturalSupportsTrainingDocument | AnnualUpdateDocument | IndividualizedGoalsDocument;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    submittedAt?: string;
}

// ==================== Request/Response Types ====================

/**
 * Create Goal Document Request
 */
export interface CreateGoalDocumentRequest {
    agencyId: string;
    clientId?: string;
    status?: SubmissionStatus;
    createdBy?: string;
    documentType: DocumentType;
    metadata: NaturalSupportsTrainingDocument | AnnualUpdateDocument | IndividualizedGoalsDocument;
}

/**
 * Update Goal Document Request
 */
export interface UpdateGoalDocumentRequest {
    metadata?: NaturalSupportsTrainingDocument | AnnualUpdateDocument | IndividualizedGoalsDocument;
    status?: SubmissionStatus;
    clientId?: string;
}

/**
 * Upsert Goal Document Request (by documentType)
 */
export interface UpsertGoalDocumentRequest {
    agencyId?: string;
    clientId?: string;
    metadata?: NaturalSupportsTrainingDocument | AnnualUpdateDocument | IndividualizedGoalsDocument;
}

/**
 * List Goal Documents Query Parameters
 */
export interface ListGoalDocumentsParams {
    agencyId?: string;
    clientId?: string;
    documentType?: DocumentType;
    status?: SubmissionStatus;
    limit?: number;
}

/**
 * Goal Document API Response
 */
export interface GoalDocumentResponse {
    success: boolean;
    message?: string;
    document: GoalDocument;
}

/**
 * List Goal Documents API Response
 */
export interface ListGoalDocumentsResponse {
    success: boolean;
    count: number;
    documents: GoalDocument[];
}

/**
 * Delete Goal Document Response
 */
export interface DeleteGoalDocumentResponse {
    success: boolean;
    message: string;
}

/**
 * Submit Goal Document Response
 */
export interface SubmitGoalDocumentResponse {
    success: boolean;
    message: string;
    document: GoalDocument;
}

// ==================== API Functions ====================

/**
 * Create a new goal document (saved as draft by default)
 * @param data - The document data to create
 * @returns Promise with document response
 */
export const createGoalDocument = async (data: CreateGoalDocumentRequest): Promise<GoalDocumentResponse> => {
    try {
        const response = await axiosClient.post<GoalDocumentResponse>(
            `${GOALS_DOCS_BASE}`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to create goal document:', error);
        throw error;
    }
};

/**
 * Get a goal document by ID
 * @param documentId - The ID of the document to retrieve
 * @returns Promise with document response
 */
export const getGoalDocumentById = async (documentId: string): Promise<GoalDocumentResponse> => {
    try {
        const response = await axiosClient.get<GoalDocumentResponse>(
            `${GOALS_DOCS_BASE}/${documentId}`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch goal document:', error);
        throw error;
    }
};

/**
 * Get all goal documents for a specific client
 * @param clientId - The ID of the client
 * @returns Promise with list of documents
 */
export const getClientGoalDocuments = async (clientId: string): Promise<ListGoalDocumentsResponse> => {
    try {
        const response = await axiosClient.get<ListGoalDocumentsResponse>(
            `${GOALS_DOCS_BASE}/client/${clientId}`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch client goal documents:', error);
        throw error;
    }
};

/**
 * List all goal documents with optional filters
 * @param params - Optional query parameters for filtering
 * @returns Promise with list of documents
 */
export const listGoalDocuments = async (params?: ListGoalDocumentsParams): Promise<ListGoalDocumentsResponse> => {
    try {
        const response = await axiosClient.get<ListGoalDocumentsResponse>(
            GOALS_DOCS_BASE,
            { params }
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch goal documents:', error);
        throw error;
    }
};

/**
 * Update goal document by ID (auto-saves as draft)
 * @param documentId - The ID of the document to update
 * @param data - The fields to update
 * @returns Promise with updated document response
 */
export const updateGoalDocument = async (
    documentId: string,
    data: UpdateGoalDocumentRequest
): Promise<GoalDocumentResponse> => {
    try {
        const response = await axiosClient.put<GoalDocumentResponse>(
            `${GOALS_DOCS_BASE}/document/${documentId}`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to update goal document:', error);
        throw error;
    }
};

/**
 * Upsert goal document by documentType (create if no draft exists, update if exists)
 * @param documentType - The type of document to upsert
 * @param data - The fields to upsert
 * @returns Promise with document response
 */
export const upsertGoalDocumentByType = async (
    documentType: DocumentType,
    data: UpsertGoalDocumentRequest
): Promise<GoalDocumentResponse> => {
    try {
        const response = await axiosClient.put<GoalDocumentResponse>(
            `${GOALS_DOCS_BASE}/${documentType}`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to upsert goal document:', error);
        throw error;
    }
};

/**
 * Submit a goal document (changes status from draft to submitted)
 * @param documentId - The ID of the document to submit
 * @returns Promise with submission response
 */
export const submitGoalDocument = async (documentId: string): Promise<SubmitGoalDocumentResponse> => {
    try {
        const response = await axiosClient.post<SubmitGoalDocumentResponse>(
            `${GOALS_DOCS_BASE}/${documentId}/submit`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to submit goal document:', error);
        throw error;
    }
};

/**
 * Delete a goal document permanently
 * @param documentId - The ID of the document to delete
 * @returns Promise with deletion confirmation
 */
export const deleteGoalDocument = async (documentId: string): Promise<DeleteGoalDocumentResponse> => {
    try {
        const response = await axiosClient.delete<DeleteGoalDocumentResponse>(
            `${GOALS_DOCS_BASE}/${documentId}`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to delete goal document:', error);
        throw error;
    }
};

// ==================== Helper Functions ====================

/**
 * Helper function to get draft documents
 * @param agencyId - Optional agency ID to filter by
 * @param documentType - Optional document type to filter by
 * @returns Promise with draft documents
 */
export const getDraftDocuments = async (
    agencyId?: string,
    documentType?: DocumentType
): Promise<ListGoalDocumentsResponse> => {
    return listGoalDocuments({
        status: SubmissionStatus.DRAFT,
        agencyId,
        documentType
    });
};

/**
 * Helper function to get submitted documents
 * @param agencyId - Optional agency ID to filter by
 * @param documentType - Optional document type to filter by
 * @returns Promise with submitted documents
 */
export const getSubmittedDocuments = async (
    agencyId?: string,
    documentType?: DocumentType
): Promise<ListGoalDocumentsResponse> => {
    return listGoalDocuments({
        status: SubmissionStatus.SUBMITTED,
        agencyId,
        documentType
    });
};

/**
 * Helper function to get documents by client
 * @param clientId - Client ID to filter by
 * @param documentType - Optional document type to filter by
 * @returns Promise with client documents
 */
export const getDocumentsByClient = async (
    clientId: string,
    documentType?: DocumentType
): Promise<ListGoalDocumentsResponse> => {
    return listGoalDocuments({ clientId, documentType });
};

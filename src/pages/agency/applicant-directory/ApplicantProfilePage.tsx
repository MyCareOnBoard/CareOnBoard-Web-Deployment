
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  Phone,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { Routes } from "@/routes/constants";
import { applicantsApi, type ComplianceData } from "@/lib/api/applicants";
import type { EligibilityData } from "@/lib/api/applicants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { agencyApplicantsExtraApi, ApplicantDocumentItem } from "@/lib/api/agencyApplicantsExtra";
import { officialHireApi, OfficialHireStatusResponse } from "@/lib/api/officialHire";
import { authorizationsApi } from "@/lib/api/authorizations";
import { ProfileTab } from "./components/ProfileTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ConditionalHireTab } from "./components/ConditionalHireTab";
import { OfficialHireTab } from "./components/OfficialHireTab";
import { FinalReviewTab, type ReviewStepsState } from "./components/FinalReviewTab";
import { getApplicantDocs, type ApplicantType } from "@/pages/applicant/application/documentConfig";
import { roleLabel } from "@/lib/roleLabel";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";

// Type alias for document file from eligibility data
type DocumentFile = NonNullable<EligibilityData['photoIdUrl']>;

type TabSection = "profile" | "documents" | "conditional" | "official" | "final";

// Get valid tab from query parameter or default to "profile"
const getValidTab = (tab: string | null): TabSection => {
  const validTabs: TabSection[] = ["profile", "documents", "conditional", "official", "final"];
  return validTabs.includes(tab as TabSection) ? (tab as TabSection) : "profile";
};

export default function ApplicantProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const messaging = useMessaging();
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const [activeSection, setActiveSection] = useState<TabSection>(
    getValidTab(searchParams.get("tab"))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [documentsData, setDocumentsData] = useState<ApplicantDocumentItem[]>([]);
  const [hireStatus, setHireStatus] = useState<OfficialHireStatusResponse['status'] | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [authApprovals, setAuthApprovals] = useState<Record<number, boolean>>({});
  const [complianceData, setComplianceData] = useState<ComplianceData | undefined>(undefined);
  const [signatures, setSignatures] = useState<{
    conditionalHire?: { signatureType: string; signatureData: string; status?: string; createdAt?: { _seconds: number; _nanoseconds: number } } | null;
    officialHire?: { signatureType: string; signatureData: string; status?: string; createdAt?: { _seconds: number; _nanoseconds: number } } | null;
  } | null>(null);
  const [reviewSteps, setReviewSteps] = useState<ReviewStepsState>({
    documentsValid: { confirmed: false },
    backgroundCheck: { confirmed: false },
    drugTest: { confirmed: false },
    fingerprint: { confirmed: false },
    trainings: { confirmed: false },
    systemProfile: { confirmed: false },
    orientation: { confirmed: false },
  });

  // Track status of each application step for tab styling
  const [stepStatuses, setStepStatuses] = useState<{
    profile: string | null;
    documents: string | null;
    conditional: string | null;
    final: boolean;
    official: string | null;
  }>({
    profile: null,
    documents: null,
    conditional: null,
    final: false,
    official: null,
  });

  // Helper to check if a step is complete (submitted or completed)
  const isStepComplete = (status: string | null | boolean): boolean => {
    if (typeof status === 'boolean') return status;
    if (!status) return false;
    return ['submitted', 'completed', 'letter_signed', 'pre-screening_complete'].includes(status.toLowerCase());
  };


  type ReferenceItem = {
    name: string;
    relation: string;
    mobile: string;
    email: string;
  };

  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [showAdvanceDocumentsDialog, setShowAdvanceDocumentsDialog] = useState(false);
  const [showRejectDocumentDialog, setShowRejectDocumentDialog] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectReviewStepDialog, setShowRejectReviewStepDialog] = useState(false);
  const [pendingRejectStepKey, setPendingRejectStepKey] = useState<keyof ReviewStepsState | null>(null);
  const [rejectReviewStepReason, setRejectReviewStepReason] = useState("");
  const [hasMovedBeyondDocumentsStage, setHasMovedBeyondDocumentsStage] =
    useState(false);

  const [applicant, setApplicant] = useState<{
    id: string;
    uid?: string;
    name: string;
    userType: string;
    applicantType?: string;
    role?: string;
    address?: string;
    dob?: string;
    gender?: string;
    email?: string;
    avatar: string;
    resumeUrl?: string;
    profileScreening: boolean;
    documents: boolean;
    conditionalHire: boolean;
    finalAgencyReview: boolean;
    questionnaire?: {
      isAtLeast18?: string;
      highSchoolDiploma?: string;
      legallyEligible?: string;
      convicted?: string;
      reliableTransportation?: string;
    };
  }>({
    id: id || "",
    name: "",
    userType: "",
    avatar: "",
    resumeUrl: "",
    profileScreening: false,
    documents: false,
    conditionalHire: false,
    finalAgencyReview: false,
  });

  // Resolve the applicant's document set from the shared config (default "dsp").
  const applicantType: ApplicantType =
    applicant.applicantType === "hha" ? "hha" : "dsp";
  const applicantDocDefs = getApplicantDocs(applicantType);

  // Short, agency-facing display labels. Preserves the existing DSP wording;
  // new HHA doc ids fall back to their config label.
  const DIRECTORY_DOC_LABELS: Record<string, string> = {
    "photo-id": "Photo ID",
    "driver-license": "Driver's License",
    "social-security-card": "Social Security Card",
    "diploma": "School Diploma Certificate",
    "certifications": "Extra Certificates",
    "hepatitis-b-vaccination": "Hepatitis B Vaccination",
    "hepatitis-b-immunity": "Hepatitis B Immunity",
    "tb-test": "TB Test",
    "chha-certificate": "CHHA Certificate",
    "cpr-certification": "CPR Certification",
    "cna-hha-license": "CNA/HHA License",
    "mmr-record": "MMR Record",
    "physical-exam": "Physical Exam",
    "additional-vaccination": "Additional Vaccination Records",
    "i9-form": "Filled I-9 form",
    "w4-form": "Filled W-4 form",
  };

  const directoryLabelFor = (def: { id: string; label: string }) =>
    DIRECTORY_DOC_LABELS[def.id] ?? def.label;

  // Document configuration derived from the shared config (single source of truth).
  const documentDefinitions = applicantDocDefs.map((def) => ({
    type: def.id,
    label: directoryLabelFor(def),
  }));

  const documentLabelByType: Record<string, string> = documentDefinitions.reduce(
    (acc, def) => {
      acc[def.type] = def.label;
      return acc;
    },
    {} as Record<string, string>
  );

  const handleNavigateToSection = (section: TabSection) => {
    setActiveSection(section);
    // Update URL query parameter
    setSearchParams({ tab: section });
  };

  // Sync activeSection with query parameter changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTab = getValidTab(tabFromUrl);
    setActiveSection(prev => {
      // Only update if the tab from URL is different from current state
      return validTab !== prev ? validTab : prev;
    });
  }, [searchParams]);

  const getDocumentUrlByType = (type: string) => {
    const item = documentsData.find((doc) => doc.type === type);
    return item?.url;
  };

  const handleConfirmReviewStep = async (stepKey: keyof ReviewStepsState) => {
    if (!id) return;
    setActionLoading(stepKey);
    try {
      // Call API to save confirmation
      await applicantsApi.confirmReviewStep(id, stepKey, true);

      setReviewSteps(prev => ({
        ...prev,
        [stepKey]: {
          confirmed: true,
          rejected: false,
          timestamp: new Date().toISOString()
        }
      }));
      toast({
        title: "Confirmed",
        description: "Review step confirmed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm step",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectReviewStepDialog = (stepKey: keyof ReviewStepsState) => {
    setPendingRejectStepKey(stepKey);
    setRejectReviewStepReason("");
    setShowRejectReviewStepDialog(true);
  };

  const handleRejectReviewStep = async () => {
    const stepKey = pendingRejectStepKey;
    if (!id || !stepKey) return;
    setActionLoading(stepKey);
    try {
      await applicantsApi.confirmReviewStep(id, stepKey, false, rejectReviewStepReason);

      setReviewSteps(prev => ({
        ...prev,
        [stepKey]: {
          confirmed: false,
          rejected: true,
        }
      }));
      setShowRejectReviewStepDialog(false);
      setPendingRejectStepKey(null);
      setRejectReviewStepReason("");
      toast({
        title: "Rejected",
        description: "Review step rejected. Applicant has been notified."
      });
      fetchApplicantData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject step",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch all applicant data with a single API call
  const fetchApplicantData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Single comprehensive API call
      const response = await applicantsApi.getByIdDetailed(id);

      if (!response?.data) {
        console.error('No applicant data returned');
        return;
      }

      const data = response.data;

      // Extract basic profile information
      setApplicant(prev => ({
        ...prev,
        id,
        uid: data.uid || prev.uid,
        name: data.fullName || prev.name,
        userType: data.userType || '',
        applicantType: (data as { applicantType?: string }).applicantType || prev.applicantType,
        role: (data as { role?: string }).role || prev.role,
        avatar: data.profilePictureUrl || prev.avatar,
        address: data.address?.address || prev.address,
        dob: data.dateOfBirth || prev.dob,
        gender: data.gender || prev.gender,
        email: data.email || prev.email,
        resumeUrl: data.preScreening?.resumeUrl || prev.resumeUrl,
        // Stage completions based on application status
        profileScreening: Boolean(data.preScreening?.status),
        documents: Boolean(data.eligibility?.status),
        conditionalHire: Boolean(data.conditionalHire?.status),
        finalAgencyReview: data.applicationStatus === 'approved' || false,
        // Map all pre-screening questions from preScreening data
        questionnaire: {
          isAtLeast18: data.preScreening?.isAtLeast18 ? 'Yes' : 'No',
          highSchoolDiploma: data.preScreening?.hasHighSchoolDiploma ? 'Yes' : 'No',
          legallyEligible: data.preScreening?.isLegallyEligible ? 'Yes' : 'No',
          convicted: data.preScreening?.hasBeenConvicted ? 'Yes' : 'No',
          reliableTransportation: data.preScreening?.hasReliableTransportation ? 'Yes' : 'No',
        },
      }));

      // Extract documents from eligibility data
      const eligibility = data.eligibility;
      const eligibilityDocumentStatuses = data.eligibilityDocumentStatuses || {};
      if (eligibility) {
        const normalizedDocs: ApplicantDocumentItem[] = [];
        const toIsoFromTimestamp = (
          ts?: { _seconds?: number; _nanoseconds?: number } | null,
        ) => {
          if (!ts || typeof ts._seconds !== "number") return undefined;
          return new Date(ts._seconds * 1000).toISOString();
        };

        // Build the doc map from the shared config (single source of truth),
        // keyed by the applicant's resolved type (default "dsp").
        const fetchedApplicantType: ApplicantType =
          (data as { applicantType?: string }).applicantType === "hha" ? "hha" : "dsp";
        const eligibilityRecord = eligibility as unknown as Record<string, DocumentFile | undefined>;
        const docMap: Record<string, { url?: DocumentFile; label: string }> = {};
        getApplicantDocs(fetchedApplicantType).forEach((def) => {
          docMap[def.id] = {
            url: eligibilityRecord[def.field],
            label: directoryLabelFor(def),
          };
        });

        Object.entries(docMap).forEach(([type, { url, label }]) => {
          if (url?.fileUrl) {
            const savedStatus = eligibilityDocumentStatuses?.[type];
            const status =
              savedStatus?.status && ["pending", "uploaded", "verified", "rejected"].includes(savedStatus.status)
                ? (savedStatus.status as ApplicantDocumentItem["status"])
                : ("uploaded" as const);
            normalizedDocs.push({
              id: type,
              type,
              label,
              required: false,
              status,
              url: url.fileUrl,
              expiryDate: typeof url.expiryDate === "string" ? url.expiryDate : undefined,
              uploadedAt: undefined,
              verifiedAt:
                status === "verified"
                  ? toIsoFromTimestamp(savedStatus?.updatedAt)
                  : undefined,
              note: savedStatus?.note || undefined,
            });
          }
        });

        setDocumentsData(normalizedDocs);

        // Calculate progress
        const total = normalizedDocs.length;
        const verified = normalizedDocs.filter(d => d.status === 'verified').length;
        setProgressPercent(total > 0 ? Math.round((verified / total) * 100) : 0);

        // Extract references
        if (Array.isArray(eligibility.references)) {
          const refs = eligibility.references.map(r => ({
            name: r.name || '',
            relation: r.relationship || '',
            mobile: r.phoneNumber || '',
            email: r.email || '',
          }));
          setReferences(refs);
        }
      }

      // Extract conditional hire status
      if (data.conditionalHire) {
        setHireStatus({
          status: data.conditionalHire.status || 'pending',
          letterSigning: {
            hasSigned: Boolean(data.conditionalHire.finalizedAt),
            signedAt: data.conditionalHire.finalizedAt
              ? new Date(data.conditionalHire.finalizedAt._seconds * 1000).toISOString()
              : undefined,
          },
        } as any);
      }

      // Extract compliance data
      if (data.compliance) {
        setComplianceData(data.compliance);
      }

      // Extract signatures data
      if (data.signatures) {
        setSignatures(data.signatures);
      }

      // Map reviews data to reviewSteps state
      if (data.reviews && typeof data.reviews === 'object') {
        const mappedReviews: ReviewStepsState = {
          documentsValid: { confirmed: false },
          backgroundCheck: { confirmed: false },
          drugTest: { confirmed: false },
          fingerprint: { confirmed: false },
          trainings: { confirmed: false },
          systemProfile: { confirmed: false },
          orientation: { confirmed: false },
        };

        // Map each review step from the API response
        Object.entries(data.reviews).forEach(([stepKey, reviewData]) => {
          // Only map if the stepKey exists in our ReviewStepsState
          if (stepKey in mappedReviews && reviewData) {
            const firebaseTimestamp = reviewData.timestamp || reviewData.updatedAt;
            const timestamp = firebaseTimestamp && firebaseTimestamp._seconds
              ? new Date(firebaseTimestamp._seconds * 1000).toISOString()
              : undefined;

            mappedReviews[stepKey as keyof ReviewStepsState] = {
              confirmed: Boolean(reviewData.confirmed),
              rejected: Boolean(
                reviewData.rejected ||
                (reviewData.confirmed === false &&
                  (reviewData.rejectedBy || reviewData.reason))
              ),
              timestamp,
            };
          }
        });

        setReviewSteps(mappedReviews);
      }

      // Extract step statuses for tab styling
      // Check if all review steps are confirmed for final review status
      const allReviewsConfirmed = data.reviews
        ? Object.keys(data.reviews).length === Object.keys(reviewSteps).length
        : false;

      setStepStatuses({
        profile: data.preScreening?.status || null,
        documents: data.eligibility?.status || null,
        conditional: data.conditionalHire?.status || null,
        final: allReviewsConfirmed,
        official: data.officialHireStatus || null,
      });

      const currentStep = String(data.currentApplicationStep || "").toLowerCase();
      const movedBeyondDocuments =
        currentStep === "conditional-hire" ||
        currentStep === "compliance" ||
        currentStep === "review" ||
        currentStep === "final-agency-review" ||
        currentStep === "official-hire" ||
        currentStep === "orientation";
      setHasMovedBeyondDocumentsStage(movedBeyondDocuments);

    } catch (error) {
      console.error('Error fetching applicant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantData();
  }, [id]);

  const handleVerifyDocument = async (docId: string) => {
    if (!id) return;
    setActionLoading(docId);
    try {
      await agencyApplicantsExtraApi.verifyDocument(id, docId, 'Accepted by agency');
      setDocumentsData(prev => prev.map(d => d.id === docId ? { ...d, status: 'verified' as const, verifiedAt: new Date().toISOString() } : d));
      toast({ title: 'Document Accepted', description: 'Document has been accepted successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to accept document.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectDocumentDialog = (docId: string) => {
    setPendingRejectDocumentId(docId);
    setRejectReason("");
    setShowRejectDocumentDialog(true);
  };

  const handleRejectDocument = async () => {
    const docId = pendingRejectDocumentId;
    if (!id) return;
    if (!docId) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a rejection reason before continuing.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(docId);
    try {
      await agencyApplicantsExtraApi.rejectDocument(id, docId, rejectReason.trim());
      setDocumentsData(prev => prev.map(d => d.id === docId ? { ...d, status: 'rejected' as const, note: rejectReason.trim() } : d));
      toast({ title: 'Document Rejected', description: 'Document has been rejected.' });
      setShowRejectDocumentDialog(false);
      setPendingRejectDocumentId(null);
      setRejectReason("");
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject document.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestDocument = async (docType: string) => {
    if (!id) return;
    setActionLoading(`request-${docType}`);
    try {
      await agencyApplicantsExtraApi.requestDocument(id, docType);
      toast({
        title: "Document Request Sent",
        description: "The applicant has been notified to upload the requested document.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to send document request.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const statusByType = new Map(documentsData.map((document) => [document.type, document.status]));
  // Required-docs affordance uses only the config-required defs (not optional uploads).
  const requiredDocumentTypes = applicantDocDefs
    .filter((def) => def.required)
    .map((def) => def.id);
  const allRequiredDocumentsExist = requiredDocumentTypes.every((type) =>
    Boolean(getDocumentUrlByType(type)),
  );
  const allUploadedDocumentsAccepted = requiredDocumentTypes.every(
    (type) => statusByType.get(type) === "verified",
  );
  const hasReferences = references.length > 0;
  const documentsPillCompleted = allRequiredDocumentsExist && hasReferences;

  // Conditional Hire pill: complete only when BOTH letter signed AND compliance finalized
  const conditionalPillCompleted =
    signatures?.conditionalHire?.status === "signed" && !!complianceData?.finalizedAt;

  const canAdvanceDocumentsStage =
    allRequiredDocumentsExist && allUploadedDocumentsAccepted && hasReferences;

  const handleConfirmAdvanceDocumentsStage = async () => {
    if (!id) return;
    setActionLoading("advance-documents-stage");
    try {
      await agencyApplicantsExtraApi.advanceFromDocuments(id);
      toast({
        title: "Application Moved",
        description: "The applicant has been moved to Conditional Hire & Compliance.",
      });
      setShowAdvanceDocumentsDialog(false);
      fetchApplicantData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to move applicant to next stage.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAuthorizationAlert = async (authKey: string) => {
    if (!id) return;
    setActionLoading(`alert-${authKey}`);
    try {
      await authorizationsApi.sendAlert(id, authKey, {
        message: `Please complete the pending ${authKey} requirement to continue your onboarding.`,
      });
      toast({
        title: "Alert Sent",
        description: "The applicant has been notified about this pending requirement.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to send alert.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendOfferLetter = async () => {
    if (!id) return;
    setActionLoading('offer-letter');
    try {
      await officialHireApi.sendOfferLetter({ applicantId: id, templateId: 'default', variables: {} });
      toast({ title: 'Offer Letter Sent', description: 'Official hire letter has been sent successfully.' });
      fetchApplicantData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send offer letter.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestSignature = async () => {
    if (!id) return;
    setActionLoading('signature');
    try {
      await officialHireApi.requestSignature({ applicantId: id, docId: 'official-hire' });
      toast({ title: 'Signature Requested', description: 'E-signature request has been sent.' });
      fetchApplicantData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to request signature.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmHire = async () => {
    if (!id) return;
    setActionLoading("confirm-hire");
    try {
      await officialHireApi.confirm(id);
      toast({
        title: "Hire Confirmed",
        description: "Official hire has been confirmed successfully.",
      });
      fetchApplicantData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm hire.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenChat = async () => {
    if (isOpeningChat) return;

    const applicantParticipantId = applicant.uid;
    const currentUserId = user?.uid;

    if (!currentUserId || !applicantParticipantId) {
      toast({
        title: "Error",
        description: "Unable to open chat right now.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsOpeningChat(true);

      const existingConversation = messaging.conversations.find((conversation) => {
        const participantIds = conversation.participantIds || [];
        const isDirectConversation =
          conversation.type === "direct" || participantIds.length === 2;

        return (
          isDirectConversation &&
          participantIds.includes(currentUserId) &&
          participantIds.includes(applicantParticipantId)
        );
      });

      const conversationId =
        existingConversation?.id ??
        (await messaging.createConversation([applicantParticipantId]))?.id;

      if (!conversationId) {
        return;
      }

      navigate(
        Routes.agency.supportConversation.replace(":conversationId", conversationId)
      );
    } catch (error) {
      // Error toast is already handled in the messaging context
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <VoiceRecordingProvider pageTitle="Applicant profile">
      <VoiceInputButton className="z-[60]" />
    <div className="min-h-screen">
      <div className="p-2">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(Routes.agency.applicantDirectory)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
              Applicant&apos;s directory
            </h1>
          </div>

          {/* Profile Header Card */}
          <div className="relative mb-6 rounded-[24px] bg-[rgba(255,255,255,0.8)] shadow-sm p-6 md:p-8">
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <Skeleton className="h-[145px] w-[127px] rounded-[12px]" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-24 rounded-full" />
                      <Skeleton className="h-10 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-9 w-40 rounded-full" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  {/* Avatar */}
                  <div className="h-[145px] w-[127px] rounded-[12px] bg-[#e0e0e0] overflow-hidden shrink-0">
                    {applicant.avatar ? (
                      <img
                        src={applicant.avatar}
                        alt={applicant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#808081]">
                        {applicant.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase())
                          .join("") || "AP"}
                      </div>
                    )}
                  </div>

                  {/* Name / meta / actions */}
                  <div className="flex-1 space-y-3">
                    <div className="inline-flex rounded-[60px] border border-[#0eaf52] bg-[#f0faf4] px-4 py-[6px]">
                      <span className="text-[10px] font-semibold leading-[1.4] text-[#0eaf52]">
                        {applicant.userType === 'applicant'
                          ? 'Applicant'
                          : roleLabel({ applicantType: applicant.applicantType, role: applicant.role })}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-[24px] font-semibold leading-[1.3] text-[#10141a]">
                        {applicant.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-medium leading-[1.6] text-[#808081]">
                        {applicant.address && <span>{applicant.address}</span>}
                        {applicant.address && applicant.dob && (
                          <span className="h-[6px] w-[6px] rounded-full bg-[#b2b2b3]" />
                        )}
                        {applicant.dob && <span>{applicant.dob}</span>}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button
                        disabled
                        className="flex items-center gap-2 rounded-[60px] bg-[#2b82ff] px-5 py-[10px] text-[14px] font-semibold text-white shadow-none hover:bg-[#2563eb] disabled:opacity-70"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                      {applicant.userType === 'employee' && (
                        <Button
                          variant="outline"
                          disabled={isOpeningChat}
                          className="flex items-center gap-2 rounded-[60px] border-[rgba(255,255,255,0.3)] bg-white/70 px-5 py-[10px] text-[14px] font-semibold text-[#10141a] shadow-none hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleOpenChat}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {isOpeningChat ? "Opening..." : "Chat"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage Pills */}
                <div className="relative z-10 mt-6 flex flex-wrap gap-3">
                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSection("profile")}
                    className={`pointer-events-auto flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "profile"
                      ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                      : !!(stepStatuses.profile)
                        ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                        : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                      }`}
                  >
                    {!!(stepStatuses.profile) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}
                    Profile &amp; Pre-Screening
                  </button>

                  {/* Documents */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSection("documents")}
                    className={`pointer-events-auto flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "documents"
                      ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                      : documentsPillCompleted
                        ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                        : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                      }`}
                  >
                    {documentsPillCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}
                    Document Upload &amp; Eligibility Verification
                  </button>

                  {/* Conditional Hire */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSection("conditional")}
                    className={`pointer-events-auto flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "conditional"
                      ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                      : conditionalPillCompleted
                        ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                        : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                      }`}
                  >
                    {conditionalPillCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}
                    Conditional Hire &amp; Compliance
                  </button>

                  {/* Final Review */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSection("final")}
                    className={`pointer-events-auto flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "final"
                      ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                      : isStepComplete(stepStatuses.final)
                        ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                        : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                      }`}
                  >
                    {isStepComplete(stepStatuses.final) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}
                    Final Agency Review
                  </button>

                  {/* Official Hire */}
                  <button
                    type="button"
                    onClick={() => handleNavigateToSection("official")}
                    className={`pointer-events-auto flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "official"
                      ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                      : isStepComplete(stepStatuses.official)
                        ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                        : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                      }`}
                  >
                    {isStepComplete(stepStatuses.official) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}
                    Official Hire
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tab Panels */}
          {activeSection === "profile" && <ProfileTab applicant={applicant} />}

          {activeSection === "documents" && (
            <DocumentsTab
              documentDefinitions={documentDefinitions}
              documents={documentsData}
              getDocumentUrlByType={getDocumentUrlByType}
              references={references}
              actionLoading={actionLoading}
              onVerifyDocument={handleVerifyDocument}
              onRejectDocument={handleOpenRejectDocumentDialog}
              onRequestDocument={handleRequestDocument}
              canAdvanceDocumentsStage={canAdvanceDocumentsStage}
              showAdvanceDocumentsAction={!hasMovedBeyondDocumentsStage}
              onAdvanceDocumentsStage={() => setShowAdvanceDocumentsDialog(true)}
            />
          )}

          {activeSection === "conditional" && (
            <ConditionalHireTab
              isLoading={isLoading}
              hireStatus={hireStatus}
              complianceData={complianceData}
              onSendAuthorizationAlert={handleSendAuthorizationAlert}
              actionLoading={actionLoading}
              signatureData={signatures?.conditionalHire}
            />
          )}

          {activeSection === "final" && (
            <FinalReviewTab
              reviewSteps={reviewSteps}
              onConfirm={handleConfirmReviewStep}
              onReject={handleOpenRejectReviewStepDialog}
              actionLoading={actionLoading}
            />
          )}

          {activeSection === "official" && (
            <OfficialHireTab
              isLoading={isLoading}
              hasSigned={Boolean(signatures?.officialHire)}
              signedAt={signatures?.officialHire?.createdAt?._seconds
                ? new Date(signatures.officialHire.createdAt._seconds * 1000).toISOString()
                : undefined}
              signatureData={signatures?.officialHire}
              actionLoading={actionLoading}
              onSendOfferLetter={handleSendOfferLetter}
              onRequestSignature={handleRequestSignature}
              onConfirmHire={handleConfirmHire}
            />
          )}

          <ConfirmDialog
            open={showAdvanceDocumentsDialog}
            onOpenChange={setShowAdvanceDocumentsDialog}
          >
            <ConfirmDialogContent
              title="Move to Next Stage?"
              description="This will move the applicant to Conditional Hire & Compliance Stage."
              confirmText="Yes, Move"
              cancelText="Cancel"
              onConfirm={handleConfirmAdvanceDocumentsStage}
              onCancel={() => setShowAdvanceDocumentsDialog(false)}
              isLoading={actionLoading === "advance-documents-stage"}
              loadingText="Moving..."
            />
          </ConfirmDialog>

          <ConfirmDialog
            open={showRejectDocumentDialog}
            onOpenChange={setShowRejectDocumentDialog}
          >
            <ConfirmDialogContent
              title="Reject Document?"
              description="Please provide a reason. This reason will be sent to the applicant."
              confirmText="Reject Document"
              cancelText="Cancel"
              onConfirm={handleRejectDocument}
              onCancel={() => {
                setShowRejectDocumentDialog(false);
                setPendingRejectDocumentId(null);
                setRejectReason("");
              }}
              isLoading={Boolean(
                pendingRejectDocumentId && actionLoading === pendingRejectDocumentId,
              )}
              loadingText="Rejecting..."
            >
              <VoiceEnabledTextarea
                value={rejectReason}
                onChange={(v) => setRejectReason(v)}
                onVoiceAccepted={(t) =>
                  setRejectReason((prev) =>
                    prev.trim() ? `${prev.trim()} ${t.trim()}` : t.trim()
                  )
                }
                placeholder="Enter rejection reason"
                className="mt-3 min-h-[96px]"
                fieldName="Document rejection reason"
                pageTitle="Applicant profile"
                disabled={Boolean(
                  pendingRejectDocumentId && actionLoading === pendingRejectDocumentId,
                )}
              />
            </ConfirmDialogContent>
          </ConfirmDialog>

          <ConfirmDialog
            open={showRejectReviewStepDialog}
            onOpenChange={setShowRejectReviewStepDialog}
          >
            <ConfirmDialogContent
              title="Reject Review Step?"
              description="Optionally provide a reason. The applicant will be notified."
              confirmText="Reject"
              cancelText="Cancel"
              onConfirm={handleRejectReviewStep}
              onCancel={() => {
                setShowRejectReviewStepDialog(false);
                setPendingRejectStepKey(null);
                setRejectReviewStepReason("");
              }}
              isLoading={Boolean(
                pendingRejectStepKey && actionLoading === pendingRejectStepKey,
              )}
              loadingText="Rejecting..."
            >
              <VoiceEnabledTextarea
                value={rejectReviewStepReason}
                onChange={(v) => setRejectReviewStepReason(v)}
                onVoiceAccepted={(t) =>
                  setRejectReviewStepReason((prev) =>
                    prev.trim() ? `${prev.trim()} ${t.trim()}` : t.trim()
                  )
                }
                placeholder="Enter rejection reason (optional)"
                className="mt-3 min-h-[96px]"
                fieldName="Review step rejection reason"
                pageTitle="Applicant profile"
                disabled={Boolean(
                  pendingRejectStepKey && actionLoading === pendingRejectStepKey,
                )}
              />
            </ConfirmDialogContent>
          </ConfirmDialog>
        </div>
      </div>
    </div>
    </VoiceRecordingProvider>
  );
}

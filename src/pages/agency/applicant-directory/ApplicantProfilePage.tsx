
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Phone,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Eye,
  CheckCircle,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Routes } from "@/routes/constants";
import { applicantsApi, type Applicant, type ApplicantDetailResponse, type ComplianceData } from "@/lib/api/applicants";
import type { EligibilityData } from "@/lib/api/applicants";
import { useToast } from "@/hooks/use-toast";
import { agencyApplicantsExtraApi, ApplicantDocumentItem } from "@/lib/api/agencyApplicantsExtra";
import { officialHireApi, OfficialHireStatusResponse } from "@/lib/api/officialHire";
import { storageApi } from "@/lib/api/storage";
import { authorizationsApi } from "@/lib/api/authorizations";
import { ProfileTab } from "./components/ProfileTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ConditionalHireTab } from "./components/ConditionalHireTab";
import { OfficialHireTab } from "./components/OfficialHireTab";
import { FinalReviewTab, type ReviewStepsState } from "./components/FinalReviewTab";

// Type alias for document file from eligibility data
type DocumentFile = NonNullable<EligibilityData['photoIdUrl']>;

export default function ApplicantProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"profile" | "documents" | "conditional" | "official" | "final">("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [documentsData, setDocumentsData] = useState<ApplicantDocumentItem[]>([]);
  const [hireStatus, setHireStatus] = useState<OfficialHireStatusResponse['status'] | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [authApprovals, setAuthApprovals] = useState<Record<number, boolean>>({});
  const [complianceData, setComplianceData] = useState<ComplianceData | undefined>(undefined);
  const [signatures, setSignatures] = useState<{
    conditionalHire?: { signatureType: string; signatureData: string; createdAt?: { _seconds: number; _nanoseconds: number } } | null;
    officialHire?: { signatureType: string; signatureData: string; createdAt?: { _seconds: number; _nanoseconds: number } } | null;
  } | null>(null);
  const [toggledAuthorizations, setToggledAuthorizations] = useState<Set<string>>(new Set());
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
    return ['submitted', 'completed', 'letter_signed'].includes(status.toLowerCase());
  };


  type ReferenceItem = {
    name: string;
    relation: string;
    mobile: string;
    email: string;
  };

  const [references, setReferences] = useState<ReferenceItem[]>([]);

  const [applicant, setApplicant] = useState<{
    id: string;
    name: string;
    role: string;
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
    role: "Applicant",
    avatar: "",
    resumeUrl: "",
    profileScreening: false,
    documents: false,
    conditionalHire: false,
    finalAgencyReview: false,
  });

  // Document and references configuration - mirror main /documents items
  const documentDefinitions = [
    { type: "photo-id", label: "Photo ID" }, // documents.photoId.fileType
    { type: "social-security-card", label: "Social Security Card" }, // documents.socialSecurityCard.fileType
    { type: "diploma", label: "School Diploma Certificate" }, // documents.diploma.fileType
    { type: "certifications", label: "Extra Certificates" }, // documents.certifications (array/object)
    { type: "hepatitis-b-vaccination", label: "Hepatitis B Vaccination" }, // documents.hepatitisBVaccination.fileType
    { type: "hepatitis-b-immunity", label: "Hepatitis B Immunity" }, // documents.hepatitisBImmunity.fileType
    { type: "tb-test", label: "TB Test" }, // documents.tbTest
    { type: "i9-form", label: "Filled I-9 form" }, // documents.i9Form.fileType
    { type: "w4-form", label: "Filled W-4 form" }, // documents.w4Form.fileType
  ] as const;

  const documentLabelByType: Record<string, string> = documentDefinitions.reduce(
    (acc, def) => {
      acc[def.type] = def.label;
      return acc;
    },
    {} as Record<string, string>
  );

  const handleNavigateToSection = (section: "profile" | "documents" | "conditional" | "official" | "final") => {
    setActiveSection(section);
    // No navigation, just switch tab
  };

  const getDocumentUrlByType = (type: string) => {
    const item = documentsData.find((doc) => doc.type === type);
    return item?.url;
  };

  const handleToggleCompliance = async (authKey: string, checked: boolean) => {
    if (!id) return;
    try {
      await authorizationsApi.update(id, { [authKey]: checked });
      // Add to toggled set to disable the toggle
      setToggledAuthorizations(prev => new Set(prev).add(authKey));
      toast({
        title: "Success",
        description: `Authorization ${checked ? 'approved' : 'disapproved'}`,
      });
      // Refresh applicant data
      fetchApplicantData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update authorization",
        variant: "destructive",
      });
    }
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
        name: data.fullName || prev.name,
        role: data.userType === 'applicant' ? 'Applicant' : (prev.role || 'Applicant'),
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
      if (eligibility) {
        const normalizedDocs: ApplicantDocumentItem[] = [];

        // Map each document type
        const docMap: Record<string, { url?: DocumentFile; label: string }> = {
          'photo-id': { url: eligibility.photoIdUrl, label: 'Photo ID' },
          'social-security-card': { url: eligibility.socialSecurityCardUrl, label: 'Social Security Card' },
          'diploma': { url: eligibility.diplomaUrl, label: 'School Diploma Certificate' },
          'certifications': { url: eligibility.certificationsUrl, label: 'Extra Certificates' },
          'hepatitis-b-vaccination': { url: eligibility.hepatitisBVaccinationUrl, label: 'Hepatitis B Vaccination' },
          'hepatitis-b-immunity': { url: eligibility.hepatitisBImmunityUrl, label: 'Hepatitis B Immunity' },
          'tb-test': { url: eligibility.tbTestResultUrl, label: 'TB Test' },
          'i9-form': { url: eligibility.i9FormUrl, label: 'Filled I-9 form' },
          'w4-form': { url: eligibility.w4FormUrl, label: 'Filled W-4 form' },
        };

        Object.entries(docMap).forEach(([type, { url, label }]) => {
          if (url?.fileUrl) {
            normalizedDocs.push({
              id: type,
              type,
              label,
              required: false,
              status: 'uploaded' as const,
              url: url.fileUrl,
              uploadedAt: undefined,
              verifiedAt: undefined,
              note: undefined,
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
              timestamp,
            };
          }
        });

        setReviewSteps(mappedReviews);
      }

      // Extract step statuses for tab styling
      // Check if all review steps are confirmed for final review status
      const allReviewsConfirmed = data.reviews
        ? Object.values(data.reviews).every((review: any) => review?.confirmed === true)
        : false;

      setStepStatuses({
        profile: data.preScreening?.status || null,
        documents: data.eligibility?.status || null,
        conditional: data.conditionalHire?.status || null,
        final: allReviewsConfirmed,
        official: data.officialHireStatus || null,
      });

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
      await agencyApplicantsExtraApi.verifyDocument(id, docId, 'Verified by agency');
      setDocumentsData(prev => prev.map(d => d.id === docId ? { ...d, status: 'verified' as const, verifiedAt: new Date().toISOString() } : d));
      toast({ title: 'Document Verified', description: 'Document has been verified successfully.' });
      fetchApplicantData(); // Refresh to update progress
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to verify document.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    if (!id) return;
    setActionLoading(docId);
    try {
      await agencyApplicantsExtraApi.rejectDocument(id, docId, 'Document requires corrections');
      setDocumentsData(prev => prev.map(d => d.id === docId ? { ...d, status: 'rejected' as const, note: 'Document requires corrections' } : d));
      toast({ title: 'Document Rejected', description: 'Document has been rejected.' });
      fetchApplicantData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject document.', variant: 'destructive' });
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
      await officialHireApi.requestSignature({ applicantId: id, docId: 'conditional-hire-letter' });
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

  return (
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
                    {applicant.role || "Applicant"}
                  </span>
                </div>
                <div>
                  <h2 className="text-[24px] font-semibold leading-[1.3] text-[#10141a]">
                    {applicant.name || "DR.Brooklyn Simmons"}
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
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 rounded-[60px] border-[rgba(255,255,255,0.3)] bg-white/70 px-5 py-[10px] text-[14px] font-semibold text-[#10141a] shadow-none hover:bg-white"
                    onClick={() => navigate(Routes.agency.support)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Stage Pills */}
            <div className="mt-6 flex flex-wrap gap-3">
              {/* Profile */}
              <button
                type="button"
                onClick={() => handleNavigateToSection("profile")}
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "profile"
                    ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                    : isStepComplete(stepStatuses.profile)
                      ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                      : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                  }`}
              >
                {isStepComplete(stepStatuses.profile) ? (
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
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "documents"
                    ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                    : isStepComplete(stepStatuses.documents)
                      ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                      : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                  }`}
              >
                {isStepComplete(stepStatuses.documents) ? (
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
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "conditional"
                    ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                    : isStepComplete(stepStatuses.conditional)
                      ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                      : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                  }`}
              >
                {isStepComplete(stepStatuses.conditional) ? (
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
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "final"
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
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "official"
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
          </div>

          {/* Tab Panels */}
          {activeSection === "profile" && <ProfileTab applicant={applicant} />}

          {activeSection === "documents" && (
            <DocumentsTab
              documentDefinitions={documentDefinitions}
              getDocumentUrlByType={getDocumentUrlByType}
              references={references}
            />
          )}

          {activeSection === "conditional" && (
            <ConditionalHireTab
              isLoading={isLoading}
              hireStatus={hireStatus}
              actionLoading={actionLoading}
              onRequestSignature={handleRequestSignature}
              complianceData={complianceData}
              toggledAuthorizations={toggledAuthorizations}
              onToggleAuthorization={handleToggleCompliance}
              signatureData={signatures?.conditionalHire}
            />
          )}

          {activeSection === "final" && (
            <FinalReviewTab
              reviewSteps={reviewSteps}
              onConfirm={handleConfirmReviewStep}
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
              actionLoading={actionLoading}
              onRequestSignature={handleSendOfferLetter}
              signatureData={signatures?.officialHire}
            />
          )}
        </div>
      </div>
    </div>
  );
}


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
import { applicantsApi, type Applicant } from "@/lib/api/applicants";
import { useToast } from "@/hooks/use-toast";
import { agencyApplicantsExtraApi, ApplicantDocumentItem } from "@/lib/api/agencyApplicantsExtra";
import { officialHireApi, OfficialHireStatusResponse } from "@/lib/api/officialHire";
import { storageApi } from "@/lib/api/storage";
import { authorizationsApi } from "@/lib/api/authorizations";
import { ProfileTab } from "./components/ProfileTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ConditionalHireTab } from "./components/ConditionalHireTab";
import { FinalReviewTab, type AuthorizationConfig } from "./components/FinalReviewTab";

export default function ApplicantProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"profile" | "documents" | "conditional" | "final">("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [documentsData, setDocumentsData] = useState<ApplicantDocumentItem[]>([]);
  const [hireStatus, setHireStatus] = useState<OfficialHireStatusResponse['status'] | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [authApprovals, setAuthApprovals] = useState<Record<number, boolean>>({});

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
    profileScreening: boolean;
    documents: boolean;
    conditionalHire: boolean;
    finalAgencyReview: boolean;
    questionnaire?: {
      highSchoolDiploma?: string;
      legallyEligible?: string;
      convicted?: string;
      convictedRepeat?: string;
    };
  }>({
    id: id || "",
    name: "",
    role: "Applicant",
    avatar: "",
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
  const conditionalHireData = {
    letterSigned: true,
    signedDate: "18 January 2022",
  };
  const authorizations: AuthorizationConfig[] = [
    { name: "Authorize Drug test appointment", status: "Enabled", bookingLink: true },
    { name: "Authorize Fingerprint appointment", status: "Enabled", bookingLink: true },
    { name: "Authorize Central Registry Check (Developmental Disabilities Abuse/Neglect Registry)", status: "Enabled", bookingLink: true },
    { name: "Authorize CARI Check (Child Abuse Record Information, DCF)", status: "Enabled", bookingLink: true },
    { name: "Authorize Sex Offender Registry Check (Megan's Law)", status: "Enabled", bookingLink: true },
    { name: "Authorize OIG Exclusion List Check (LEIE)", status: "Disabled", bookingLink: false },
    { name: "Authorize Health & TB Screening", status: "Enabled", bookingLink: true },
    { name: "Authorize Reference Checks (Minimum 2, Non-Family)", status: "Enabled", bookingLink: true },
  ];

  const handleNavigateToSection = (section: "profile" | "documents" | "conditional" | "final") => {
    setActiveSection(section);
    // No navigation, just switch tab
  };

  const getDocumentUrlByType = (type: string) => {
    const item = documentsData.find((doc) => doc.type === type);
    return item?.url;
  };

  // Fetch documents and hire status
  const fetchApplicantData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [detailRes, docsRes, statusRes] = await Promise.all([
        applicantsApi.getById(id).catch(() => null),
        agencyApplicantsExtraApi.documents(id).catch(() => ({ success: false, documents: [] })),
        officialHireApi.status(id).catch(() => null),
      ]);
      if (detailRes?.data) {
        // Map backend fields to UI model where possible
        setApplicant(prev => ({
          ...prev,
          id,
          name: detailRes.data.name ?? prev.name,
          role: detailRes.data.role ?? prev.role,
          // use mapped profile picture url from applicantsApi.getById
          avatar: (detailRes.data as any).profilePictureUrl ?? prev.avatar,
          profileScreening: detailRes.data.profileScreening,
          documents: detailRes.data.documents,
          conditionalHire: detailRes.data.conditionalHire,
          finalAgencyReview: detailRes.data.finalAgencyReview,
        }));
      }
      if (docsRes.success) {
        // Support both legacy array and new keyed-object responses
        let normalizedDocs: ApplicantDocumentItem[] = [];

        if (Array.isArray(docsRes.documents)) {
          normalizedDocs = docsRes.documents;
        } else if (docsRes.documents && typeof docsRes.documents === "object") {
          const rawDocs = docsRes.documents as Record<string, any>;

          // Map references if present
          const refs = Array.isArray(rawDocs.references)
            ? rawDocs.references.map((r: any) => ({
              name: r.name ?? "",
              relation: r.relationship ?? "",
              mobile: r.phoneNumber ?? "",
              email: r.email ?? "",
            }))
            : [];
          if (refs.length) {
            setReferences(refs);
          }

          normalizedDocs = Object.entries(rawDocs)
            .filter(([key, value]) => key !== "references" && value && value.fileUrl)
            .map(([key, value]) => {
              const v = value as any;
              const type = v.fileType || key;
              const label =
                documentLabelByType[type] ||
                key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  .trim();

              return {
                id: key,
                type,
                label,
                required: false,
                status: "uploaded" as const,
                url: v.fileUrl,
                uploadedAt: undefined,
                verifiedAt: undefined,
                note: undefined,
              };
            });
        }

        setDocumentsData(normalizedDocs);
        const uploaded = normalizedDocs.filter(
          (d: ApplicantDocumentItem) => d.status !== "pending"
        ).length;
        const verified = normalizedDocs.filter(
          (d: ApplicantDocumentItem) => d.status === "verified"
        ).length;
        const total = normalizedDocs.length;
        setProgressPercent(total > 0 ? Math.round((verified / total) * 100) : 0);
      }
      if (statusRes?.success) {
        setHireStatus(statusRes.status);
      }
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
                  : "bg-[rgba(178,178,179,0.05)] text-[#525253] border-[#b2b2b3]"
                  }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Profile &amp; Pre-Screening
              </button>

              {/* Documents */}
              <button
                type="button"
                onClick={() => handleNavigateToSection("documents")}
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "documents"
                  ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                  : "bg-[rgba(178,178,179,0.05)] text-[#525253] border-[#525253]"
                  }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Document Upload &amp; Eligibility Verification
              </button>

              {/* Conditional Hire */}
              <button
                type="button"
                onClick={() => handleNavigateToSection("conditional")}
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "conditional"
                  ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                  : "bg-[rgba(178,178,179,0.05)] text-[#525253] border-[#525253]"
                  }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Conditional Hire &amp; Compliance
              </button>

              {/* Final Review */}
              <button
                type="button"
                onClick={() => handleNavigateToSection("final")}
                className={`flex items-center gap-2 rounded-[60px] px-4 py-2 text-[12px] font-medium border transition-colors cursor-pointer ${activeSection === "final"
                  ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                  : "bg-[rgba(213,52,17,0.05)] text-[#d53411] border-[#d53411]"
                  }`}
              >
                <CircleAlert className="h-4 w-4" />
                Final Agency Review
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
            />
          )}

          {activeSection === "final" && (
            <FinalReviewTab
              authorizations={authorizations}
              authApprovals={authApprovals}
              actionLoading={actionLoading}
              onSendLetter={handleSendOfferLetter}
              onSendAlert={async (authName) => {
                if (!id) return;
                try {
                  await agencyApplicantsExtraApi.createAuthorizationAlert(id, {
                    authorizationType: authName,
                    severity: "high",
                    message: `Authorization alert for ${authName}`,
                  });
                  toast({
                    title: "Alert Sent",
                    description: `Alert sent for ${authName}`,
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description:
                      error?.response?.data?.message || "Failed to send alert",
                    variant: "destructive",
                  });
                }
              }}
              onToggleAuthorization={async (index, checked, authName) => {
                if (!id) return;
                setAuthApprovals((prev) => ({
                  ...prev,
                  [index]: checked,
                }));

                const authFieldMap: Record<string, string> = {
                  "Authorize Drug test appointment": "drugTest",
                  "Authorize Fingerprint appointment": "fingerprint",
                  "Authorize Central Registry Check (Developmental Disabilities Abuse/Neglect Registry)":
                    "centralRegistry",
                  "Authorize CARI Check (Child Abuse Record Information, DCF)":
                    "cariCheck",
                  "Authorize Sex Offender Registry Check (Megan's Law)":
                    "sexOffenderRegistry",
                  "Authorize OIG Exclusion List Check (LEIE)": "oigExclusion",
                  "Authorize Health & TB Screening": "healthTbScreening",
                  "Authorize Reference Checks (Minimum 2, Non-Family)":
                    "referenceChecks",
                };

                const authField = authFieldMap[authName];
                if (!authField) return;

                try {
                  await authorizationsApi.update(id, { [authField]: checked });
                  toast({
                    title: "Success",
                    description: `${authName} ${checked ? "approved" : "disapproved"
                      }`,
                  });
                } catch (error: any) {
                  setAuthApprovals((prev) => ({
                    ...prev,
                    [index]: !checked,
                  }));
                  toast({
                    title: "Error",
                    description:
                      error?.response?.data?.message ||
                      "Failed to update authorization",
                    variant: "destructive",
                  });
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

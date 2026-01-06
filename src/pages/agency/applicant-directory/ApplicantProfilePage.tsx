
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Phone, MessageSquare, ArrowLeft, ExternalLink, Eye, Upload, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Routes } from "@/routes/constants";
import { applicantsApi, type Applicant } from "@/lib/api/applicants";
import { useToast } from "@/hooks/use-toast";
import { agencyApplicantsExtraApi, ApplicantDocumentItem } from "@/lib/api/agencyApplicantsExtra";
import { officialHireApi, OfficialHireStatusResponse } from "@/lib/api/officialHire";
import { storageApi } from "@/lib/api/storage";

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

  // Mock data for other tabs
  const documents = [
    { name: "Photo ID", icon: "📄" },
    { name: "Social Security Card", icon: "📄" },
    { name: "School Diploma Certificate", icon: "📄" },
    { name: "Extra Certificates", icon: "📄" },
    { name: "Filled I-9 form", icon: "📄" },
    { name: "Filled W-4 form", icon: "📄" },
  ];
  const references = [
    {
      name: "Nur Nabi Rahman",
      relation: "Colleague",
      mobile: "+88019I3527742",
      email: "nurnabi@liroagency",
    },
    {
      name: "Nur Nabi Rahman",
      relation: "Colleague",
      mobile: "+88019I3527742",
      email: "nurnabi@liroagency",
    },
  ];
  const conditionalHireData = {
    letterSigned: true,
    signedDate: "18 January 2022",
  };
  const authorizations = [
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
          avatar: (detailRes.data as any).avatar ?? prev.avatar,
          profileScreening: detailRes.data.profileScreening,
          documents: detailRes.data.documents,
          conditionalHire: detailRes.data.conditionalHire,
          finalAgencyReview: detailRes.data.finalAgencyReview,
        }));
      }
      if (docsRes.success) {
        setDocumentsData(docsRes.documents);
        const uploaded = docsRes.documents.filter((d: ApplicantDocumentItem) => d.status !== 'pending').length;
        const verified = docsRes.documents.filter((d: ApplicantDocumentItem) => d.status === 'verified').length;
        const total = docsRes.documents.length;
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
    setActionLoading('confirm-hire');
    try {
      await officialHireApi.confirm(id);
      toast({ title: 'Hire Confirmed', description: 'Official hire has been confirmed successfully.' });
      fetchApplicantData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to confirm hire.', variant: 'destructive' });
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
              onClick={() => navigate(Routes.agency.applicantClearanceHiring)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Applicant's directory
            </h1>
          </div>

          {/* Profile Card */}
          <div className="p-8 mb-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-start gap-6">
              <img
                src={applicant.avatar}
                alt={applicant.name}
                className="w-32 h-32 rounded-full"
              />
              <div className="flex-1">
                <Badge className="mb-3 text-green-800 bg-green-100">
                  {applicant.role}
                </Badge>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  {applicant.name}
                </h2>
                <p className="mb-4 text-gray-600">
                  {applicant.address} • {applicant.dob}
                </p>
                <div className="flex gap-3">
                  <Button 
                    disabled
                    className="text-gray-400 bg-gray-200 cursor-not-allowed hover:bg-gray-200"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300"
                    onClick={() => navigate(Routes.agency.support)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleNavigateToSection("profile")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "profile"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {applicant.profileScreening && <span className="mr-1">✓</span>}
                Profile & Pre-Screening
              </button>
              <button
                onClick={() => handleNavigateToSection("documents")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "documents"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {documentsData.filter(d => d.status === 'verified').length > 0 && <span className="mr-1">✓</span>}
                Document Upload & Eligibility Verification
              </button>
              <button
                onClick={() => handleNavigateToSection("conditional")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "conditional"
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {hireStatus?.letterSigning?.hasSigned && <span className="mr-1">✓</span>}
                Conditional Hire & Compliance
              </button>
              <button
                onClick={() => handleNavigateToSection("final")}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeSection === "final"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {hireStatus?.overall?.status === 'completed' ? <span className="mr-1">✓</span> : <span className="mr-1">!</span>}
                Final Agency Review
              </button>
            </div>
          </div>

          {/* Tab Panels */}
          {activeSection === "profile" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Profile & Pre-Screening</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Gender</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.gender}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.email}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Do you have a High School Diploma or GED?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire?.highSchoolDiploma ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Are you legally eligible to work in the U.S.?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire?.legallyEligible ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Have you ever been convicted of a disqualifying offense under NJ law?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire?.convicted ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Have you ever been convicted of a disqualifying offense under NJ law?</span>
                  <span className="text-sm font-medium text-gray-900">{applicant.questionnaire?.convictedRepeat ?? '-'}</span>
                </div>
                {/* Resume Section */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Resume</span>
                  </div>
                  <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                    View Resume
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "documents" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                <div className="text-sm text-gray-600">
                  Progress: {progressPercent}% ({documentsData.filter(d => d.status === 'verified').length}/{documentsData.length} verified)
                </div>
              </div>
              {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading documents...</div>
              ) : documentsData.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No documents found</div>
              ) : (
                <div className="space-y-3">
                  {documentsData.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center flex-1 gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{doc.label}</span>
                            {doc.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </div>
                          {doc.uploadedAt && (
                            <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          )}
                          {doc.note && <p className="text-xs text-red-600">{doc.note}</p>}
                        </div>
                        <Badge className={
                          doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                          doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                          doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {doc.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {doc.url && (
                          <Button variant="outline" size="sm" className="text-teal-600 border-teal-600 hover:bg-teal-50" onClick={() => window.open(doc.url, '_blank')}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                        {doc.status === 'uploaded' && (
                          <>
                            <Button
                              size="sm"
                              className="text-white bg-green-600 hover:bg-green-700"
                              onClick={() => handleVerifyDocument(doc.id)}
                              disabled={actionLoading === doc.id}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleRejectDocument(doc.id)}
                              disabled={actionLoading === doc.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="mt-10 mb-6 text-lg font-semibold text-gray-900">References</h3>
              <div className="grid grid-cols-2 gap-6">
                {references.map((ref, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="mb-1 text-sm font-semibold text-gray-900">{ref.name}</h4>
                    <p className="mb-3 text-xs text-gray-500">{ref.relation}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Mobile</span>
                        <span className="font-medium text-gray-900">{ref.mobile}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Email</span>
                        <span className="font-medium text-gray-900">{ref.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "conditional" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Conditional Hire</h3>
              {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading status...</div>
              ) : hireStatus?.letterSigning?.hasSigned ? (
                <div className="p-6 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center shrink-0 w-12 h-12 bg-green-100 rounded-full">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="mb-1 text-base font-semibold text-gray-900">
                          Conditional Hire Letter Signed
                        </h4>
                        <p className="text-sm text-gray-600">
                          {hireStatus.letterSigning.signedAt ? `Signed on ${new Date(hireStatus.letterSigning.signedAt).toLocaleDateString()}` : 'Signature received'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Type: {hireStatus.letterSigning.signatureType}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50">
                      <Eye className="w-4 h-4 mr-2" />
                      View Signed Letter
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="mb-4 text-sm text-gray-600">Conditional hire letter not yet signed.</p>
                  <Button
                    onClick={handleRequestSignature}
                    disabled={actionLoading === 'signature'}
                    className="text-white bg-teal-500 hover:bg-teal-600"
                  >
                    {actionLoading === 'signature' ? 'Requesting...' : 'Request Signature'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeSection === "final" && (
            <div className="p-8 bg-white rounded-lg shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Final Agency Review</h3>
              <div className="space-y-3">
                {authorizations.map((auth, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <span className="flex-1 text-sm text-gray-900">{auth.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge className={auth.status === "Enabled" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {auth.status}
                      </Badge>
                      {auth.bookingLink && (
                        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Go to appointment booking
                        </Button>
                      )}
                      {!auth.bookingLink && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Send Alert
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Send Offer Letter Section */}
              <div className="p-6 mt-8 border border-gray-200 rounded-lg bg-gray-50">
                {hireStatus?.overall?.status === 'completed' ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Official Hire Complete</h4>
                      <p className="text-sm text-gray-600">All steps completed successfully.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-gray-600">
                      {hireStatus?.overall?.readyForNextStep
                        ? 'Everything looks good! Send Official Hire letter!'
                        : 'Complete previous steps before sending offer letter.'}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSendOfferLetter}
                        disabled={actionLoading === 'offer-letter' || !hireStatus?.overall?.readyForNextStep}
                        className="text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300"
                      >
                        {actionLoading === 'offer-letter' ? 'Sending...' : 'Send Offer Letter!'}
                      </Button>
                      {hireStatus?.overall?.status === 'in_progress' && (
                        <Button
                          onClick={handleConfirmHire}
                          disabled={actionLoading === 'confirm-hire'}
                          className="text-white bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === 'confirm-hire' ? 'Confirming...' : 'Confirm Hire'}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DigitalSignatureModal from "./DigitalSignature";
import ComplianceStep from "./ComplianceStep";
import {
  useCheckSignatureStatusQuery,
  useSubmitConditionalHireMutation,
} from "@/pages/applicant/application/api";
import { useAuth } from "@/utils/auth";
import { toast } from "sonner";

interface ConditionalHireStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function ConditionalHireStep({
  onBack,
  onNext,
}: ConditionalHireStepProps) {
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCompliancePage, setShowCompliancePage] = useState(false);
  const [submissionSuccessful, setSubmissionSuccessful] = useState(false);
  const { data: signatureStatus, refetch: refetchSignature } =
    useCheckSignatureStatusQuery("conditional-hire");
  const [submitConditionalHire, { isLoading: isSubmitting }] =
    useSubmitConditionalHireMutation();
  const { user } = useAuth();

  const hasSignature = !!signatureStatus?.data?.signatureId;
  const userName = user?.fullName || user?.email?.split("@")[0] || "Applicant";

  // Auto-submit if signature exists, or show letter modal if not signed
  useEffect(() => {
    const autoSubmitIfSigned = async () => {
      // Only run auto-submit logic if we haven't manually shown compliance page
      if (showCompliancePage) {
        return; // Already showing compliance, don't interfere
      }

      if (hasSignature && !submissionSuccessful) {
        // Signature exists, directly submit conditional hire
        try {
          await submitConditionalHire().unwrap();
          setSubmissionSuccessful(true);
          toast.success("Conditional hire letter already signed!", {
            description: "Proceeding with compliance requirements.",
            duration: 4000,
          });
          setShowCompliancePage(true);
          setShowLetterModal(false);
        } catch (error) {          toast.error("Failed to submit conditional hire", {
            description: "Please try again.",
            duration: 4000,
          });
          // Show letter modal to let user retry
          setShowLetterModal(true);
        }
      } else if (hasSignature && submissionSuccessful) {
        // Already submitted, show compliance
        setShowCompliancePage(true);
        setShowLetterModal(false);
      } else if (!hasSignature && !submissionSuccessful) {
        // No signature, show letter modal
        setShowLetterModal(true);
        setShowCompliancePage(false);
      }
    };

    autoSubmitIfSigned();
  }, [hasSignature]); // Only depend on hasSignature, not submissionSuccessful

  const handleAccept = () => {
    setShowLetterModal(false);
    setShowSignatureModal(true);
  };

  const handleReject = () => {
    setShowLetterModal(false);
    // Handle rejection - go back to previous step
    if (onBack) {
      onBack();
    }
  };

  const handleSignatureComplete = async () => {
    setShowSignatureModal(false);

    try {
      // Submit conditional hire to backend with acceptance
      await submitConditionalHire().unwrap();
      setSubmissionSuccessful(true);
      // Hide letter modal 
      setShowLetterModal(false);
      toast.success("Conditional hire letter signed successfully!", {
        description: "You can now proceed with compliance requirements.",
        duration: 4000,
      });

      // Show compliance page
      setShowCompliancePage(true);
    } catch (error) {
      // Reset submission flag
      setSubmissionSuccessful(false);

      // Refetch signature status to clear the signature
      await refetchSignature();

      // Ensure compliance page is hidden
      setShowCompliancePage(false);

      // Show letter modal again so user can retry
      setShowLetterModal(true);

      toast.error("Failed to submit signature", {
        description: "Please try again or contact support.",
        duration: 4000,
      });
    }
  };

  // Handle signature modal close without signing
  const handleSignatureModalClose = (isOpen: boolean) => {
    setShowSignatureModal(isOpen);
    // If closing (isOpen = false) AND not successful, show letter modal again
    if (!isOpen && !submissionSuccessful) {
      setShowLetterModal(true);
    }
  };

  // If showing compliance page, render it
  if (showCompliancePage) {
    return <ComplianceStep onBack={onBack} onNext={onNext} />;
  }

  return (
    <>
      {/* Conditional Hire Letter Modal */}
      {showLetterModal && (
        <>
          <div
            className="fixed inset-0 bg-white/30 backdrop-blur-sm z-40"
            onClick={handleReject}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Conditional Hire Letter
                </h2>
                <button
                  onClick={handleReject}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Letter Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4 text-sm">
                  {/* Letter Header */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">
                      CONDITIONAL HIRE & CONSENT LETTER
                    </h3>
                    <p className="text-green-700 mb-2">
                      Dear{" "}
                      <span className="border-b border-green-600">
                        {userName}
                      </span>
                      ,
                    </p>
                    <p className="text-green-700 leading-relaxed">
                      We are pleased to inform you that you have been{" "}
                      <span className="font-semibold text-green-700">
                        conditionally selected for employment
                      </span>{" "}
                      with{" "}
                      <span className="font-semibold text-green-700">
                        [Agency Name]
                      </span>{" "}
                      as a{" "}
                      <span className="font-semibold text-green-700">
                        Direct Support Professional (DSP)
                      </span>{" "}
                      Staff member. Your employment is conditional upon the
                      successful completion of all pre-employment requirements
                      and state-mandated training.
                    </p>
                  </div>

                  {/* Conditions Section */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      CONDITIONS OF EMPLOYMENT
                    </h4>
                    <p className="text-green-700 mb-2">
                      As a condition of your hire, you must complete the
                      following:
                    </p>

                    <div className="space-y-3">
                      {/* Section 1 */}
                      <div>
                        <p className="font-semibold text-gray-900 mb-1.5">
                          1. Pre-Employment Screening & Background Checks
                        </p>
                        <ul className="list-none space-y-1 ml-4 text-green-700 text-xs">
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>
                              Fingerprint-based criminal history check (State &
                              FBI)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>
                              Central Registry - Child Abuse Record Information
                              (CARI) check
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>Sex Offender Registry check</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>OIG Exclusion List check</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>Drug screening (if applicable)</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>Verification of professional references</span>
                          </li>
                        </ul>
                      </div>

                      {/* Section 2 */}
                      <div>
                        <p className="font-semibold text-gray-900 mb-1.5">
                          2. Pre-Service Training
                        </p>
                        <p className="text-green-700 text-xs mb-1.5">
                          You must complete all CDS Portal modules and agency
                          pre-service trainings prior to working independently.
                          This includes, but is not limited to:
                        </p>
                        <ul className="list-none space-y-1 ml-4 text-green-700 text-xs">
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>
                              CDS-required modules (Introduction to DD,
                              Person-Centered Planning, Everyone Can
                              Communicate, etc.)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>
                              Mandated Reporter Training (CPR/First Aid, Fire
                              Safety, Infection Control, HIPAA, Orientation,
                              etc.)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">○</span>
                            <span>
                              NT-specific law trainings (Incident Reporting,
                              Daniel's Law, Kimone's Law, etc.)
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Section 3 */}
                      <div>
                        <p className="font-semibold text-gray-900 mb-1.5">
                          3. Documentation & Compliance
                        </p>
                        <p className="text-green-700 text-xs">
                          All certificates, verifications, and required
                          documentation must be submitted and approved by
                          [Agency Name] before your conditional employment
                          status can be converted to regular employment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Consent Section */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      CONSENT FOR PRE-EMPLOYMENT CHECKS
                    </h4>
                    <p className="text-green-700 mb-2 text-xs">
                      By signing this letter, you consent to the following:
                    </p>
                    <ul className="list-none space-y-1 ml-4 text-green-700 text-xs">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Submission of your fingerprints for state and federal
                          criminal history checks
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Review of your screening, including Central Registry,
                          CARI, Sex Offender Registry, and OIG Exclusion List
                          verification
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Drug testing (if applicable)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Verification of education, certifications, and
                          professional references
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Warning Section */}
                  <div className="bg-red-50 border-l-4 border-red-500 p-3">
                    <p className="font-bold text-red-900 mb-2 text-sm">
                      You also acknowledge that your employment is at-will and
                      may be rescinded if:
                    </p>
                    <ul className="list-none space-y-1 ml-4 text-red-800 text-xs">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Any of the pre-employment checks or screenings return
                          unsatisfactory results
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          You fail to complete required pre-service trainings
                          within the stipulated time
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          You provide false, misleading, or incomplete
                          information during the application or hiring process
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Next Steps */}
                  <div>
                    <p className="text-green-700 leading-relaxed text-xs">
                      We are excited to have you on our team and look forward to
                      supporting you in your professional growth as a DSP staff
                      member.
                    </p>
                    <p className="text-green-700 leading-relaxed mt-2 text-xs">
                      Please indicate your agreement to the above conditions by
                      signing or accepting or rejecting.
                    </p>
                  </div>

                  {/* Signature Note */}
                  <div className="text-center">
                    <p className="text-red-600 font-bold text-sm">
                      It should have a put up for accept or reject as the e
                      signature
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <Button
                  onClick={handleReject}
                  className="px-6 bg-[#B2B2B3] hover:bg-gray-400 text-white rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="px-6 bg-teal-500 hover:bg-teal-600 text-white rounded-full"
                >
                    {isSubmitting ? "Submitting..." : "Sign Digitally"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={showSignatureModal}
        setIsOpen={handleSignatureModalClose}
        proceed={handleSignatureComplete}
        useCase="conditional-hire"
      />
    </>
  );
}
